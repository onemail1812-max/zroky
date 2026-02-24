import asyncio
import logging
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List

from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor, NormalizedEmailMessage
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.services.brain.core import Brain
from app.core.queue import queue, JobType

logger = logging.getLogger(__name__)

async def process_sync_provider(payload: Dict[str, Any]):
    """
    STAGE 1: Discovery.
    Fetches emails and enqueues AI_TRIAGE for each new message.
    """
    workspace_id = payload.get("workspace_id")
    provider = payload.get("provider", "all")

    if not workspace_id:
        logger.error("No workspace_id in payload")
        return

    logger.info(f"Workflow [1/3] Discovery: Starting for workspace={workspace_id}")
    db = SessionLocal()
    try:
        ingestor = EmailIngestor(workspace_id, db)
        messages, deleted_ids = await ingestor.fetch_incremental(provider=provider)
        
        # Handle Deletions
        if deleted_ids:
            deleted_count = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == workspace_id,
                TriagedEmail.external_message_id.in_(deleted_ids)
            ).delete()
            db.commit()
            orc = AaliyahOrchestrator(workspace_id)
            for d_id in deleted_ids:
                await orc.emit_status("message_deleted", f"Email deleted: {d_id}", {"message_id": d_id})
            logger.info(f"Discovery: Reconciled {deleted_count} remote deletions.")

        # Enqueue Triage for each NEW message
        enqueued_count = 0
        for msg in messages:
            # Deduplication
            exists = db.query(TriagedEmail.id).filter(
                TriagedEmail.workspace_id == workspace_id,
                TriagedEmail.external_message_id == msg.id
            ).first()
            if exists:
                continue

            # Create 'STUB' entry so UI sees it immediately as 'Syncing...'
            triaged_entry = TriagedEmail(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                provider=msg.provider,
                external_message_id=msg.id,
                thread_id=msg.metadata.thread_id,
                sender=msg.metadata.sender,
                subject=msg.metadata.subject,
                snippet=msg.content[:500] if msg.content else "",
                received_at=msg.created_at,
                category="Processing...",
                priority="Low",
                is_read=msg.metadata.headers.get("is_read", False),
                created_at=datetime.utcnow()
            )
            db.add(triaged_entry)
            db.commit()

            # Enqueue STAGE 2
            await queue.enqueue(
                job_type=JobType.AI_TRIAGE.value,
                payload={
                    "workspace_id": workspace_id,
                    "triaged_id": triaged_entry.id,
                    "message_raw": msg.model_dump() # Pass full message to avoid re-fetching
                },
                dedupe_id=f"triage:{msg.id}"
            )

            # LIVE ARRIVAL: Emit event for UI "slide-in"
            orc = AaliyahOrchestrator(workspace_id)
            
            # Phase 8: Default Actions + Contextual Detection
            actions = [
                {"label": "Draft Reply", "type": "callback", "payload": {"intent": "draft"}, "primary": True},
                {"label": "Archive", "type": "callback", "payload": {"intent": "archive"}},
            ]
            
            # Contextual Detection (Advanced Sensory Depth)
            body_lower = triaged_entry.snippet.lower()
            if "stripe.com" in body_lower or "invoice" in body_lower:
                actions.insert(1, {"label": "Pay in Stripe", "type": "link", "payload": {"url": "https://dashboard.stripe.com/invoices"}})
            
            if "notion.so" in body_lower:
                actions.insert(1, {"label": "Open in Notion", "type": "link", "payload": {"url": "https://notion.so"}})

            await orc.emit_status(
                "new_email_arrival",
                f"New email from {triaged_entry.sender}",
                {
                    "id": triaged_entry.id,
                    "sender": triaged_entry.sender,
                    "sender_name": msg.metadata.sender.split("<")[0].strip() if "<" in msg.metadata.sender else msg.metadata.sender,
                    "subject": triaged_entry.subject,
                    "snippet": triaged_entry.snippet[:100],
                    "received_at": triaged_entry.received_at.isoformat() if triaged_entry.received_at else None,
                    "threadId": msg.metadata.thread_id,
                    "actions": actions
                }
            )
            enqueued_count += 1
        
        logger.info(f"Workflow [1/3] Discovery finished. Enqueued {enqueued_count} messages for Triage.")

    except Exception as e:
        logger.error(f"Discovery failed: {e}")
        raise e
    finally:
        db.close()

