from datetime import datetime
from app.models.email import EmailMessage
from app.api.routes.inbox import sync_all_inboxes
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

def test_manual_sync():
    """
    Test script to run the sync logic manually.
    """
    engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # Needs a real workspace ID to test
    workspace_id = "test-workspace-id" # REPLACE ME
    
    try:
        print("Starting sync...")
        sync_all_inboxes(db, workspace_id)
        print("Sync complete.")
        
        # Verify
        count = db.query(EmailMessage).count()
        print(f"Total emails: {count}")
        
        if count > 0:
            first = db.query(EmailMessage).first()
            print(f"Sample: {first.subject} - {first.body_cleaned[:50]}...")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_manual_sync()
