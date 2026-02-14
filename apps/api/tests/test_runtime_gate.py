import os
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set required env vars before importing app modules
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

from app.database import Base
from app.models.aaliyah_settings_v2 import AaliyahSettingsV2
from app.services.aaliyah.runtime_gate import gate_email


class RuntimeGateTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    def test_money_risk_escalates(self):
        db = self.SessionLocal()
        result = gate_email(
            db=db,
            user_id="u1",
            workspace_id="w1",
            intent="DRAFT",
            subject="Invoice overdue",
            body="Please pay $1,200 by Friday.",
        )
        self.assertEqual(result.risk.domain, "MONEY")
        self.assertEqual(result.outcome, "ESCALATE")
        self.assertFalse(result.allow_llm)
        db.close()

    def test_legal_risk_escalates(self):
        db = self.SessionLocal()
        result = gate_email(
            db=db,
            user_id="u1",
            workspace_id="w1",
            intent="DRAFT",
            subject="NDA review",
            body="Please review the contract terms and liability section.",
        )
        self.assertEqual(result.risk.domain, "LEGAL")
        self.assertEqual(result.outcome, "ESCALATE")
        self.assertFalse(result.allow_llm)
        db.close()

    def test_new_sender_requires_approval(self):
        db = self.SessionLocal()
        result = gate_email(
            db=db,
            user_id="u1",
            workspace_id="w1",
            intent="DRAFT",
            subject="Quick request",
            body="Can you review this?",
            context={"is_new_sender": True, "is_actionable": True},
        )
        self.assertEqual(result.outcome, "NEEDS_APPROVAL")
        self.assertTrue(result.require_approval)
        self.assertFalse(result.allow_llm)
        db.close()

    def test_scheduling_blocked_by_autonomy(self):
        db = self.SessionLocal()
        result = gate_email(
            db=db,
            user_id="u1",
            workspace_id="w1",
            intent="ACCEPT_MEETING",
            subject="Schedule meeting",
            body="Please book a meeting tomorrow.",
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.outcome, "NEEDS_APPROVAL")
        self.assertFalse(result.allow_llm)
        db.close()

    def test_unknown_intent_requires_approval(self):
        db = self.SessionLocal()
        result = gate_email(
            db=db,
            user_id="u1",
            workspace_id="w1",
            intent="FOO_BAR",
            subject="Test",
            body="Random content",
        )
        self.assertFalse(result.allowed)
        self.assertEqual(result.outcome, "NEEDS_APPROVAL")
        self.assertFalse(result.allow_llm)
        db.close()


if __name__ == "__main__":
    unittest.main()
