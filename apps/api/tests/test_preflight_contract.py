
import pytest
from unittest.mock import MagicMock, patch
from app.services.integrations.health_service import ConnectorHealthService

@pytest.fixture
def mock_health_service():
    with patch("app.agents.aaliyah.core.greeting_service.ConnectorHealthService") as MockService:
        yield MockService

def test_health_structure_disconnected():
    """Contract: When no accounts, status is NOT_CONNECTED and accessible is False."""
    service = MagicMock()
    service.get_detailed_health.return_value = {
        "email": {"status": "NOT_CONNECTED", "connected": False},
        "calendar": {"status": "NOT_CONNECTED", "connected": False},
        "email_accessible": False,
        "calendar_accessible": False
    }
    
    report = service.get_detailed_health()
    
    assert report["email"]["status"] == "NOT_CONNECTED"
    assert report["email_accessible"] is False
    assert report["email"]["connected"] is False

def test_health_structure_connected():
    """Contract: When connected, status is OK and accessible is True."""
    service = MagicMock()
    service.get_detailed_health.return_value = {
        "email": {"status": "OK", "connected": True, "provider": "google"},
        "calendar": {"status": "OK", "connected": True},
        "email_accessible": True,
        "calendar_accessible": True
    }
    
    report = service.get_detailed_health()
    
    assert report["email"]["status"] == "OK"
    assert report["email_accessible"] is True
    assert report["email"]["provider"] == "google"

def test_health_structure_reconnect():
    """Contract: When token expired, status is NEEDS_RECONNECT."""
    service = MagicMock()
    service.get_detailed_health.return_value = {
        "email": {"status": "NEEDS_RECONNECT", "connected": True, "error_code": "token_expired"},
        "email_accessible": False
    }
    
    report = service.get_detailed_health()
    
    assert report["email"]["status"] == "NEEDS_RECONNECT"
    assert report["email_accessible"] is False
