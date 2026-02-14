"""Undo support for previously audited actions."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, AuditStatus
from app.services.integrations.email_connector import EmailConnectorFactory


class UndoService:
    def __init__(self, db: Session):
        self.db = db

    async def undo(self, audit_log_id: str, user_id: str, workspace_id: str | None = None) -> dict[str, str]:
        audit = self.db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
        if not audit:
            raise ValueError("Audit log entry not found")
        if workspace_id and str(audit.workspace_id) != str(workspace_id):
            raise PermissionError("Cross-workspace undo is denied")

        if audit.status == AuditStatus.UNDONE.value:
            return {"status": "already_undone", "audit_id": audit.id}

        payload = audit.undo_payload or {}
        undo_type = str(payload.get("type") or "").upper()

        try:
            if undo_type == "REMOVE_LABEL":
                workspace_id = str(audit.workspace_id)
                provider = str(payload.get("provider") or "gmail")
                message_id = str(payload.get("message_id") or "")
                label_name = str(payload.get("label_name") or "")
                label_id = payload.get("label_id")

                if not message_id or not label_name:
                    raise ValueError("Undo payload missing message_id or label_name")

                connector = await EmailConnectorFactory(self.db, workspace_id).get_connector(user_id, provider)
                await connector.remove_label(message_id, label_name, label_id=label_id)
            else:
                raise ValueError("Unsupported undo operation")

            audit.status = AuditStatus.UNDONE.value
            self.db.commit()
            return {"status": "undone", "audit_id": audit.id}
        except Exception:
            audit.status = AuditStatus.FAILED.value
            self.db.commit()
            raise
