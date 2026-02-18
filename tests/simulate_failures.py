
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from app.services.integrations.safe_requester import SafeRequester
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier, TriageResult
from app.agents.aaliyah.core.drafting import DraftingAgent
from app.models.triaged_email import TriagedEmail
from app.services.brain.core import Brain
import requests
import asyncio
from datetime import datetime

class TestFailures(unittest.TestCase):
    
    def test_safe_requester_config(self):
        """Verify SafeRequester configures retries and backoff correctly."""
        print("\nTesting SafeRequester Configuration...")
        requester = SafeRequester(retries=5, backoff_factor=1.5)
        
        adapter = requester.session.get_adapter("https://")
        self.assertEqual(adapter.max_retries.total, 5, "Total retries should match config")
        self.assertEqual(adapter.max_retries.backoff_factor, 1.5, "Backoff factor should match config")
        self.assertIn(429, adapter.max_retries.status_forcelist, "Should retry on 429")
        print("SafeRequester configuration verified.")

    def test_llm_outage_triage(self):
        """Verify triage continues (heuristic fallback) if Brain is down."""
        print("\nTesting LLM Outage Triage Fallback...")
        mock_brain = MagicMock(spec=Brain)
        # Brain raises exception
        async def raise_error(*args, **kwargs):
            raise Exception("LLM Down")
        mock_brain.think.side_effect = raise_error
        
        classifier = SmartTriageClassifier(brain=mock_brain)
        
        # message with clear keywords
        msg = MagicMock()
        msg.metadata.subject = "URGENT: Production Down"
        msg.content = "Fix ASAP"
        msg.metadata.sender = "boss@company.com"
        
        # Async run
        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(classifier.classify(msg))
        finally:
            loop.close()
            
        print(f"Result Category: {result.category}")
        print(f"Result Reasoning: {result.reasoning}")
        
        self.assertEqual(result.category, "Urgent", "Should fallback to heuristic urgent")
        self.assertIn("urgency", result.reasoning.lower(), "Fallback reasoning should mention urgency")

    def test_llm_outage_drafting(self):
        """Verify drafting fails gracefully (returns None) if Brain is down."""
        print("\nTesting LLM Outage Drafting Graceful Failure...")
        mock_brain = MagicMock(spec=Brain)
        async def raise_error(*args, **kwargs):
            raise Exception("LLM Down")
        mock_brain.think.side_effect = raise_error
        
        # mocking deps
        db = MagicMock()
        workspace_id = "ws_test"
        
        # Mock internal deps of DraftingAgent to avoid real DB/KG calls
        with patch('app.agents.aaliyah.core.drafting.KnowledgeGraphService'), \
             patch('app.agents.aaliyah.core.drafting.LabelingRulesEngine'), \
             patch('app.agents.aaliyah.core.drafting.AvailabilityEngine'), \
             patch('app.agents.aaliyah.core.drafting.EmailIngestor'):
             
            agent = DraftingAgent(db, workspace_id)
            agent.brain = mock_brain # inject mock
            
            # Mock helper method to avoid DB call
            # Use AsyncMock since it is awaited
            agent._get_style_context = AsyncMock(return_value="Style context")
            # Mock label engine
            agent.label_engine.list_recent_thread_history.return_value = []
            
            email = TriagedEmail(
                id="1", 
                snippet="Hello", 
                sender="foo@bar.com", 
                subject="Hi",
                thread_id="th_1"
            )
            
            loop = asyncio.new_event_loop()
            try:
                result = loop.run_until_complete(agent.generate_draft(email))
            finally:
                loop.close()
            
            if result is None:
                print("DraftingAgent returned None (Success)")
            else:
                print(f"DraftingAgent returned: {result}")
            
            self.assertIsNone(result, "Should return None on LLM failure, not crash")

if __name__ == '__main__':
    unittest.main()
