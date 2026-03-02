import pytest
from unittest.mock import MagicMock
from app.services.integrations.health_service import ConnectorHealthService
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def service(mock_db):
    return ConnectorHealthService(mock_db, "erp_123")

def create_mock_integration(provider=IntegrationProvider.GOOGLE_GMAIL, status=IntegrationStatus.CONNECTED, token_encrypted="encrypted_token"):
    integration = MagicMock(spec=Integration)
    integration.provider = provider
    integration.status = status
    integration.token_encrypted = token_encrypted
    return integration

def test_no_integrations_returns_not_connected(service, mock_db):
    mock_db.query.return_value.filter.return_value.all.return_value = []
    
    health = service.get_detailed_health()
    
    assert health["email_accessible"] is False
    assert health["email"]["connected"] is False
    assert health["email"]["status"] == "NOT_CONNECTED"
    assert health["calendar"]["connected"] is False

def test_google_connected_returns_ok(service, mock_db):
    integ = create_mock_integration(provider=IntegrationProvider.GOOGLE_GMAIL)
    mock_db.query.return_value.filter.return_value.all.return_value = [integ]
    
    health = service.get_detailed_health()
    
    assert health["email_accessible"] is True
    assert health["email"]["connected"] is True
    assert health["email"]["status"] == "OK"
    assert health["providers"]["google_gmail"] == "CONNECTED"

def test_microsoft_connected_returns_ok(service, mock_db):
    integ = create_mock_integration(provider=IntegrationProvider.OUTLOOK)
    mock_db.query.return_value.filter.return_value.all.return_value = [integ]
    
    health = service.get_detailed_health()
    
    assert health["email_accessible"] is True
    assert health["providers"]["outlook"] == "CONNECTED"

def test_integration_without_token_returns_not_connected(service, mock_db):
    integ = create_mock_integration(token_encrypted=None)
    mock_db.query.return_value.filter.return_value.all.return_value = [integ]
    
    health = service.get_detailed_health()
    
    assert health["email_accessible"] is False
    assert health["email"]["connected"] is False

def test_integration_with_status_revoked_returns_not_connected(service, mock_db):
    integ = create_mock_integration(status=IntegrationStatus.NEEDS_RECONNECT)
    mock_db.query.return_value.filter.return_value.all.return_value = [integ]
    
    health = service.get_detailed_health()
    
    assert health["email_accessible"] is False
    assert health["email"]["connected"] is False
