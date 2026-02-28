import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

async def test_briefing():
    db = SessionLocal()
    try:
        # Get first workspace
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).first()
        if not workspace:
            print("No workspace found to test.")
            return

        print(f"Testing briefing for workspace: {workspace.id}")
        orchestrator = AaliyahOrchestrator(workspace_id=workspace.id)
        
        # Test generate_morning_briefing
        # This was failing with AttributeError: 'AaliyahOrchestrator' object has no attribute 'db'
        result = await orchestrator.generate_morning_briefing(db)
        print("Briefing generated successfully!")
        print(f"Result Type: {result.get('type')}")
        print(f"Stats: {result.get('stats')}")
        
    except Exception as e:
        print(f"Briefing test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_briefing())
