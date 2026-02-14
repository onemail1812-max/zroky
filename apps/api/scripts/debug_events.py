
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.user import User
from app.models.membership import Membership

def check():
    db = SessionLocal()
    
    users = db.query(User).all()
    print(f"Users: {len(users)}")
    for u in users:
        print(f" - {u.id} ({u.email})")
        
    mems = db.query(Membership).all()
    print(f"Memberships: {len(mems)}")
    for m in mems:
        print(f" - User: {m.user_id}, WS: {m.workspace_id}")
    
    # ... events ...
    events = db.query(CalendarEventSnapshot).all()
    print(f"Total events: {len(events)}")
    for e in events:
        print(f" - {e.id}: {e.title} ({e.start_at}) ws={e.workspace_id}")
    
    
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=48)
    
    print(f"Current UTC: {now}")
    
    # Try exact query from routes.py
    events_route = (
        db.query(CalendarEventSnapshot)
        .filter(
            CalendarEventSnapshot.workspace_id == "ws_demo_001",
            CalendarEventSnapshot.start_at >= now,
            CalendarEventSnapshot.start_at <= future,
            CalendarEventSnapshot.is_cancelled == False
        )
        .all()
    )
    print(f"Route query match: {len(events_route)}")
    for e in events_route:
        print(f" - Found: {e.title} (cancelled={e.is_cancelled})")

    # Check why failed if 0
    if len(events_route) == 0:
        print("Debugging failure...")
        all_future = db.query(CalendarEventSnapshot).filter(CalendarEventSnapshot.start_at >= now).all()
        for e in all_future:
            print(f" - Candidate: {e.title}, ws={e.workspace_id}, start={e.start_at}, cancelled={e.is_cancelled}")
            if e.workspace_id != "ws_demo_001": print("   -> Workspace mismatch")
            if e.start_at > future: print("   -> Too far in future")
            if e.is_cancelled: print("   -> Cancelled")
            
    db.close()

if __name__ == "__main__":
    check()
