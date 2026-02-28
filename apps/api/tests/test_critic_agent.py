import unittest
from unittest.mock import patch, AsyncMock
from app.agents.aaliyah.core.critic_agent import CriticAgent, CriticStatus, CriticResponse

class TestCriticAgent(unittest.IsolatedAsyncioTestCase):

    async def test_critic_approves_good_draft(self):
        critic = CriticAgent()
        # Mock the brain to return an approved JSON
        mock_response = CriticResponse(
            status=CriticStatus.APPROVED,
            feedback="The draft is solid and lacks hallucination.",
            rewritten_body=None
        )
        critic.brain.think_json = AsyncMock(return_value=mock_response)
        
        res = await critic.review_draft("Hello, what is your price?", "Hi, our price is $10.", "Fact: Price is $10.")
        
        self.assertEqual(res.status, CriticStatus.APPROVED)
        self.assertIsNone(res.rewritten_body)

    async def test_critic_modifies_bad_draft(self):
        critic = CriticAgent()
        mock_response = CriticResponse(
            status=CriticStatus.MODIFIED,
            feedback="Removed hallucinated timeline.",
            rewritten_body="Hi, I will check the timeline."
        )
        critic.brain.think_json = AsyncMock(return_value=mock_response)
        
        res = await critic.review_draft("When is delivery?", "It will be there in 2 days.", "Fact: Unknown delivery time.")
        
        self.assertEqual(res.status, CriticStatus.MODIFIED)
        self.assertEqual(res.rewritten_body, "Hi, I will check the timeline.")

if __name__ == '__main__':
    unittest.main()
