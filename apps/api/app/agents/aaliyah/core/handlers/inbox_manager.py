from __future__ import annotations

import logging
import asyncio
from datetime import datetime, timezone
from typing import Any, Optional, List, TYPE_CHECKING
from types import SimpleNamespace

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.models.integration import Integration, IntegrationStatus, IntegrationProvider
from app.services.audit_log_service import AuditAction, AuditEntityType, AuditLogService
from app.services.brain.guardrails import redact_text
from app.services.brain.memory import DualStateMemory
from app.agents.aaliyah.core.action_executor import ActionExecutor
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor, NormalizedEmailMessage
from app.agents.aaliyah.core.inbox_repository import TriagedInboxRepository
from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine
from app.agents.aaliyah.core.triage_service import TriageResult

from .base import BaseHandler

if TYPE_CHECKING:
    pass

class InboxManager(BaseHandler):
    """Handles inbox synchronization, triage, and email listing."""

    async def list_inbox(
        self,
        db: Session,
        *,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        include_noise: bool = False,
        queue: Optional[str] = None,
    ) -> dict[str, Any]:
        integrations = db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id,
            Integration.status == IntegrationStatus.CONNECTED
        ).all()
        
        allowed_providers = []
        for i in integrations:
            if i.provider in (IntegrationProvider.GOOGLE_GMAIL, "google_gmail", "google"):
                allowed_providers.append("google")
            elif i.provider in (IntegrationProvider.OUTLOOK, "outlook", "microsoft"):
                allowed_providers.append("microsoft")

        repo = TriagedInboxRepository(db, self.workspace_id)
        
        q = queue or category
        if priority == "High" and not q:
            q = "priority"

        threads, total = repo.list_threads(
            queue=q,
            limit=limit,
            offset=offset,
            allowed_providers=allowed_providers
        )
        
        return {
            "items": [
                {
                    "id": row.id,
                    "provider": row.provider,
                    "thread_id": row.thread_id,
                    "sender": row.sender,
                    "subject": row.subject,
                    "snippet": row.snippet,
                    "received_at": row.received_at.isoformat() if row.received_at else None,
                    "category": row.category,
                    "priority": row.priority,
                    "is_noise": row.is_noise,
                    "is_read": row.is_read,
                    "confidence": row.confidence,
                    "reasoning": row.reasoning,
                    "message_count": 1,
                    "requires_approval": row.requires_approval or False,
                    "awaiting_reply": row.awaiting_reply or False,
                    "draft": (row.metadata_json or {}).get("draft"),
                    "metadata": row.metadata_json,
                }
                for row in threads
            ],
            "count": total,
        }

    async def historical_sync(self, db: Session, days: int = 180):
        integration = db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id,
            Integration.provider == IntegrationProvider.GOOGLE_GMAIL
        ).first()
        
        if not integration:
            return
            
        await self._emit("sync_started", f"Starting historical backfill for {days} days...")
        await self._emit("sync_progress", "Indexing historical conversations...", {"progress": 10})
        await self._emit("sync_complete", "Historical sync complete. Long-term memory is now active.", {"days": days})

    async def _classify_and_persist_email(
        self,
        *,
        db: Session,
        message: NormalizedEmailMessage,
        triage: Optional[TriageResult] = None,
        metadata: Optional[dict[str, Any]] = None,
        previous_category: Optional[str] = None,
        deadline_at: Optional[datetime] = None,
        requires_approval: bool = False,
        approval_reason: Optional[str] = None,
        awaiting_reply: bool = False,
    ) -> dict[str, Any]:
        triage_result: TriageResult = triage or await self.triage_classifier.classify(message)
        repo = TriagedInboxRepository(db, self.workspace_id)
        safe_meta = {
            "source": message.source, 
            "is_read": message.is_read,
            "attachments": [a.model_dump() for a in message.metadata.attachments],
            "headers": message.metadata.headers
        }
        
        final_category = triage_result.category
        final_requires_approval = requires_approval

        if final_category == "Priority":
             if triage_result.confidence < 0.85:
                 final_category = "Approvals"
                 final_requires_approval = True
             else:
                 awaiting_reply = True 

        elif final_category == "Needs Reply":
             if triage_result.confidence >= 0.85:
                 awaiting_reply = True
                 final_requires_approval = False
             else:
                 final_category = "Approvals"
                 final_requires_approval = True

        elif final_category == "Approvals":
            final_requires_approval = True

        row = repo.upsert(
            provider=message.provider,
            external_message_id=message.id,
            thread_id=message.metadata.thread_id,
            sender=message.metadata.sender,
            subject=message.metadata.subject,
            snippet=message.content,
            received_at=message.created_at,
            category=final_category,
            priority=triage_result.priority,
            is_noise=triage_result.is_noise,
            is_read=message.is_read,
            confidence=triage_result.confidence,
            reasoning=triage_result.reasoning,
            needs_clarity=triage_result.needs_clarity,
            metadata={
                **safe_meta,
                "clarification_questions": triage_result.clarification_questions
            },
            previous_category=previous_category,
            deadline_at=deadline_at,
            requires_approval=final_requires_approval,
            approval_reason=approval_reason,
            awaiting_reply=awaiting_reply,
        )

        memory = DualStateMemory(db, self.workspace_id)
        memory.extract_and_learn_from_email(
            sender=message.metadata.sender,
            subject=message.metadata.subject,
            body=message.content,
            email_id=message.id,
            thread_id=message.metadata.thread_id
        )

        if row.is_noise and (not previous_category or previous_category != row.category):
             AuditLogService.log_action(
                 db=db,
                 workspace_id=self.workspace_id,
                 user_id="system",
                 action=AuditAction.UPDATE,
                 entity_type=AuditEntityType.ARTIFACT,
                 entity_id=row.thread_id,
                 metadata={"action": "auto_clean", "category": row.category},
                 after_state={"category": row.category, "is_noise": True},
                 explain_one_liner=f"Automatically cleaned {row.category} message from {row.sender}."
             )

        if previous_category and previous_category != row.category:
             await self._emit(
                  "thread_moved", 
                  f"Moved thread to {row.category}", 
                  {"thread_id": row.thread_id, "category": row.category, "previous_category": previous_category}
             )
        else:
             await self._emit(
                  "thread_updated",
                  f"Thread updated",
                  {
                      "thread_id": row.thread_id, 
                      "category": row.category, 
                      "priority": row.priority,
                      "is_read": row.is_read,
                      "id": row.id
                  }
             )
        return {
            "id": row.id,
            "provider": row.provider,
            "external_message_id": row.external_message_id,
            "subject": row.subject,
            "sender": row.sender,
            "category": row.category,
            "priority": row.priority,
            "is_noise": row.is_noise,
            "is_read": row.is_read,
            "confidence": row.confidence,
            "reasoning": row.reasoning,
            "deadline_at": row.deadline_at.isoformat() if row.deadline_at else None,
            "requires_approval": row.requires_approval,
            "approval_reason": row.approval_reason,
            "awaiting_reply": row.awaiting_reply,
            "labels": (row.metadata_json or {}).get("labels", []),
            "label_reasons": (row.metadata_json or {}).get("label_reasons", {}),
            "label_actions": (row.metadata_json or {}).get("label_actions", []),
        }

    async def sync_inbox(
        self,
        db: Session,
        *,
        user_id: str,
        provider: str = "auto",
        max_results: int = 25,
        incremental: bool = True,
    ) -> dict[str, Any]:
        ingestor = EmailIngestor(self.workspace_id, db)
        self._patch_state(status="thinking", active_task="Syncing inbox")
        await self._emit("sync_started", f"Syncing inbox (incremental={incremental})")

        messages, deleted_ids = await ingestor.fetch_incremental(provider=provider)
        
        if deleted_ids:
            deleted_count = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.external_message_id.in_(deleted_ids)
            ).delete(synchronize_session=False)
            db.commit()
            
            for d_id in deleted_ids:
                await self._emit("message_deleted", "Message removed remotely", {"message_id": d_id})
            
            if deleted_count > 0:
                self.logger.info(f"Two-Way Sync: Removed {deleted_count} deleted emails from Aaliyah.")
        
        triaged: list[dict[str, Any]] = []
        label_engine = LabelingRulesEngine(db, self.workspace_id)
        upcoming_events = label_engine.list_upcoming_calendar_events(days_ahead=7, limit=200)
        action_executor = ActionExecutor(db)

        workspace_row = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        ws_settings = getattr(workspace_row, "settings_json", {}) or {}
        aaliyah_settings = ws_settings.get("aaliyah", {})
        
        organize_enabled = aaliyah_settings.get("organize_inbox_enabled", True)
        drafting_enabled = aaliyah_settings.get("draft_replies_enabled", True)
        archive_noise_enabled = aaliyah_settings.get("archive_less_important", False)
        auto_send_enabled = aaliyah_settings.get("auto_send_enabled", False)

        semaphore = asyncio.Semaphore(15)
        
        async def safe_classify(msg):
            async with semaphore:
                try:
                    return await self.triage_classifier.classify(msg)
                except Exception as e:
                    self.logger.warning(f"Classification failed for {msg.id}: {e}")
                    return TriageResult(category="Inbox", priority="Medium", is_noise=False, confidence=0.0, reasoning="Classification failed")

        classified_results = await asyncio.gather(*(safe_classify(item) for item in messages))
        
        for item, triage_result in zip(messages, classified_results):
            sender_display = self._sender_display(item.metadata.sender)
            
            history = label_engine.list_recent_thread_history(
                thread_id=item.metadata.thread_id,
                sender=item.metadata.sender,
                limit=8,
            )
            label_decision = label_engine.decide_labels(
                message=item,
                triage=triage_result,
                history=history,
                upcoming_events=upcoming_events,
                workspace_settings=ws_settings,
            )

            final_triage = triage_result
            prev_cat = None
            
            if organize_enabled:
                from dataclasses import replace
                if label_decision.priority:
                    final_triage = replace(final_triage, priority=label_decision.priority)
                
                if label_decision.suggested_category and label_decision.suggested_category != triage_result.category:
                    prev_cat = triage_result.category
                    final_triage = replace(
                        final_triage, 
                        category=label_decision.suggested_category,
                        is_noise=True if label_decision.suggested_category in ["Newsletter", "Notification", "Receipt"] else final_triage.is_noise
                    )

            should_archive = False
            if archive_noise_enabled and final_triage.is_noise and final_triage.category in ["Newsletter", "Notification"]:
                should_archive = True

            if should_archive:
                try:
                    await action_executor.archive(
                        user_id=user_id,
                        workspace_id=self.workspace_id,
                        provider=item.provider,
                        message_id=item.id,
                        explain_one_liner=f"Automatically archived {final_triage.category} per user settings."
                    )
                    await self._emit(
                        "triage_ignored",
                        f"Archived {final_triage.category} from {sender_display}.",
                        {
                            "message_id": item.id,
                            "category": final_triage.category,
                            "action": "archive"
                        }
                    )
                    continue 
                except Exception as e:
                    self.logger.error(f"Failed to auto-archive: {e}")

            if final_triage.is_noise and final_triage.category == "Newsletter":
                await self._emit(
                    "triage_ignored",
                    f"Ignored newsletter from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": final_triage.category,
                        "reasoning": final_triage.reasoning,
                    },
                )
            else:
                await self._emit(
                    "triage_queued",
                    f"Queued {final_triage.category} email from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": final_triage.category,
                        "priority": final_triage.priority,
                    },
                )

            label_actions: list[dict[str, Any]] = []
            if not label_decision.skip_auto and organize_enabled:
                for label_name in label_decision.labels:
                    explain = label_decision.reasons.get(label_name) or f"Applied {label_name} by deterministic rule."
                    try:
                        action_result = await action_executor.apply_label(
                            user_id=user_id,
                            workspace_id=self.workspace_id,
                            provider=item.provider,
                            message_id=item.id,
                            label_name=label_name,
                            explain_one_liner=explain,
                            risk=SimpleNamespace(score=0.05, domain="LOW"),
                            model_confidence=float(triage_result.confidence),
                        )
                        label_actions.append(action_result)
                        await self._emit(
                            "label_applied",
                            f"Applied '{label_name}' label",
                            {
                                "message_id": item.id,
                                "provider": item.provider,
                                "label": label_name,
                                "reason": explain,
                                "audit_id": action_result.get("audit_id"),
                            },
                        )
                    except Exception as exc:
                        label_actions.append(
                            {
                                "status": "failed",
                                "message_id": item.id,
                                "label_name": label_name,
                                "error": redact_text(str(exc)),
                            }
                        )

            is_awaiting_reply = ("Awaiting Reply" in label_decision.labels) if organize_enabled else False
            
            triaged_row = await self._classify_and_persist_email(
                db=db,
                message=item,
                triage=final_triage,
                metadata={
                    "source": item.source,
                    "is_read": item.is_read,
                    "labels": label_decision.labels if organize_enabled else [],
                    "label_reasons": label_decision.reasons if organize_enabled else {},
                    "override_applied": label_decision.override_applied,
                    "label_actions": label_actions,
                },
                previous_category=prev_cat,
                deadline_at=label_decision.deadline_at,
                requires_approval=label_decision.requires_approval,
                approval_reason=label_decision.approval_reason,
                awaiting_reply=is_awaiting_reply,
            )

            if final_triage.category not in {"OUTBOUND", "DRAFT"} and item.metadata.thread_id:
                db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.thread_id == item.metadata.thread_id
                ).update({"followup_due_at": None, "followup_snoozed_until": None})
                db.commit()
            
            should_draft = (
                drafting_enabled
                and not label_decision.skip_auto
                and not final_triage.is_noise
                and final_triage.category not in {"Newsletter", "Notification", "Receipt"}
            )
            if should_draft:
                try:
                    from app.agents.aaliyah.core.drafting import DraftingAgent
                    draft_agent = DraftingAgent(db, self.workspace_id)
                    await self._emit("drafting_started", f"Drafting reply for {sender_display}...", {"message_id": item.id})
                    
                    stored_email = db.query(TriagedEmail).filter(TriagedEmail.id == triaged_row["id"]).first()
                    if stored_email:
                        if stored_email.needs_clarity:
                            questions = (stored_email.metadata_json or {}).get("clarification_questions", [])
                            q_text = "\n".join([f"- {q}" for q in questions])
                            notify_msg = (
                                f"New mail from **{sender_display}**: *{stored_email.subject or '(No Subject)'}*.\n\n"
                                f"I'm ready to draft a reply, but I need your clarification on a few things first:\n{q_text}"
                            )
                            await self._emit(
                                "assistant_message",
                                notify_msg,
                                {
                                    "text": notify_msg, 
                                    "role": "assistant", 
                                    "email_id": stored_email.id, 
                                    "thread_id": stored_email.thread_id,
                                    "type": "clarification_request",
                                    "questions": questions
                                },
                            )
                            continue 

                        draft = await draft_agent.generate_draft(stored_email)
                        if draft:
                            await draft_agent.save_draft(stored_email.id, draft)
                            await self._emit("draft_ready", f"Drafted: {draft.subject}", {"message_id": item.id})
                            triaged_row["has_draft"] = True

                            priority_label = f" [{final_triage.priority}]" if final_triage.priority in {"High", "urgent"} else ""
                            notify_msg = (
                                f"New mail from **{sender_display}**{priority_label}: "
                                f"*{item.metadata.subject or '(No Subject)'}*. "
                                f"{draft.rationale} "
                                f"I've drafted a reply for your review."
                            )
                            await self._emit(
                                "assistant_message",
                                notify_msg,
                                {"text": notify_msg, "role": "assistant", "email_id": item.id, "has_draft": True},
                            )

                            if auto_send_enabled:
                                try:
                                    await action_executor.send_draft(
                                        user_id=user_id, 
                                        workspace_id=self.workspace_id, 
                                        email_id=stored_email.id,
                                        is_explicit_approval=False
                                    )
                                    await self._emit("auto_sent", f"Auto-sent Reply to {sender_display}", {"message_id": item.id})
                                    triaged_row["draft_status"] = "sent"
                                except PermissionError as exc:
                                     await self._emit("auto_send_blocked", f"Auto-send blocked: {str(exc)}", {"message_id": item.id})
                except Exception as e:
                    self.logger.error(f"Drafting failed for {item.id}: {e}")

            triaged.append(triaged_row)

        state = self._get_state()
        self._patch_state(
            status="idle",
            active_task=None,
            triaged_count=state.triaged_count + len(triaged),
            queued_count=max(0, len([t for t in triaged if not t["is_noise"]])),
            last_sync={"gmail": datetime.now(timezone.utc).isoformat(), "calendar": state.last_sync.get("calendar")},
        )
        cleaned_count = len([t for t in triaged if t["is_noise"]])
        await self._emit("sync_complete", f"Triaged {len(triaged)} messages", {"count": len(triaged), "cleaned_count": cleaned_count})
        await self.broadcast_updates(db)
        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_id=f"sync_inbox:{datetime.now(timezone.utc).timestamp()}",
            metadata={
                "provider": provider,
                "triaged_count": len(triaged),
                "labels_applied": sum(
                    len([x for x in (item.get("label_actions") or []) if x.get("status") in {"applied", "already_applied"}])
                    for item in triaged
                ),
            },
            explain="Inbox sync and triage completed",
        )
        return {"items": triaged, "count": len(triaged)}
