import asyncio
import sys
from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

async def diagnostic_check():
    workspace_id = "ws_demo_stable_001"
    print(f"--- Diagnostic Connection Check for {workspace_id} ---")
    
    db = SessionLocal()
    try:
        orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
        
        print("1. Checking database record...")
        from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
        ints = db.query(Integration).filter(Integration.workspace_id == workspace_id).all()
        for i in ints:
            print(f"   - Found {i.provider}: status={i.status}, has_token={i.token_encrypted is not None}")
            
        print("\n2. Attempting live provider sync (sample)...")
        # trigger_sync is the most comprehensive check
        # But we'll just try to list inbox which verifies token decryption and provider reachability
        try:
            res = await orchestrator.list_inbox(db, limit=3)
            items = res.get("items", [])
            print(f"   - SUCCESS: Found {len(items)} items in live triage.")
            for item in items:
                print(f"     * [{item.get('received_at')}] From: {item.get('sender')} - {item.get('subject')}")
        except Exception as e:
            print(f"   - FAIL: Live check failed: {e}")
            import traceback
            traceback.print_exc()

    finally:
        db.close()
        print("\n--- Diagnostic Complete ---")

if __name__ == "__main__":
    asyncio.run(diagnostic_check())
