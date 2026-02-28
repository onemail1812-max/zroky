import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from app.workers.local_sync import process_sync_provider

class TestSyncErrorAlert(unittest.IsolatedAsyncioTestCase):

    @patch("app.workers.local_sync.EmailIngestor")
    @patch("app.workers.local_sync.AaliyahOrchestrator")
    @patch("app.workers.local_sync.SessionLocal")
    async def test_process_sync_provider_emits_failure(self, mock_session, mock_orc_class, mock_ingestor_class):
        # Setup
        mock_orc = MagicMock()
        mock_orc.emit_status = AsyncMock()
        mock_orc_class.return_value = mock_orc
        
        # Simulate an exception in the ingestor
        mock_ingestor = MagicMock()
        mock_ingestor.fetch_incremental = AsyncMock(side_effect=Exception("Connection broken"))
        mock_ingestor_class.return_value = mock_ingestor
        
        payload = {"workspace_id": "ws_123", "provider": "google"}
        
        # Execute (will raise since we re-raise it)
        with self.assertRaises(Exception):
            await process_sync_provider(payload)
        
        # Verify that emit_status was called with "sync_failed"
        mock_orc.emit_status.assert_called_with(
            "sync_failed",
            "Sync failed for workspace ws_123. Please check your connection.",
            {"error": "Connection broken", "workspace_id": "ws_123"}
        )

if __name__ == '__main__':
    unittest.main()
