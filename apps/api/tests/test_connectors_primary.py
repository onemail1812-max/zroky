from __future__ import annotations
import pytest
from unittest.mock import patch, MagicMock
from app.agents.aaliyah.api.connectors import set_primary_email
from app.models.workspace import Workspace
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_context():
    context = MagicMock()
    context.workspace_id = "ws_test"
    return context

@pytest.mark.asyncio
async def test_set_primary_email_updates_settings(mock_db, mock_context):
    # Setup
    workspace = Workspace(id="ws_test", settings_json={})
    
    # Mock queries
    mock_db.query.return_value.filter.return_value.first.side_effect = [
        workspace, # for Workspace query
        MagicMock() # for Integration query (simulating connected)
    ]
    
    # Payload wrapper
    class Payload:
        provider = "google"
        
    response = await set_primary_email(Payload(), mock_db, mock_context)
    
    assert response["status"] == "updated"
    assert response["primary_email_provider"] == "google"
    assert workspace.settings_json["aaliyah"]["primary_email_provider"] == "google"

@pytest.mark.asyncio
async def test_set_primary_none_clears_setting(mock_db, mock_context):
    # Setup
    workspace = Workspace(id="ws_test", settings_json={"aaliyah": {"primary_email_provider": "google"}})
    
    mock_db.query.return_value.filter.return_value.first.return_value = workspace
    
    class Payload:
        provider = "none"
        
    response = await set_primary_email(Payload(), mock_db, mock_context)
    
    assert response["status"] == "updated"
    assert "primary_email_provider" not in workspace.settings_json["aaliyah"]
