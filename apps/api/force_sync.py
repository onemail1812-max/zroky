import asyncio
from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

async def force_sync():
    db = SessionLocal()
    workspace_id = "ws_demo_stable_001"
    user_id = "user_demo_001"
    
    print("Initializing Orchestrator...")
    orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
    
    print("Forcing Inbox Sync...")
    try:
        await orchestrator.sync_inbox(db=db, user_id=user_id, provider="google")
        print("Inbox sync complete.")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(force_sync())
