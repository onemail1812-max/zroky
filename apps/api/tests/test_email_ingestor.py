import os
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Required env vars before importing app modules.
os.environ.setdefault("SECRET_KEY", "test-secret-must-be-min-16-chars")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from app.database import Base
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor


class FakeGmailService:
    def __init__(self, _token):
        pass

    def list_unread_messages(self, max_results: int = 10):
        return [
            {
                "id": "msg-1",
                "thread_id": "thread-1",
                "sender": "steve@company.com",
                "subject": "Q3 planning",
                "snippet": "Can we move this to Tuesday?",
                "received_at": "2026-02-11T10:15:00+00:00",
                "is_read": False,
            }
        ][:max_results]


class EmailIngestorTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    async def test_fetch_and_normalize_gmail(self):
        db = self.SessionLocal()
        ingestor = EmailIngestor("w1", db)

        with patch(
            "app.agents.aaliyah.core.ingestion.email_ingestor.IntegrationTokenManager.get_valid_token",
            return_value={"access_token": "x"},
        ), patch("app.agents.aaliyah.core.ingestion.email_ingestor.GmailService", new=FakeGmailService):
            items = await ingestor.fetch_and_normalize(provider="google", max_results=5)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].provider, "google")
        self.assertEqual(items[0].metadata.sender, "steve@company.com")
        self.assertEqual(items[0].id, "msg-1")
        db.close()


if __name__ == "__main__":
    unittest.main()
