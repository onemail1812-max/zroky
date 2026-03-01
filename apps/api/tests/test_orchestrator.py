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
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from app.database import Base
from app.models.memory_entry import MemoryEntry
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailMetadata, NormalizedEmailMessage
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.services.brain.schemas.brain_types import BrainResponse


class FakeBrain:
    async def think(self, *args, **kwargs):
        return BrainResponse(
            content='{"subject":"Re: Q3 Planning","body":"Tuesday works for me.","tone_tags":["warm"],"confidence":0.97}',
            usage={"total_tokens": 15},
            model_used="fake",
            latency_ms=1,
            finish_reason="stop",
        )


class OrchestratorTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    async def test_handle_chat_generates_draft(self):
        db = self.SessionLocal()
        orchestrator = AaliyahOrchestrator("w1", brain=FakeBrain())
        response = await orchestrator.handle_chat(db, user_id="u1", message="Draft an email reply to Steve")
        self.assertIn("details", response)
        self.assertIn("gate", response["details"])
        self.assertIn("tool_result", response)
        self.assertEqual(orchestrator.get_status()["status"], "idle")
        db.close()

    async def test_sync_inbox_updates_stats_and_memory(self):
        db = self.SessionLocal()
        orchestrator = AaliyahOrchestrator("w1", brain=FakeBrain())
        fake_items = [
            NormalizedEmailMessage(
                id="m1",
                workspace_id="w1",
                provider="google",
                metadata=EmailMetadata(sender="steve@company.com", subject="Meeting request", thread_id="t1"),
                content="Can we schedule this for Tuesday?",
                is_read=False,
            )
        ]

        async def fake_fetch_inc(*args, **kwargs):
            return fake_items, []

        with patch("app.agents.aaliyah.core.ingestion.email_ingestor.EmailIngestor.fetch_incremental", new=fake_fetch_inc):
            result = await orchestrator.sync_inbox(db, user_id="u1")

        self.assertEqual(result["count"], 1)
        stats = orchestrator.get_stats(db) # Pass db to get realtime stats
        self.assertGreaterEqual(stats["triaged_count"], 1)
        self.assertEqual(db.query(MemoryEntry).count(), 1)
        db.close()


if __name__ == "__main__":
    unittest.main()
