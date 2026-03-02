
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from app.agents.aaliyah.core.drafting import DraftingAgent, DraftResponse
from app.models.triaged_email import TriagedEmail
from app.models.draft_template import DraftTemplate
from app.models.workspace import Workspace

class TestDraftingAgent(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = MagicMock()
        self.workspace_id = "ws_123"
        
        # Patching inside __init__ requires patching the class before instantiation or mocking dependencies after
        # Since Agent instantiates Brain() in __init__, we need to patch 'app.agents.aaliyah.core.drafting.Brain'
        pass

    @patch("app.agents.aaliyah.core.drafting.CriticAgent")
    @patch("app.agents.aaliyah.core.drafting.Brain")
    @patch("app.agents.aaliyah.core.drafting.KnowledgeGraphService")
    @patch("app.agents.aaliyah.core.drafting.LabelingRulesEngine")
    async def test_generate_draft_flow(self, MockLRE, MockKG, MockBrain, MockCritic):
        # Setup mocks
        mock_brain_instance = MockBrain.return_value
        mock_kg_instance = MockKG.return_value
        mock_lre_instance = MockLRE.return_value
        mock_critic_instance = MockCritic.return_value
        mock_critic_instance.review_draft = AsyncMock()
        mock_critic_instance.review_draft.return_value.status = "approved"
        mock_critic_instance.review_draft.return_value.rewritten_body = None
        
        agent = DraftingAgent(self.db, self.workspace_id)
        
        # 1. Test "Ignore"
        email = TriagedEmail(id="e1", sender="noreply@x.com", subject="News", snippet="Hi", category="News", priority="Low")
        mock_brain_instance.think = AsyncMock()
        mock_brain_instance.think.return_value.content = '{"action": "ignore"}'
        
        draft = await agent.generate_draft(email)
        self.assertIsNone(draft)
        
        # 2. Test "Reply" with Template Injection
        email2 = TriagedEmail(id="e2", sender="client@x.com", subject="Quote", snippet="Cost?", category="Sales", priority="High")
        
        # Mock DB for templates and settings
        # We need complex chaining: db.query(Model).filter(...).first()/.all()
        # This is hard to mock generically for multiple calls unless we are specific
        
        mock_query = self.db.query
        
        # Mock Workspace query
        mock_ws = Workspace(id="ws_123", settings_json={"aaliyah": {"signature": "- Aaliyah", "draft_tone": "friendly"}})
        
        # Mock Templates query
        mock_t1 = DraftTemplate(name="Quote", body="Price is $X")
        
        def side_effect(model):
            mock_filter = MagicMock()
            if model == Workspace:
                mock_filter.filter.return_value.first.return_value = mock_ws
                return mock_filter
            elif model == DraftTemplate:
                mock_filter.filter.return_value.all.return_value = [mock_t1]
                return mock_filter
            return mock_filter
            
        mock_query.side_effect = side_effect
        
        # Mock Brain response
        mock_brain_instance.think.return_value.content = '{"action": "reply", "subject": "Re: Quote", "body": "Price is $X\\n- Aaliyah", "rationale": "Template used"}'
        
        draft = await agent.generate_draft(email2)
        
        self.assertIsNotNone(draft)
        self.assertEqual(draft.subject, "Re: Quote")
        
        # Verify prompt construction
        call_kwargs = mock_brain_instance.think.call_args.kwargs
        prompt = call_kwargs["prompt"]
        system_prompt = call_kwargs["system_prompt"]
        
        self.assertIn("Tone: friendly", system_prompt)

if __name__ == "__main__":
    unittest.main()
