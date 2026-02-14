
import sys
import os
import asyncio
from datetime import datetime, timedelta, timezone

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.agents.aaliyah.core.meeting_prep import MeetingPrepAgent

async def test_scan():
    db = SessionLocal()
    ws_id = "ws_demo_stable_001"
    
    # Create event WITHOUT prep
    start = datetime.now(timezone.utc) + timedelta(hours=2)
    evt_id = "evt_scan_test_001"
    
    existing = db.query(CalendarEventSnapshot).filter_by(id=evt_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    
    evt = CalendarEventSnapshot(
        id=evt_id,
        workspace_id=ws_id,
        title="Unprepared Meeting with VCs",
        start_at=start,
        end_at=start + timedelta(hours=1),
        organizer="investor@vc.com",
        provider="google",
        external_event_id="ext_scan_001",
        metadata_json={} # Empty metadata
    )
    db.add(evt)
    db.commit()
    print(f"Created unprepared event: {evt.title}")
    
    # Run scan
    agent = MeetingPrepAgent(db, ws_id)
    print("Running scan_upcoming_meetings...")
    count = await agent.scan_upcoming_meetings()
    print(f"Scanned and briefed: {count} events.")
    
    # Verify
    db.expire_all()
    e = db.query(CalendarEventSnapshot).filter_by(id=evt_id).first()
    if e and e.metadata_json and "meeting_prep" in e.metadata_json:
        prep = e.metadata_json["meeting_prep"]
        print("SUCCESS: Meeting prep found!")
        print(f"Summary: {prep.get('summary')}")
    else:
        print("FAILURE: No meeting prep found.")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(test_scan())
