"""Emit a test email arrival event directly via EventBus."""
import sys
sys.path.insert(0, '.')
import asyncio
from app.database import SessionLocal
from app.models.workspace import Workspace
from app.agents.aaliyah.core.live_feed import LiveEvent, event_bus
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

async def main():
    db = SessionLocal()
    # Get any workspace
    ws = db.query(Workspace).first()
    if not ws:
        print("No workspace found")
        return
    
    workspace_id = ws.id
    db.close()

    print(f"Emitting to workspace: {workspace_id}")
    
    # Use the orchestrator to emit so it persists correctly too
    orc = AaliyahOrchestrator(workspace_id)
    await orc._emit(
        event_type="new_email_arrival",
        message="",
        payload={
            "id": "demo-email-999",
            "sender_name": "Satya Nadella",
            "sender": "satya@microsoft.com",
            "subject": "Partnership Opportunity with Zroky",
            "snippet": "I saw the amazing work you're doing with Aaliyah and I'd love to discuss integrating it into our enterprise suite. Let's schedule a call next week.",
            "actions": [{"label": "Draft Reply", "action_id": "draft_123"}, {"label": "Archive", "action_id": "archive_123"}]
        }
    )
    print("Emitted successfully!")

if __name__ == "__main__":
    asyncio.run(main())
