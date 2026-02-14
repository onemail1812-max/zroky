
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.membership import Membership
from app.models.workspace import Workspace

def create_event():
    db = SessionLocal()
    
    # Event 1: Tomorrow Strategy Session
    start = datetime.now(timezone.utc) + timedelta(days=1, hours=2)
    end = start + timedelta(hours=1)
    
    target_ws = "ws_demo_stable_001"
    
    # Clean up excessive memberships/workspaces
    mems = db.query(Membership).filter(Membership.user_id == "user_demo_001").all()
    for m in mems:
        if m.workspace_id != target_ws:
            db.delete(m) # Delete membership
            ws = db.query(Workspace).filter(Workspace.id == m.workspace_id).first()
            if ws: db.delete(ws) # Delete empty workspace
            
    # Ensure target workspace exists
    from app.models.membership import MembershipRole
    import uuid
    
    ws = db.query(Workspace).filter(Workspace.id == target_ws).first()
    if not ws:
        ws = Workspace(id=target_ws, name="Stable Demo Workspace", slug="demo-stable", owner_id="user_demo_001")
        db.add(ws)
    
    mem = db.query(Membership).filter(Membership.user_id == "user_demo_001", Membership.workspace_id == target_ws).first()
    if not mem:
        mem = Membership(id=str(uuid.uuid4()), user_id="user_demo_001", workspace_id=target_ws, role=MembershipRole.ADMIN)
        db.add(mem)
        
    db.commit()
    print(f"Cleaned up memberships. Using {target_ws}")

    evt = CalendarEventSnapshot(
        id="evt_upcoming_001",
        workspace_id=target_ws,
        title="Strategy Session with OpenAI",
        start_at=start,
        end_at=end,
        organizer="sam.altman@openai.com",
        provider="google",
        external_event_id="ext_upcoming_001",
        metadata_json={
            "attendees": ["user@zroky.com", "ilya@openai.com"],
            "meeting_prep": {
                "summary": "High-stakes strategic alignment meeting regarding AGI adherence.",
                "people_involved": ["Sam Altman", "Ilya Sutskever"],
                "recommendation": "Listen more than talk. Focus on safety alignment.",
                "talking_points": [
                    "Discuss Zroky's safety protocols.",
                    "Propose joint research initiative.",
                    "Ask about GPU allocation."
                ]
            }
        }
    )
    
    # Check if exists
    existing = db.query(CalendarEventSnapshot).filter_by(id="evt_upcoming_001").first()
    if existing:
        db.delete(existing)
        db.commit()
        
    db.add(evt)
    db.commit()
    print(f"Created event: {evt.title} at {evt.start_at}")
    db.close()

if __name__ == "__main__":
    create_event()
