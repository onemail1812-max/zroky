import unittest
from unittest.mock import patch, AsyncMock
from app.services.meetings.notetaker import HeadlessNotetakerService, NotetakerSummary

class TestHeadlessNotetakerService(unittest.IsolatedAsyncioTestCase):

    async def test_notetaker_join_flow(self):
        service = HeadlessNotetakerService()
        self.assertFalse(service.is_connected)
        
        success = await service.join_meeting("https://zoom.us/j/12345")
        
        self.assertTrue(success)
        self.assertTrue(service.is_connected)

    async def test_transcription_fails_if_not_connected(self):
        service = HeadlessNotetakerService()
        with self.assertRaises(RuntimeError):
            await service.start_transcription()

    async def test_summary_generation_returns_pydantic_schema(self):
        service = HeadlessNotetakerService()
        
        mock_response = NotetakerSummary(
            summary="Meeting about Q3 budget.",
            key_decisions=["Increased budget to $75k."],
            action_items=["Alex to update finance sheet.", "Sarah to schedule design review."]
        )
        service.brain.think_json = AsyncMock(return_value=mock_response)
        
        transcript = "Mock transcript..."
        res = await service.generate_summary(transcript)
        
        self.assertEqual(res.summary, "Meeting about Q3 budget.")
        self.assertEqual(len(res.action_items), 2)
        self.assertEqual(res.action_items[0], "Alex to update finance sheet.")

if __name__ == '__main__':
    unittest.main()
