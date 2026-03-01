import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Required env vars before importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret-must-be-min-16-chars")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("MICROSOFT_CLIENT_ID", "test-ms-client-id")
os.environ.setdefault("MICROSOFT_CLIENT_SECRET", "test-ms-client-secret")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.com/.well-known/jwks.json")
os.environ.setdefault("CLERK_JWT_AUD", "test-aud")
os.environ.setdefault("CLERK_JWT_ISS", "https://example.com")

from app.database import Base
from app.models.audit_log import AuditLog
from app.agents.aaliyah.core.action_executor import ActionExecutor
from app.agents.aaliyah.core.undo_service import UndoService
from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType


class FakeConnector:
    def __init__(self):
        self.labels = {"msg-1": ["INBOX"]}
        self.removed = None

    async def get_message(self, message_id):
        return {"id": message_id, "labelIds": list(self.labels.get(message_id, []))}

    async def apply_label(self, message_id, label_name):
        labels = self.labels.setdefault(message_id, [])
        if label_name not in labels:
            labels.append(label_name)
        return {"name": label_name, "id": "lbl-1", "color": "#ccc"}

    async def remove_label(self, message_id, label_name, label_id=None):
        labels = self.labels.get(message_id, [])
        self.labels[message_id] = [l for l in labels if l != label_name]
        self.removed = (message_id, label_name, label_id)

    async def move_to_inbox(self, message_id):
        labels = self.labels.setdefault(message_id, [])
        if "INBOX" not in labels:
            labels.append("INBOX")

    async def archive_message(self, message_id):
        labels = self.labels.get(message_id, [])
        if "INBOX" in labels:
            labels.remove("INBOX")
        return {"id": message_id}


class UndoAuditTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    async def test_action_executor_writes_audit(self):
        db = self.SessionLocal()
        fake_connector = FakeConnector()
        risk_stub = SimpleNamespace(score=0.0, domain="LOW")

        async def fake_get_connector(_self, _user_id, _provider):
            return fake_connector

        executor = ActionExecutor(db)

        with patch("app.services.integrations.email_connector.EmailConnectorFactory.get_connector", new=fake_get_connector):
            await executor.apply_label(
                user_id="u1",
                workspace_id="w1",
                provider="gmail",
                message_id="msg-1",
                label_name="Invoices",
                explain_one_liner="Labeled as Finance.",
                risk=risk_stub,
                model_confidence=1.0,
            )

        audit = db.query(AuditLog).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.undo_payload.get("type"), "REMOVE_LABEL")
        self.assertEqual(audit.status, "APPLIED")
        self.assertIn("INBOX", audit.before_state.get("label_ids", []))
        db.close()

    async def test_undo_service_marks_undone(self):
        db = self.SessionLocal()
        fake_connector = FakeConnector()

        audit = AuditLogService.log_action(
            db=db,
            workspace_id="w1",
            user_id="u1",
            action=AuditAction.UPDATE,
            entity_type=AuditEntityType.ARTIFACT,
            entity_id="msg-1",
            before_state={"label": None},
            after_state={"label": "Invoices"},
            undo_payload={
                "type": "REMOVE_LABEL",
                "provider": "gmail",
                "message_id": "msg-1",
                "label_name": "Invoices",
                "label_id": "lbl-1",
            },
            explain_one_liner="Labeled as Finance.",
        )

        async def fake_get_connector(_self, _user_id, _provider):
            return fake_connector

        undo_service = UndoService(db)
        with patch("app.services.integrations.email_connector.EmailConnectorFactory.get_connector", new=fake_get_connector):
            result = await undo_service.undo(audit.id, "u1")

        self.assertEqual(result.get("status"), "undone")
        self.assertEqual(fake_connector.removed, ("msg-1", "Invoices", "lbl-1"))
        refreshed = db.query(AuditLog).filter(AuditLog.id == audit.id).first()
        self.assertEqual(refreshed.status, "UNDONE")
        db.close()


if __name__ == "__main__":
    unittest.main()
