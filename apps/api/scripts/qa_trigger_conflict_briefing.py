import logging
import sys
import io
import uuid
from datetime import datetime, timedelta, timezone

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.database import SessionLocal
from app.models.calendar_event_snapshot import CalendarEventSnapshot, CalendarConflict
from app.models.workspace import Workspace
from app.services.aaliyah.meeting_prep import MeetingPrepAgent
import asyncio

def main():
    db = SessionLocal()
    
    # 1. Get Workspace or Create Dummy
    workspace = db.query(Workspace).first()
    if not workspace:
        logger.error("No workspace found. Please log in or create a user first.")
        # Create Dummy
        from app.models.user import User
        if not db.query(User).filter_by(email="test@example.com").first():
             user_id = str(uuid.uuid4())
             user = User(id=user_id, email="test@example.com", hashed_password="dummy", is_active=True)
             db.add(user)
             ws_id = str(uuid.uuid4())
             ws = Workspace(id=ws_id, name="Test Workspace", owner_id=user_id)
             db.add(ws)
             db.commit()
             workspace = ws
        else: 
             return

    workspace_id = workspace.id
    logger.info(f"Using Workspace: {workspace_id}")

    # 2. Create Two Conflicting Events
    now = datetime.now(timezone.utc)
    start_time = now + timedelta(hours=2)
    end_time = start_time + timedelta(hours=1)

    event_a_id = str(uuid.uuid4())
    event_b_id = str(uuid.uuid4())

    event_a = CalendarEventSnapshot(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        provider="google",
        external_event_id=event_a_id,
        title="Strategy Review with CEO",
        organizer="ceo@company.com",
        start_at=start_time,
        end_at=end_time,
        is_all_day=False,
        metadata_json={}
    )
    
    event_b = CalendarEventSnapshot(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        provider="google",
        external_event_id=event_b_id,
        title="Deployment Sync with Engineering",
        organizer="eng-lead@company.com",
        start_at=start_time, # Same start time
        end_at=end_time,
        is_all_day=False,
        metadata_json={}
    )

    db.add(event_a)
    db.add(event_b)
    
    # 3. Create Conflict Record
    conflict = CalendarConflict(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        event_a_id=event_a_id,
        event_b_id=event_b_id,
        conflict_type="overlap",
        conflict_minutes="60",
        explain="Double booked: CEO review and Engineering sync.",
        metadata_json={}
    )
    db.add(conflict)
    db.commit()
    logger.info(f"✅ Injected Conflict: {conflict.id}")

    # 3.5 Inject Email Context
    from app.models.triaged_email import TriagedEmail
    
    email_context = TriagedEmail(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        provider="google",
        external_message_id=f"msg_{uuid.uuid4()}",
        thread_id=f"th_{uuid.uuid4()}",
        sender="ceo@company.com", 
        subject="Re: Strategy Review",
        snippet="This review is critical. We must decide on the Q3 budget.",
        received_at=datetime.utcnow(),
        category="Work",
        priority="High",
        is_read=False
    )
    db.add(email_context)
    db.commit()
    logger.info(f"✅ Injected Context Email from CEO: {email_context.snippet}")

    # 4. Run Agent
    logger.info("Running Meeting Prep Agent...")
    agent = MeetingPrepAgent(db, workspace_id)
    
    # We need to mock the brain if no API key, but let's try running it.
    # If it fails, that's fine, we see the error.
    try:
        count = asyncio.run(agent.scan_and_brief())
        logger.info(f"✅ Agent briefed {count} conflicts.")
        
        # 5. Verify
        updated = db.query(CalendarConflict).filter(CalendarConflict.id == conflict.id).first()
        if updated and updated.metadata_json.get("briefing"):
            b = updated.metadata_json["briefing"]
            logger.info(f"Briefing Generated!")
            logger.info(f"Recommendation: {b.get('recommendation')}")
        else:
            logger.error("Briefing verification failed.")

    except Exception as e:
        logger.error(f"Agent execution failed: {e}")

    db.close()

if __name__ == "__main__":
    main()
