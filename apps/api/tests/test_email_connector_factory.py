import os
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("SECRET_KEY", "test-secret-must-be-min-16-chars")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from app.database import Base
from app.models.membership import Membership, MembershipRole
from app.services.integrations.email_connector import EmailConnectorFactory


class FakeGmailService:
    def __init__(self, _token):
        pass

    def get_message(self, message_id):
        return {"id": message_id, "labelIds": ["INBOX"]}

    def apply_label(self, message_id, label_name):
        return {"status": "applied", "id": "lbl-1", "name": label_name}

    def remove_label(self, message_id, label_name, label_id=None):
        return {"status": "removed", "id": label_id or "lbl-1", "name": label_name}

    def move_to_inbox(self, message_id):
        return {"status": "moved_to_inbox", "id": message_id}

    def archive_message(self, message_id):
        return {"status": "archived", "id": message_id}

    def delete_draft(self, draft_id):
        return {"status": "deleted", "draft_id": draft_id}


class EmailConnectorFactoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    async def test_factory_rejects_cross_workspace_access(self):
        db = self.SessionLocal()
        factory = EmailConnectorFactory(db, "workspace-1")
        with self.assertRaises(PermissionError):
            await factory.get_connector("user-1", "google")
        db.close()

    async def test_factory_returns_gmail_connector_when_authorized(self):
        db = self.SessionLocal()
        db.add(
            Membership(
                id="m1",
                workspace_id="workspace-1",
                user_id="user-1",
                role=MembershipRole.ADMIN,
            )
        )
        db.commit()

        factory = EmailConnectorFactory(db, "workspace-1")
        with patch(
            "app.services.integrations.email_connector.IntegrationTokenManager.get_valid_token",
            return_value={"access_token": "token"},
        ), patch("app.services.integrations.email_connector.GmailService", new=FakeGmailService):
            connector = await factory.get_connector("user-1", "google")
            applied = await connector.apply_label("msg-1", "Urgent")

        self.assertEqual(applied.get("status"), "applied")
        self.assertEqual(applied.get("name"), "Urgent")
        db.close()


if __name__ == "__main__":
    unittest.main()
