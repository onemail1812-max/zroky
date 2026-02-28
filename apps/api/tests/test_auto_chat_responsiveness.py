import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from app.agents.aaliyah.core.communication_engine import CommunicationEngine, CommunicationState
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator, WorkspaceRuntimeState

class TestAutoChatResponsiveness(unittest.IsolatedAsyncioTestCase):

    def test_communication_engine_urgency(self):
        engine = CommunicationEngine()
        state = CommunicationState()
        
        # Scenario 1: Standard event should NOT flush immediately if within interval
        state.last_message_at = 1000000.0
        with patch("app.agents.aaliyah.core.communication_engine.datetime") as mock_datetime:
            # Set up the chain: datetime.now(timezone.utc).timestamp()
            mock_datetime.now.return_value.timestamp.return_value = 1000010.0 
            
            engine.add_event(state, "draft_ready", {"subject": "Normal"})
            self.assertFalse(engine.should_flush(state))
            
        # Scenario 2: Urgent event SHOULD flush immediately
        engine.add_event(state, "priority_added", {"priority": "High"}, urgent=True)
        self.assertTrue(engine.should_flush(state))

    @patch("app.agents.aaliyah.core.orchestrator.event_bus.publish", new_callable=AsyncMock)
    @patch("app.agents.aaliyah.core.orchestrator.SessionLocal", new_callable=MagicMock)
    @patch("app.services.brain.core.Brain")
    async def test_orchestrator_urgent_mapping(self, mock_brain, mock_session, mock_publish):
        orc = AaliyahOrchestrator("ws_123", brain=mock_brain)
        
        # Mock communication state
        state = WorkspaceRuntimeState()
        orc._state["ws_123"] = state
        
        # 1. Trigger thread_updated with High priority
        payload = {"priority": "High", "subject": "URGENT", "sender": "ceo@co.com"}
        
        # We need to mock the DB queries inside _emit's communicaton flush
        mock_db = MagicMock()
        mock_session.return_value = mock_db
        mock_db.query.return_value.filter.return_value.first.return_value = MagicMock(settings_json={})

        # Mock comm_engine.flush to see if it returned a message
        orc.comm_engine.flush = AsyncMock(return_value="Boss, you have a priority mail.")
        
        await orc.emit_status("thread_updated", "Triaged", payload)
        
        # Verify that an assistant_message was eventually emitted (due to urgent flush)
        emitted_types = [call.args[0].type for call in mock_publish.call_args_list]
        self.assertIn("assistant_message", emitted_types)

if __name__ == '__main__':
    unittest.main()
