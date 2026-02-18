import os
import unittest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("SECRET_KEY", "test-secret-long-enough-32-chars-long")

from app.database import Base
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.drafting import DraftingAgent, DraftResponse

class DraftEngineTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()

    async def test_draft_includes_rationale_and_intent(self):
        agent = DraftingAgent(self.db, "w3")
        # Mock brain
        agent.brain.think = AsyncMock(return_value=MagicMock(content='''{
            "action": "reply",
            "intent": "info request",
            "subject": "Re: Pricing Query",
            "body": "I'll check on the pricing and get back to you.",
            "risk_labels": ["Money"],
            "missing_info": "Specific pricing for Project X",
            "rationale": "Replying to info request while checking internal facts."
        }'''))
        
        email = TriagedEmail(
            id="e1", workspace_id="w3", provider="google",
            external_message_id="ext-1", sender="client@test.com",
            subject="Pricing Query", snippet="How much for the package?",
            category="FYI", priority="Low"
        )
        self.db.add(email)
        self.db.commit()

        draft = await agent.generate_draft(email)
        self.assertIsNotNone(draft)
        self.assertEqual(draft.intent, "info request")
        self.assertEqual(draft.rationale, "Replying to info request while checking internal facts.")
        self.assertIn("Money", draft.risk_labels)

    async def test_style_ladder_thresholds(self):
        agent = DraftingAgent(self.db, "w3")
        
        # 0 sends
        context0 = await agent._get_style_context()
        self.assertIn("No style baseline yet", context0)

        # Add 12 "sent" drafts
        for i in range(12):
            e = TriagedEmail(
                id=f"sent-{i}", workspace_id="w3", provider="google",
                external_message_id=f"ext-sent-{i}",
                metadata_json={"draft": {"status": "sent", "body": f"Best regards {i}", "subject": "Re"}}
            )
            self.db.add(e)
        self.db.commit()

        context10 = await agent._get_style_context()
        self.assertIn("Use the user's preferred greeting", context10)
        self.assertNotIn("phrasing patterns", context10)

        # Add 20 more (total 32)
        for i in range(12, 32):
            e = TriagedEmail(
                id=f"sent-{i}", workspace_id="w3", provider="google",
                external_message_id=f"ext-sent-{i}",
                metadata_json={"draft": {"status": "sent", "body": f"Cheers {i}", "subject": "Re"}}
            )
            self.db.add(e)
        self.db.commit()

        context30 = await agent._get_style_context()
        self.assertIn("phrasing patterns", context30)
        self.assertNotIn("micro-style", context30)

        # Add 30 more (total 62)
        for i in range(32, 62):
            e = TriagedEmail(
                id=f"sent-{i}", workspace_id="w3", provider="google",
                external_message_id=f"ext-sent-{i}",
                metadata_json={"draft": {"status": "sent", "body": f"Thanks {i}", "subject": "Re"}}
            )
            self.db.add(e)
        self.db.commit()

        context60 = await agent._get_style_context()
        self.assertIn("micro-style", context60)

if __name__ == "__main__":
    unittest.main()
