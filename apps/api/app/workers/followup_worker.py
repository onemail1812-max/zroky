import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

logger = logging.getLogger(__name__)

async def process_auto_followup(payload: dict):
    """
    Scans for emails that are awaiting a reply but haven't been contacted in > 48h.
    """
    workspace_id = payload.get("workspace_id")
    if not workspace_id:
        return

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        # Threshold: 48 hours ago
        threshold = now - timedelta(hours=48)
        
        # Find emails marked as 'awaiting_reply' where no response has been received (based on received_at or custom followup_due_at)
        # For now, we use received_at as a proxy for 'last contact'
        forgotten_threads = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == workspace_id,
            TriagedEmail.awaiting_reply == True,
            TriagedEmail.received_at <= threshold,
            TriagedEmail.category != "followup_snoozed"
        ).all()

        if not forgotten_threads:
            return

        orc = AaliyahOrchestrator(workspace_id)
        for thread in forgotten_threads:
            # Check if we already nudged in the last 24h to avoid spam
            meta = thread.metadata_json or {}
            last_nudge = meta.get("last_nudge_at")
            if last_nudge:
                last_nudge_dt = datetime.fromisoformat(last_nudge)
                if now - last_nudge_dt < timedelta(hours=24):
                    continue
            
            # Phase 8: Default Actions for Follow-ups
            actions = [
                {"label": "Draft Nudge", "type": "callback", "payload": {"intent": "draft_nudge"}, "primary": True},
                {"label": "Snooze 24h", "type": "snooze", "payload": {"hours": 24}},
            ]
            
            # Emit Nudge
            await orc.emit_status(
                "followup-nudge",
                f"Boss, you haven't heard back from {thread.sender} regarding '{thread.subject}'. Should I send a nudge?",
                {
                    "id": thread.id,
                    "thread_id": thread.thread_id,
                    "external_message_id": thread.external_message_id,
                    "sender": thread.sender,
                    "subject": thread.subject,
                    "received_at": thread.received_at.isoformat() if thread.received_at else None,
                    "actions": actions
                }
            )
            
            # Update metadata to track the nudge
            meta["last_nudge_at"] = now.isoformat()
            thread.metadata_json = meta
            db.commit()
            
            logger.info(f"Nudge emitted for thread {thread.thread_id} in workspace {workspace_id}")

    except Exception as e:
        logger.error(f"Auto-Followup worker failed: {e}")
        db.rollback()
    finally:
        db.close()
