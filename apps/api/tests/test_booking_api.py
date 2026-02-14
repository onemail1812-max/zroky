
from fastapi.testclient import TestClient
from app.main import app
from app.models.booking_link import BookingLink
from app.database import get_db, SessionLocal
from datetime import datetime
import json

client = TestClient(app)

def test_booking_endpoints():
    db = SessionLocal()
    
    # 1. Create a Booking Link via DB directly (simulating Aaliyah)
    link = BookingLink(
        slug="testslug123",
        workspace_id="ws_test",
        proposed_slots=[{"start": "2026-03-01T10:00:00", "end": "2026-03-01T11:00:00"}],
        recipient_email="guest@example.com",
        subject="Meeting with Guest",
        status="active"
    )
    db.add(link)
    db.commit()
    
    print("\n1. Testing GET /booking/testslug123")
    resp = client.get("/booking/testslug123")
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")
    
    assert resp.status_code == 200
    assert resp.json()["slug"] == "testslug123"
    assert len(resp.json()["proposed_slots"]) == 1

    # 2. Confirm Booking
    print("\n2. Testing POST /booking/testslug123/confirm")
    payload = {
        "selected_slot": {"start": "2026-03-01T10:00:00", "end": "2026-03-01T11:00:00"},
        "booker_email": "guest@example.com", 
        "booker_name": "Guest User"
    }
    resp = client.post("/booking/testslug123/confirm", json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")
    
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    
    # 3. Verify DB update
    db.refresh(link)
    assert link.status == "booked"
    assert link.booked_slot["start"] == "2026-03-01T10:00:00"
    print("✅ Booking verified in DB.")
    
    # Clean up
    db.delete(link)
    db.commit()
    db.close()

if __name__ == "__main__":
    test_booking_endpoints()
