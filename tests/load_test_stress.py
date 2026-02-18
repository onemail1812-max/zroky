
import asyncio
import time
import httpx
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.triaged_thread import TriagedThread
from app.models.workspace import Workspace
from app.models.membership import Membership, MembershipRole
from app.security import create_access_token

# Configuration
WORKSPACE_ID = "ws_load_test_001"
USER_ID = "user_load_test_001"
BASE_URL = "http://localhost:8000"
THREAD_COUNT = 10000
CONCURRENT_REQUESTS = 100

def setup_db(db: Session):
    print("Setting up DB...")
    
    # Hotfix: Ensure columns exist (dev environment)
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE workspaces ADD COLUMN settings_json TEXT"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE workspaces ADD COLUMN style_profile_json TEXT"))
        db.commit()
    except Exception:
        db.rollback()

    # 1. Ensure User/Workspace exists
    ws = db.query(Workspace).filter(Workspace.id == WORKSPACE_ID).first()
    if not ws:
        ws = Workspace(id=WORKSPACE_ID, name="Load Test Workspace", owner_id=USER_ID, slug="load-test")
        db.add(ws)
    
    mem = db.query(Membership).filter(Membership.user_id == USER_ID, Membership.workspace_id == WORKSPACE_ID).first()
    if not mem:
        mem = Membership(id=str(uuid.uuid4()), user_id=USER_ID, workspace_id=WORKSPACE_ID, role=MembershipRole.ADMIN)
        db.add(mem)
        
    db.commit()

    # 2. Check Thread Count
    count = db.query(TriagedThread).filter(TriagedThread.workspace_id == WORKSPACE_ID).count()
    if count >= THREAD_COUNT:
        print(f"DB already has {count} threads. Skipping seed.")
        return

    # 3. Seed Threads
    missing = THREAD_COUNT - count
    print(f"Seeding {missing} threads...")
    
    batch = []
    now = datetime.utcnow()
    for i in range(missing):
        idx = count + i
        t = TriagedThread(
            id=str(uuid.uuid4()),
            workspace_id=WORKSPACE_ID,
            provider="google",
            external_thread_id=f"th_load_{idx}",
            sender=f"sender_{idx}@example.com",
            subject=f"Load Test Thread {idx}",
            snippet=f"This is a snippet for thread {idx}. It has some content.",
            category="Inbox" if idx % 5 == 0 else "Cleaned", # Mix categories
            priority="High" if idx % 10 == 0 else "Medium",
            is_noise=(idx % 5 != 0),
            last_received_at=now
        )
        batch.append(t)
        if len(batch) >= 1000:
            db.bulk_save_objects(batch)
            db.commit()
            print(f"Seeded {idx + 1}/{THREAD_COUNT}")
            batch = []
            
    if batch:
        db.bulk_save_objects(batch)
        db.commit()
    print("Seeding complete.")

def get_auth_token():
    return create_access_token(data={"sub": USER_ID, "workspace_id": WORKSPACE_ID})

async def run_load_test():
    token = get_auth_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Workspace-ID": WORKSPACE_ID
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Warmup
        print("Warming up...")
        await client.get(f"{BASE_URL}/inbox/counts", headers=headers)
        
        print(f"Starting load test: {CONCURRENT_REQUESTS} concurrent requests...")
        start_time = time.time()
        
        tasks = []
        for i in range(CONCURRENT_REQUESTS):
            # Mix of endpoints
            if i % 2 == 0:
                tasks.append(client.get(f"{BASE_URL}/api/v1/inbox/threads?limit=20&page=1", headers=headers))
            else:
                tasks.append(client.get(f"{BASE_URL}/api/v1/inbox/counts", headers=headers))
                
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        duration = end_time - start_time
        rps = CONCURRENT_REQUESTS / duration
        
        valid_responses = [r for r in responses if isinstance(r, httpx.Response)]
        success_count = len([r for r in valid_responses if r.status_code == 200])
        failures = len(responses) - success_count
        
        print(f"--- Results ---")
        print(f"Total Requests: {CONCURRENT_REQUESTS}")
        print(f"Success: {success_count}")
        print(f"Failures: {failures}")
        print(f"Duration: {duration:.4f}s")
        print(f"RPS: {rps:.2f}")
        
        if failures > 0:
             print("Sample failure:", [r for r in valid_responses if r.status_code != 200][:1])

if __name__ == "__main__":
    # Robust DB connection for test script
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import os
    
    # Force absolute path to avoid CWD confusion
    db_path = r"d:\Zroky\apps\api\zroky.db"
    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        exit(1)
        
    db_url = f"sqlite:///{db_path}"
    print(f"Connecting to {db_url}...")
    
    engine = create_engine(db_url)
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = TestSessionLocal()
    try:
        setup_db(db)
        asyncio.run(run_load_test())
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
