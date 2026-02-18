import asyncio
import sys, os
# Add current directory to path so we can import app modules
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

async def run_debug():
    db = SessionLocal()
    try:
        # Find a workspace ID.
        from app.models.workspace import Workspace
        ws = db.query(Workspace).first()
        if not ws:
            print("No workspace found!")
            return

        print(f"Testing list_inbox for Workspace: {ws.id} ({ws.name})")
        
        orch = AaliyahOrchestrator(ws.id)
        try:
            res = await orch.list_inbox(db, limit=10)
            print("SUCCESS!")
            print(f"Items: {len(res['items'])}")
            if len(res['items']) > 0:
                print("Sample item:", res['items'][0])
        except Exception as e:
            print("❌ FAILURE in list_inbox:")
            import traceback
            traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_debug())
