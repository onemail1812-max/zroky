"""Deterministic action execution with audit-first behavior."""

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.services.audit_log_service import AuditAction, AuditEntityType, AuditLogService
from app.services.integrations.email_connector import EmailConnectorFactory
from app.agents.aaliyah.core.runtime_gate import final_action_gate


def _extract_labels(message: dict[str, Any] | None) -> list[str]:
    if not isinstance(message, dict):
        return []
    labels = message.get("labelIds")
    if not isinstance(labels, list):
        labels = message.get("label_ids")
    if isinstance(labels, list):
        return [str(label) for label in labels]
    return []


class ActionExecutor:
    """Apply low-risk actions and persist immutable audit logs."""
    
    _send_cache: dict[str, datetime] = {}

    def __init__(self, db: Session):
        self.db = db

    async def apply_label(
        self,
        *,
        user_id: str,
        workspace_id: str,
        provider: str,
        message_id: str,
        label_name: str,
        explain_one_liner: str,
        risk: Any,
        model_confidence: float,
    ) -> dict[str, Any]:
        connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, provider)

        before_message = await connector.get_message(message_id)
        before_labels = _extract_labels(before_message)

        applied = await connector.apply_label(message_id, label_name)
        if str((applied or {}).get("status") or "").lower() == "already_applied":
            return {
                "status": "already_applied",
                "message_id": message_id,
                "label_name": label_name,
                "audit_id": None,
            }

        after_message = await connector.get_message(message_id)
        after_labels = _extract_labels(after_message)

        undo_payload = {
            "type": "REMOVE_LABEL",
            "provider": provider,
            "message_id": message_id,
            "label_name": label_name,
            "label_id": (applied.get("id") if isinstance(applied, dict) else None),
        }

        audit_entry = AuditLogService.log_action(
            db=self.db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.ARTIFACT,
            entity_id=message_id,
            metadata={
                "provider": provider,
                "risk_domain": getattr(risk, "domain", "LOW"),
                "risk_score": getattr(risk, "score", 0.0),
                "model_confidence": float(model_confidence),
                "label_name": label_name,
            },
            before_state={"label_ids": before_labels},
            after_state={"label_ids": after_labels},
            undo_payload=undo_payload,
            explain_one_liner=explain_one_liner,
        )

        return {
            "status": "applied",
            "audit_id": audit_entry.id,
            "message_id": message_id,
            "label_name": label_name,
        }


    async def send_draft(
        self,
        *,
        user_id: str,
        workspace_id: str,
        email_id: str,
        is_explicit_approval: bool = False,
    ) -> dict[str, Any]:
        # 1. Fetch Request
        email = (
            self.db.query(TriagedEmail)
            .filter(TriagedEmail.id == email_id, TriagedEmail.workspace_id == workspace_id)
            .first()
        )
        if not email:
            raise ValueError("Email not found")

        meta = email.metadata_json or {}
        draft = meta.get("draft")
        if not draft or not isinstance(draft, dict):
            raise ValueError("No draft found for this email")
        
        if draft.get("status") == "sent":
             return {"status": "already_sent", "message_id": email_id}

        # 2. Final Action Gate
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        settings = getattr(workspace, "settings_json", {}) or {}
        
        allowed = final_action_gate(
            action="SEND",
            email_row=email,
            draft=draft,
            settings=settings,
            is_explicit_approval=is_explicit_approval
        )
        
        if not allowed or not is_explicit_approval:
            AuditLogService.log_action(
                db=self.db,
                workspace_id=workspace_id,
                user_id=user_id,
                action=AuditAction.EXECUTE,
                entity_type=AuditEntityType.ARTIFACT, 
                entity_id=email_id,
                metadata={"status": "blocked", "reason": "Runtime Gate Check Failed"},
                explain_one_liner="Send blocked by safety gate"
            )
            raise PermissionError("Action blocked by Final Action Gate. Approval or missing facts required.")

        # 3. Rate Limiting (Provider Safety)
        # Avoid spam flags by enforcing a cooldown on the same thread
        cache_key = f"last_send_{email_id}"
        if ActionExecutor._send_cache.get(cache_key):
             last_send = ActionExecutor._send_cache[cache_key]
             if datetime.now() - last_send < timedelta(seconds=60):
                  return {"status": "rate_limited", "message": "Please wait 60s before re-sending to this thread."}
        
        # 4. Signature Insertion
        signature = settings.get("aaliyah", {}).get("signature", "")
        if not signature:
            # Fallback to style profile or workspace name
            style = getattr(workspace, "style_profile_json", {}) or {}
            signature = style.get("signature", f"--\nSent via Aaliyah")
        
        body = draft.get("body", "")
        if signature and signature not in body:
            body = f"{body}\n\n{signature}"

        # 5. Get Connector
        connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, email.provider)

        # 6. Send with proper identity and threading
        try:
            sent_result = await connector.send_message(
                recipient=email.sender, 
                subject=draft.get("subject", f"Re: {email.subject}"),
                body=body,
                thread_id=email.thread_id,
                reply_to_id=email.external_message_id
            )
            ActionExecutor._send_cache[cache_key] = datetime.now()
        except Exception as e:
            # 7. Failed Send Handling
            draft["status"] = "failed"
            draft["last_error"] = str(e)
            meta["draft"] = draft
            email.metadata_json = dict(meta)
            self.db.commit()
            raise RuntimeError(f"Failed to send email: {e}")

        # 4. Update State
        now = datetime.now(timezone.utc)
        draft["status"] = "sent"
        draft["sent_at"] = sent_result.get("received_at") or now.isoformat()
        draft["external_sent_id"] = sent_result.get("id")
        
        # Follow-up Logic: No longer awaiting our reply, but maybe awaiting theirs
        email.awaiting_reply = False
        email.last_outbound_at = now
        
        followup_days = settings.get("aaliyah", {}).get("followup_days", 3)
        email.followup_due_at = now + timedelta(days=float(followup_days))
        
        # SQLAlchemy JSON update
        meta["draft"] = draft
        email.metadata_json = dict(meta)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(email, "metadata_json")
        self.db.commit()

        # 5. Audit
        undo_payload = None # Cannot undo a sent email
        AuditLogService.log_action(
            db=self.db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.EXECUTE,
            entity_type=AuditEntityType.ARTIFACT,
            entity_id=email_id,
            metadata={
                "provider": email.provider,
                "draft_subject": draft.get("subject"),
                "sent_message_id": sent_result.get("id")
            },
            explain_one_liner=f"Sent drafted reply to {email.sender}",
            before_state={"draft_status": "drafted"},
            after_state={"draft_status": "sent"},
        )
        
        return {
            "status": "sent",
            "email_id": email_id,
            "sent_message_id": sent_result.get("id")
        }

    async def archive(
        self,
        *,
        user_id: str,
        workspace_id: str,
        provider: str,
        message_id: str,
        explain_one_liner: str,
    ) -> dict[str, Any]:
        """Archive a message and log it."""
        connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, provider)
        result = await connector.archive_message(message_id)
        
        AuditLogService.log_action(
            db=self.db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.ARTIFACT,
            entity_id=message_id,
            metadata={"provider": provider, "action": "archive"},
            explain_one_liner=explain_one_liner,
            undo_payload={"type": "RESTORE_THREAD_MESSAGE", "provider": provider, "message_id": message_id}
        )
        return result

    async def restore_thread(
        self,
        *,
        user_id: str,
        workspace_id: str,
        thread_id: str,
        explain_one_liner: str = "Restored thread from Cleaned queue.",
    ) -> dict[str, Any]:
        """Undo cleaning/archiving for a thread."""
        from app.models.triaged_thread import TriagedThread
        from app.models.triaged_email import TriagedEmail

        thread = self.db.query(TriagedThread).filter(
            TriagedThread.external_thread_id == thread_id,
            TriagedThread.workspace_id == workspace_id
        ).first()
        
        if not thread:
            # Try finding by internal ID if thread_id is UUID
            thread = self.db.query(TriagedThread).filter(
                TriagedThread.id == thread_id,
                TriagedThread.workspace_id == workspace_id
            ).first()

        if not thread:
            raise ValueError("Thread not found")
            
        before_state = {
            "category": thread.category,
            "is_noise": thread.is_noise,
        }
        
        # 1. Update DB State
        thread.is_noise = False
        # If it was in a noise category, move it back to Inbox
        if thread.category in ["Newsletter", "Notification", "Cleaned", "Newsletter", "Receipt"]:
             thread.category = "Inbox"
        
        # 2. Re-evaluate messages (unarchive)
        # We find the latest inbound message for this thread and move it to inbox
        latest_msg = self.db.query(TriagedEmail).filter(
            TriagedEmail.thread_id == thread.external_thread_id,
            TriagedEmail.workspace_id == workspace_id
        ).order_by(TriagedEmail.received_at.desc()).first()

        provider_action = "none"
        if latest_msg:
             try:
                 # Check if we should unarchive (we don't know for sure if it was archived, but moving to inbox is safe)
                 connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, latest_msg.provider)
                 await connector.move_to_inbox(latest_msg.external_message_id)
                 provider_action = "moved_to_inbox"
             except Exception as e:
                 import logging
                 logging.getLogger(__name__).warning(f"Failed to unarchive message during restore: {e}")

        after_state = {
            "category": thread.category,
            "is_noise": thread.is_noise,
        }
        
        self.db.commit()
        
        # 3. Audit
        AuditLogService.log_action(
            db=self.db,
            workspace_id=workspace_id,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.ARTIFACT,
            entity_id=thread_id,
            metadata={"action": "restore_thread", "provider_action": provider_action},
            before_state=before_state,
            after_state=after_state,
            explain_one_liner=explain_one_liner,
        )
        
        return {
            "status": "restored", 
            "thread_id": thread_id, 
            "new_category": thread.category,
            "provider_action": provider_action
        }
