import os
import unittest

# Required env vars before importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("MICROSOFT_CLIENT_ID", "test-ms-client-id")
os.environ.setdefault("MICROSOFT_CLIENT_SECRET", "test-ms-client-secret")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.com/.well-known/jwks.json")
os.environ.setdefault("CLERK_JWT_AUD", "test-aud")
os.environ.setdefault("CLERK_JWT_ISS", "https://example.com")

from app.services.aaliyah.policy_engine import PolicyEngine
from app.services.aaliyah.risk_engine import RiskEngine
from app.services.aaliyah.llm_schemas import parse_draft_output
from app.services.aaliyah.golden_examples import GoldenExamplesService


class DummyPolicyEngine(PolicyEngine):
    def _get_settings(self, user_id, workspace_id):
        return None


class PolicyRiskTests(unittest.TestCase):
    def test_policy_blocks_send(self):
        engine = DummyPolicyEngine(None)
        decision = engine.evaluate(
            user_id="u1",
            workspace_id="w1",
            intent="SEND",
            risk_domain="LOW",
        )
        self.assertFalse(decision.allowed)

    def test_risk_money_detected(self):
        engine = RiskEngine()
        result = engine.score(subject="Invoice overdue", body="Please pay $1,200 by Friday.")
        self.assertEqual(result.domain, "MONEY")
        self.assertGreaterEqual(result.score, 0.4)
        self.assertTrue(result.should_escalate)

    def test_invalid_draft_json_fails(self):
        with self.assertRaises(ValueError):
            parse_draft_output("not json")

    def test_golden_example_min_edit(self):
        service = GoldenExamplesService(None)
        self.assertTrue(service.is_minimal_edit("Hello", "Hello!"))
        self.assertFalse(service.is_minimal_edit("Hello", "Completely different text"))


if __name__ == "__main__":
    unittest.main()
