import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

# Standard model registration
import app.models 
from app.database import Base, get_db
from app.main import app
from app.models.booking_link import BookingLink
from app.models.workspace import Workspace
from app.agents.aaliyah.core.scheduling.booking_manager import BookingManager

# Use StaticPool for in-memory SQLite to persist data across multiple connections
engine = create_engine(
    "sqlite:///:memory:", 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
# Re-initialize client with overrides
client = TestClient(app)
client.headers["X-Zroky-CSRF"] = "test-token"

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # No drop_all here to avoid issues with StaticPool if needed, 
    # but usually fine to drop.
    Base.metadata.drop_all(bind=engine)

def test_booking_manager_create_and_confirm():
    db = TestingSessionLocal()
    ws = Workspace(id="ws_1", name="Test", slug="test-ws", owner_id="u1")
    db.add(ws)
    db.commit()
    
    manager = BookingManager(db, "ws_1")
    
    # Simple dict mock for slot
    class MockSlot:
        def __init__(self):
            self.start = datetime.now()
            self.end = datetime.now() + timedelta(hours=1)
            self.duration_minutes = 60
    
    mock_slot = MockSlot()
    
    link = manager.create_link(slots=[mock_slot], recipient_email="guest@test.com", subject="Test Meet")
    assert link.slug is not None
    assert link.status == "active"
    
    slot_to_book = {"start": mock_slot.start.isoformat(), "end": mock_slot.end.isoformat()}
    updated = manager.confirm_booking(link.slug, slot_to_book)
    assert updated.status == "booked"
    db.close()

def test_get_booking_page_api():
    # Ensure data is in the DB
    db = TestingSessionLocal()
    link = BookingLink(
        id="blink-1",
        slug="api-test",
        workspace_id="ws_1",
        proposed_slots=[{"start": "2026-03-01T10:00:00", "end": "2026-03-01T11:00:00"}],
        status="active"
    )
    db.add(link)
    db.commit()
    db.close()
    
    response = client.get("/booking/api-test")
    assert response.status_code == 200
    assert response.json()["slug"] == "api-test"

@patch("app.services.integrations.token_store.get_valid_token")
def test_confirm_booking_api(mock_get_token):
    db = TestingSessionLocal()
    link = BookingLink(
        id="blink-2",
        slug="confirm-test",
        workspace_id="ws_1",
        proposed_slots=[{"start": "2026-03-01T10:00:00", "end": "2026-03-01T11:00:00"}],
        status="active"
    )
    db.add(link)
    db.commit()
    db.close()
    
    mock_get_token.return_value = None 
    
    payload = {
        "selected_slot": {"start": "2026-03-01T10:00:00", "end": "2026-03-01T11:00:00"},
        "booker_email": "guest@test.com",
        "booker_name": "Guest"
    }
    response = client.post("/booking/confirm-test/confirm", json=payload)
    assert response.status_code == 200
