import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from app.workers.local_sync import process_heartbeat

class TestHeartbeat(unittest.IsolatedAsyncioTestCase):

    @patch("app.workers.local_sync.AaliyahOrchestrator")
    async def test_process_heartbeat_triggers_flush(self, mock_orc_class):
        # Setup
        mock_orc = MagicMock()
        mock_orc.flush_communication = AsyncMock()
        mock_orc_class.return_value = mock_orc
        
        payload = {"workspace_id": "ws_123"}
        
        # Execute
        await process_heartbeat(payload)
        
        # Verify
        mock_orc_class.assert_called_once_with("ws_123")
        mock_orc.flush_communication.assert_called_once()

if __name__ == '__main__':
    unittest.main()
