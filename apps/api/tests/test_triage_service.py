import os
import unittest

os.environ.setdefault("SECRET_KEY", "test-secret-123456")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from app.agents.aaliyah.core.ingestion.email_ingestor import EmailMetadata, NormalizedEmailMessage
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier
from app.services.brain.schemas.brain_types import BrainResponse


from app.agents.aaliyah.core.triage_service import TriageResult

class GoodBrain:
    async def think_json(self, *args, **kwargs):
        return TriageResult(
            category="Needs Reply",
            priority="Medium",
            is_noise=False,
            confidence=0.96,
            reasoning="Scheduling intent detected.",
            language="English"
        )


class SpanishBrain:
    async def think_json(self, *args, **kwargs):
        return TriageResult(
            category="Approvals",
            priority="Medium",
            is_noise=False,
            confidence=0.90,
            reasoning="Signed contract received requiring review/approval.",
            language="Spanish"
        )


class BrokenBrain:
    async def think_json(self, *args, **kwargs):
        raise ValueError("Simulated model failure")


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
        self.assertEqual(result.category, "Needs Reply")  # The normalization might fallback to Needs Reply depending on VALID_CATEGORIES
        self.assertEqual(result.priority, "Medium")
        self.assertFalse(result.is_noise)
        self.assertGreaterEqual(result.confidence, 0.9)
        self.assertEqual(result.language, "English")

    async def test_classify_detects_spanish_language(self):
        classifier = SmartTriageClassifier(SpanishBrain())
        msg = NormalizedEmailMessage(
            id="m1_esp",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="partner@foreign.com", subject="Confirmación del contrato", thread_id="t1_esp"),
            content="Hola, adjunto el contrato firmado. Por favor, revíselo.",
        )
        result = await classifier.classify(msg)
        self.assertEqual(result.category, "Approvals")
        self.assertEqual(result.language, "Spanish")

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
        self.assertEqual(result.language, "English")


if __name__ == "__main__":
    unittest.main()
