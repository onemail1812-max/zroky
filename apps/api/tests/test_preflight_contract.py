
import pytest
from fastapi.testclient import TestClient
from app.database import get_db
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.main import app
from app.dependencies import get_current_context, CurrentContext, get_current_user
from app.models.membership import MembershipRole, Membership
from app.models.workspace import Workspace
from app.models.user import User

client = TestClient(app)

# --- Mocks ---


def override_get_current_context():
    return CurrentContext(workspace_id="ws_123", user_id="user_123", role=MembershipRole.ADMIN)

def override_get_current_user():
    return {"sub": "user_123", "email": "test@example.com"}

def smart_query(model):
    mock_query = MagicMock()
    if model == Workspace:
        res = Workspace(id="ws_123", name="Test WS", settings_json={})
    elif model == User:
        res = User(id="user_123", email="test@example.com", full_name="Test User")
    elif model == Membership:
        res = Membership(workspace_id="ws_123", user_id="user_123")
    else:
        res = MagicMock()
        
    mock_query.filter.return_value.first.return_value = res
    return mock_query

# --- Contract Tests ---

@patch("app.agents.aaliyah.api.routes.flag_modified")
def test_preflight_run_gate_contract(mock_flag):
    app.dependency_overrides[get_current_context] = override_get_current_context
    
    mock_db = MagicMock(spec=Session)
    mock_db.query.side_effect = smart_query
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with patch("app.services.integrations.health_service.ConnectorHealthService") as MockHealthSvc:
        mock_svc = MockHealthSvc.return_value
        mock_svc.get_detailed_health.return_value = {
            "email": {"connected": True, "status": "OK", "provider": "google", "error_code": "HEALTHY"},
            "calendar": {"connected": True, "status": "OK", "provider": "google", "error_code": "HEALTHY"}
        }
        
        response = client.post("/aaliyah/preflight/run")
            
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OK"
        assert data["email_connected"] is True

@patch("app.agents.aaliyah.api.routes.flag_modified")
def test_onboarding_complete_message_contract(mock_flag):
    app.dependency_overrides[get_current_context] = override_get_current_context
    
    mock_db = MagicMock(spec=Session)
    mock_db.query.side_effect = smart_query
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with patch("app.services.integrations.health_service.ConnectorHealthService") as MockHealthSvc:
        mock_svc = MockHealthSvc.return_value
        
        # Scenario: Connected
        mock_svc.get_detailed_health.return_value = {
            "email": {"connected": True, "status": "OK", "provider": "google", "error_code": "HEALTHY"}
        }
        
        payload = {
            "capabilities": ["Organize inbox"],
            "working_hours_start": "09:00 AM",
            "working_hours_end": "05:00 PM",
            "meeting_duration": 30,
            "draft_tone": "Professional",
            "vips": [],
            "safe_auto_send": True,
            "always_require_approval": True,
            "approval_required_topics": []
        }
        response = client.post("/aaliyah/onboarding/complete", json=payload)
            
        assert response.status_code == 200
        data = response.json()
        assert "syncing" in data["message"].lower()

        # Scenario: Disconnected
        mock_svc.get_detailed_health.return_value = {
            "email": {"connected": False, "status": "NOT_CONNECTED", "provider": None, "error_code": "NO_INTEGRATION"}
        }
        response = client.post("/aaliyah/onboarding/complete", json=payload)
        assert "not connected" in response.json()["message"].lower()

def test_health_providers_contract():
    app.dependency_overrides[get_current_context] = override_get_current_context
    app.dependency_overrides[get_current_user] = override_get_current_user

    mock_db = MagicMock(spec=Session)
    mock_db.query.side_effect = smart_query
    app.dependency_overrides[get_db] = lambda: mock_db

    with patch("app.services.integrations.health_service.ConnectorHealthService") as MockHealthSvc:
        mock_svc = MockHealthSvc.return_value
        mock_svc.get_detailed_health.return_value = {
            "email": {"connected": True, "status": "OK", "provider": "google", "error_code": "HEALTHY"},
            "calendar": {"connected": False, "status": "NOT_CONNECTED", "provider": None, "error_code": "NO_INTEGRATION"},
            "providers": {} # Added to avoid KeyError
        }
        
        response = client.get("/health/providers")
        assert response.status_code == 200
        assert response.json()["data"]["email_accessible"] is True

# Cleanup
app.dependency_overrides = {}
