import pytest
from unittest.mock import patch, MagicMock, AsyncMock, ANY
from app.workers.followup_worker import process_auto_followup
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_followup_generation_mock():
    # Mock DB Setup
    db = MagicMock()
    mock_email = MagicMock()
    mock_email.sender = "John Doe"
    mock_email.subject = "Project Update"
    mock_email.snippet = "Waiting for your feedback on the latest draft."
    mock_email.thread_id = "thread_123"
    mock_email.id = "email_456"
    mock_email.metadata_json = {}
    
    db.query.return_value.filter.return_value.all.return_value = [mock_email]
    
    # Mock Workspace
    mock_ws = MagicMock()
    mock_ws.settings_json = {"aaliyah": {"user_name": "Alice"}}
    db.query.return_value.filter.return_value.first.return_value = mock_ws
    
    # Mock Orchestrator and Brain
    with patch("app.workers.followup_worker.SessionLocal", return_value=db), \
         patch("app.workers.followup_worker.AaliyahOrchestrator") as mock_orc_class, \
         patch("app.services.brain.core.Brain.think", new_callable=AsyncMock) as mock_think:
        
        mock_orch = AsyncMock()
        mock_orc_class.return_value = mock_orch
        
        mock_response = MagicMock()
        mock_response.content = "Hey Alice, John is still waiting for feedback on the Project Update. Send a nudge?"
        mock_think.return_value = mock_response
        
        payload = {"workspace_id": "ws_789"}
        await process_auto_followup(payload)
        
        # Verify Brain was called
        assert mock_think.called
        # Verify Orchestrator emitted the status
        mock_orch.emit_status.assert_called_with(
            "assistant_message",
            "Hey Alice, John is still waiting for feedback on the Project Update. Send a nudge?",
            ANY
        )
        # Verify metadata update
        assert mock_email.metadata_json["followup_pending_confirmation"] is True
