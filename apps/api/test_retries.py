
import asyncio
import unittest
from unittest.mock import AsyncMock, patch, MagicMock
from dataclasses import dataclass
from typing import Optional, Type, Any
import sys

class BrainError(Exception): pass
class BrainProviderError(BrainError): pass
class BrainTimeoutError(BrainError): pass

mock_errors = MagicMock()
mock_errors.BrainError = BrainError
mock_errors.BrainProviderError = BrainProviderError
mock_errors.BrainTimeoutError = BrainTimeoutError
sys.modules['app.services.brain.errors'] = mock_errors

sys.modules['app.models.triaged_email'] = MagicMock()
sys.modules['app.models.draft_template'] = MagicMock()
sys.modules['app.models.workspace'] = MagicMock()
sys.modules['app.agents.aaliyah.core.labeling_rules'] = MagicMock()
sys.modules['app.services.brain.core'] = MagicMock()
sys.modules['app.services.brain.knowledge_graph'] = MagicMock()
sys.modules['app.agents.aaliyah.core.scheduling.availability_engine'] = MagicMock()
sys.modules['app.agents.aaliyah.core.scheduling.booking_manager'] = MagicMock()
sys.modules['app.config'] = MagicMock()
sys.modules['app.agents.aaliyah.core.ingestion.email_ingestor'] = MagicMock()
sys.modules['app.agents.aaliyah.core.ingestion.sanitizer'] = MagicMock()
sys.modules['app.agents.aaliyah.core.critic_agent'] = MagicMock()
sys.modules['app.agents.aaliyah.core.humanizer'] = MagicMock()

from app.agents.aaliyah.core.drafting import DraftingAgent, DraftResponse

@dataclass
class MockEmail:
    id: str = "msg_123"
    thread_id: str = "thread_123"
    sender: str = "sender@example.com"
    subject: str = "Test Subject"
    snippet: str = "Hello"
    metadata_json: Optional[dict] = None
    category: str = "Inbox"
    provider: str = "google"

@dataclass
class MockGeneratedData:
    action: str = "reply"
    subject: str = "Re: Test Subject"
    body: str = "Draft Body"
    rationale: str = "Rationale"
    intent: str = "test"
    risk_labels: list = None
    missing_info: str = None
    sources_used: list = None
    
    def get(self, key, default=None):
        return getattr(self, key, default)

class TestDraftingRetries(unittest.IsolatedAsyncioTestCase):
    async def test_generate_draft_retries_and_succeeds(self):
        print("\nStarting test_generate_draft_retries_and_succeeds...")
        agent = DraftingAgent(MagicMock(), "ws_123")
        agent.brain = MagicMock()
        agent.label_engine = MagicMock()
        agent.kg = MagicMock()
        agent.availability = MagicMock()
        
        email = MockEmail()
        
        call_count = 0
        async def mock_think_json(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            print(f"  Internal LLM call {call_count}")
            if call_count < 3:
                raise BrainProviderError("Transient failure")
            return MockGeneratedData()
        
        agent.brain.think_json.side_effect = mock_think_json
        agent._get_style_context = AsyncMock(return_value="Style context")
        
        with patch('app.agents.aaliyah.core.drafting.CriticAgent') as MockCritic:
            mock_critic_instance = MockCritic.return_value
            mock_critic_instance.review_draft = AsyncMock(return_value=MagicMock(status="approved", rewritten_body=None))
            
            with patch('app.agents.aaliyah.core.drafting.HumanizerFilter.apply', side_effect=lambda x: x):
                with patch('app.agents.aaliyah.core.drafting.DraftResponse', side_effect=lambda **kwargs: MagicMock()):
                    try:
                        result = await agent.generate_draft(email)
                        print(f"  Result received: {result}")
                        self.assertIsNotNone(result)
                        self.assertEqual(call_count, 3)
                        print("[PASS] test_generate_draft_retries_and_succeeds")
                    except Exception as fatal:
                        print(f"  FATAL ERROR in test: {fatal}")
                        import traceback
                        traceback.print_exc()
                        raise fatal

if __name__ == "__main__":
    unittest.main()
