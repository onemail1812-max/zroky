"""Deterministic action execution with audit-first behavior."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.services.audit_log_service import AuditAction, AuditEntityType, AuditLogService
from app.services.integrations.email_connector import EmailConnectorFactory


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

        # 2. Get Connector
        connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, email.provider)

        # 3. Send
        try:
            sent_result = await connector.send_message(
                recipient=email.sender, 
                subject=draft.get("subject", f"Re: {email.subject}"),
                body=draft.get("body", "")
            )
        except Exception as e:
            raise RuntimeError(f"Failed to send email: {e}")

        # 4. Update State
        draft["status"] = "sent"
        draft["sent_at"] = sent_result.get("received_at") or datetime.now(timezone.utc).isoformat()
        draft["external_sent_id"] = sent_result.get("id")
        
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
