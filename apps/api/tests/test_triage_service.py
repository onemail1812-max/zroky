import os
import unittest

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")

from app.services.aaliyah.ingestion.email_ingestor import EmailMetadata, NormalizedEmailMessage
from app.services.aaliyah.triage_service import SmartTriageClassifier
from app.services.brain.schemas.brain_types import BrainResponse


class GoodBrain:
    async def think(self, *args, **kwargs):
        return BrainResponse(
            content='{"category":"Meeting","priority":"Medium","is_noise":false,"confidence":0.96,"reasoning":"Scheduling intent detected."}',
            usage={"total_tokens": 10},
            model_used="test-model",
            latency_ms=1,
            finish_reason="stop",
        )


class BrokenBrain:
    async def think(self, *args, **kwargs):
        return BrainResponse(
            content="not-json",
            usage={"total_tokens": 8},
            model_used="test-model",
            latency_ms=1,
            finish_reason="stop",
        )


class TriageServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_classify_parses_valid_fast_model_response(self):
        classifier = SmartTriageClassifier(GoodBrain())
        msg = NormalizedEmailMessage(
            id="m1",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="steve@company.com", subject="Can we reschedule?", thread_id="t1"),
            content="Are you available Tuesday afternoon for meeting?",
        )
        result = await classifier.classify(msg)
        self.assertEqual(result.category, "Meeting")
        self.assertEqual(result.priority, "Medium")
        self.assertFalse(result.is_noise)
        self.assertGreaterEqual(result.confidence, 0.9)

    async def test_classify_uses_fallback_when_model_output_invalid(self):
        classifier = SmartTriageClassifier(BrokenBrain())
        msg = NormalizedEmailMessage(
            id="m2",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="promo@news.com", subject="Weekly newsletter", thread_id="t2"),
            content="unsubscribe to stop updates",
        )
        result = await classifier.classify(msg)
        self.assertEqual(result.category, "Newsletter")
        self.assertEqual(result.priority, "Low")
        self.assertTrue(result.is_noise)


if __name__ == "__main__":
    unittest.main()
