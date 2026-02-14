import logging
import sys
import io
import uuid
from datetime import datetime

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from app.database import engine as db_engine, SessionLocal
from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    db = SessionLocal()
    
    # 1. Get Workspace or Create Dummy
    workspace = db.query(Workspace).first()
    if not workspace:
        logger.info("No workspace found. Creating dummy user and workspace for testing...")
        
        # Create Dummy User
        from app.models.user import User
        user_id = str(uuid.uuid4())
        user = User(id=user_id, email="test@example.com", hashed_password="dummy_hash", is_active=True)
        db.add(user)
        
        # Create Dummy Workspace
        workspace_id = str(uuid.uuid4())
        workspace = Workspace(id=workspace_id, name="Test Workspace", slug="test-workspace", owner_id=user_id)
        db.add(workspace)
        
        # Create Membership
        from app.models.membership import Membership, MembershipRole
        membership = Membership(id=str(uuid.uuid4()), workspace_id=workspace_id, user_id=user_id, role=MembershipRole.ADMIN)
        db.add(membership)
        
        db.commit()
        logger.info(f"Created Test User ({user_id}) and Workspace ({workspace_id})")
    else:
        workspace_id = workspace.id
        logger.info(f"Using Existing Workspace: {workspace.name} ({workspace_id})")

    # 2. Inject Email with Draft
    email_id = str(uuid.uuid4())
    draft = {
        "subject": "Re: Partnership Opportunity",
        "body": "Hi Sarah,\n\nThanks for reaching out. We'd be happy to discuss a partnership. I'm available next Tuesday at 2pm or Wednesday at 10am to chat.\n\nBest,\nAaliyah",
        "rationale": "Responded to partnership inquiry with availability slots.",
        "status": "generated"
    }
    
    email = TriagedEmail(
        id=email_id,
        workspace_id=workspace_id,
        provider="gcp",
        external_message_id=f"msg_{datetime.now().timestamp()}",
        thread_id=f"thread_{datetime.now().timestamp()}",
        sender="sarah@techpartners.io",
        subject="Partnership Opportunity",
        snippet="Hi Team, We're interested in partnering with Zroky. let us know if you have time to chat.",
        received_at=datetime.utcnow(),
        category="Work",
        priority="High",
        is_read=False,
        confidence="0.95",
        reasoning="Business opportunity detected.",
        metadata_json={
            "labels": ["Awaiting Reply", "High Priority"],
            "label_reasons": {"Awaiting Reply": "Question asking for time", "High Priority": "Keywords detected"},
            "draft": draft
        }
    )
    
    db.add(email)
    db.commit()
    logger.info(f"✅ Injected Email with Draft: {email_id}")
    logger.info("Check '/settings/aaliyah' in the browser to see the 'Draft Prepared' card.")
    
    db.close()

if __name__ == "__main__":
    main()