async def process_ai_triage(payload: Dict[str, Any]):
    """
    STAGE 2: Classification.
    Categorizes the email and enqueues PROCESS_DRAFT if actionable.
    """
    workspace_id = payload.get("workspace_id")
    triaged_id = payload.get("triaged_id")
    msg_data = payload.get("message_raw")

    if not triaged_id or not msg_data:
        return

    db = SessionLocal()
    try:
        msg = NormalizedEmailMessage(**msg_data)
        classifier = SmartTriageClassifier(Brain())
        
        triage = await classifier.classify(msg)
        
        # Update DB
        entry = db.query(TriagedEmail).get(triaged_id)
        if not entry: return

        entry.category = triage.category
        entry.priority = triage.priority
        entry.is_noise = triage.is_noise
        entry.confidence = triage.confidence
        entry.reasoning = triage.reasoning
        entry.can_draft = triage.can_draft
        db.commit()

        # STAGE 2.3: Relationship Intelligence (Knowledge Graph)
        from app.services.aaliyah.relationship_manager import RelationshipManager
        rm = RelationshipManager(db, workspace_id)
        if entry.sender:
            # Extract email from "Name <email@example.com>"
            sender_email = entry.sender
            if "<" in entry.sender and ">" in entry.sender:
                sender_email = entry.sender.split("<")[1].split(">")[0]
            rm.record_interaction(sender_email, entry.external_message_id, direction="incoming")
            
            # Enrich metadata with relationship summary for subsequent stages
            meta = entry.metadata_json or {}
            meta["relationship_summary"] = rm.get_relationship_summary(sender_email)
            entry.metadata_json = meta
            db.commit()

        # STAGE 2.5: Vision Analysis (Multi-Modal Sensory Depth)
        if msg.has_attachments:
            from app.services.aaliyah.vision_service import VisionService
            vision = VisionService(workspace_id)
            for att in msg.metadata.attachments:
                # Analyze if it's a common document/image type
                if any(ext in att.filename.lower() for ext in [".pdf", ".jpg", ".jpeg", ".png", ".xlsx"]):
                    logger.info(f"Triggering Vision Analysis for {att.filename} in message {msg.id}")
                    analysis = await vision.analyze_attachment(
                        message_id=msg.id,
                        attachment_id=att.id,
                        filename=att.filename,
                        mime_type=att.mime_type
                    )
                    
                    # Store analysis in metadata
                    meta = entry.metadata_json or {}
                    if "vision_analysis" not in meta:
                        meta["vision_analysis"] = []
                    meta["vision_analysis"].append({
                        "filename": att.filename,
                        "analysis": analysis
                    })
                    entry.metadata_json = meta
                    db.commit()

        db.commit()

        # Emit progress via Orchestrator (Conversation-triggering)
        orc = AaliyahOrchestrator(workspace_id)
        await orc.emit_status(
            "thread_updated",
            f"AI classified as {triage.category}",
            {"id": triaged_id, "category": triage.category}
        )

        # Enqueue STAGE 3 if applicable
        if triage.can_draft:
            await queue.enqueue(
                job_type=JobType.PROCESS_DRAFT.value,
                payload={
                    "workspace_id": workspace_id,
                    "triaged_id": triaged_id,
                    "message_raw": msg_data
                },
                dedupe_id=f"draft:{msg.id}"
            )
            logger.info(f"Workflow [2/3] Triage finished. Enqueued {triaged_id} for Drafting.")
        else:
            logger.info(f"Workflow [2/3] Triage finished. No draft needed for {triaged_id}.")

        # INSTANT COUNTS: Broadcast updated counts after classification
        await orc.broadcast_updates(db)

    except Exception as e:
        logger.error(f"Triage Stage failed: {e}")
        raise e
    finally:
        db.close()

async def process_drafting(payload: Dict[str, Any]):
    """
    STAGE 3: Drafting & Humanizing.
    Generates the grounded response artifact.
    """
    workspace_id = payload.get("workspace_id")
    triaged_id = payload.get("triaged_id")
    msg_data = payload.get("message_raw")

    db = SessionLocal()
    try:
        from app.agents.aaliyah.core.drafting import DraftingAgent
        from app.agents.aaliyah.core.humanizer import EmailHumanizer
        
        entry = db.query(TriagedEmail).get(triaged_id)
        if not entry: return

        agent = DraftingAgent(db, workspace_id)
        draft = await agent.generate_draft(entry)
        
        if draft:
            humanizer = EmailHumanizer(workspace_id, db, Brain())
            polished_body = await humanizer.inject_soul(
                draft_body=draft.body,
                incoming_email=entry.snippet,
                recipient_name=entry.sender or "there"
            )
            
            meta = entry.metadata_json or {}
            meta["draft"] = {
                "subject": draft.subject,
                "body": polished_body,
                "rationale": draft.rationale,
                "confidence": 0.95,
                "reasoning": "Standard humanized response"
            }
            entry.metadata_json = meta
            db.commit()

            # Final Event: Draft Ready (Triggers "Boss, I've prepared a draft...")
            orc = AaliyahOrchestrator(workspace_id)
            await orc.emit_status(
                "draft_ready",
                f"Aaliyah drafted a reply for: {entry.subject[:30]}...",
                {"id": triaged_id, "draft": True}
            )

            # INSTANT COUNTS: Broadcast updated counts after drafting
            await orc.broadcast_updates(db)
            logger.info(f"Workflow [3/3] Drafting finished for {triaged_id}.")

    except Exception as e:
        logger.error(f"Drafting Stage failed: {e}")
        raise e
    finally:
        db.close()
