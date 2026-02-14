
import asyncio
import sys
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

# Add path
sys.path.append(".")

from app.services.aaliyah.orchestrator import AaliyahOrchestrator
from app.services.aaliyah.ingestion.email_ingestor import NormalizedEmailMessage, EmailMetadata
from app.database import SessionLocal
from app.models.workspace import Workspace

async def run_simulation():
    db = SessionLocal()
    workspace_id = "ws_sim_auto"
    user_id = "user_sim_01"
    
    # 1. Setup Workspace with Auto-Send ON
    print("1. Setting up Simulation Workspace...")
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        ws = Workspace(id=workspace_id, name="Simulation WS", slug="sim-ws", owner_id=user_id)
        db.add(ws)
    
    # Enable Auto-Send
    settings = ws.settings_json or {}
    if "aaliyah" not in settings:
        settings["aaliyah"] = {}
    
    settings["aaliyah"]["auto_send_enabled"] = True
    settings["aaliyah"]["signature"] = "- SimBot"
    settings["aaliyah"]["draft_tone"] = "direct"
    
    ws.settings_json = settings
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(ws, "settings_json")
    db.commit()

    # 2. Prepare Mock Email
    print("2. Mocking Ingestor Data...")
    mock_msg = NormalizedEmailMessage(
        id=f"msg_sim_{int(datetime.now().timestamp())}",
        workspace_id=workspace_id,
        provider="google", # Must be google or microsoft to pass validator or use "unknown" if validator allows
        source="email",
        content="Is the project update ready? need it ASAP.",
        metadata=EmailMetadata(
            sender="boss@sim.com", 
            subject="Urgent Update", 
            thread_id="th_sim_01"
        ),
        is_read=False,
        created_at=datetime.now(timezone.utc)
    )
    
    # 3. Run Sync with Mocks
    print("3. Running Orchestrator Sync...")
    
    # We patch EmailIngestor to return our mock message
    # We patch ActionExecutor to avoid real API calls but verify "sending" happens
    # We patch Brain in ALL locations where it is imported because modules are already loaded
    
    with patch("app.services.aaliyah.orchestrator.EmailIngestor") as MockIngestor, \
         patch("app.services.aaliyah.orchestrator.ActionExecutor") as MockExecutor, \
         patch("app.services.aaliyah.orchestrator.Brain") as MockOrchBrain, \
         patch("app.services.aaliyah.triage_service.Brain") as MockTriageBrain, \
         patch("app.services.aaliyah.drafting.Brain") as MockDraftingBrain, \
         patch("app.services.aaliyah.orchestrator.LabelingRulesEngine") as MockLRE:

        # Mock Ingestor
        mock_ingestor_instance = MockIngestor.return_value
        mock_ingestor_instance.fetch_and_normalize = AsyncMock(return_value=[mock_msg])

        # Mock Executor
        mock_exec_instance = MockExecutor.return_value
        mock_exec_instance.apply_label = AsyncMock(return_value={"status": "applied", "audit_id": "aud_1"})
        mock_exec_instance.send_draft = AsyncMock(return_value={"status": "sent", "sent_message_id": "sent_sim_1"})

        # Unified Brain Mock
        unified_brain = MagicMock()
        unified_brain.think = AsyncMock()
        unified_brain.think.side_effect = [
            # 1. Triage call (from TriageService)
            MagicMock(content='{"category": "Work", "priority": "High", "confidence": 0.9, "reasoning": "Urgent request", "is_noise": false}'),
            # 2. Drafting call (from DraftingAgent)
            MagicMock(content='{"action": "reply", "subject": "Re: Urgent Update", "body": "Working on it.\\n- SimBot", "rationale": "High priority request"}'),
            # 3. Critic call (from DraftingAgent - optional)
            MagicMock(content='{"must_refine": false}'),
        ]
        
        # Apply unified mock to all patches
        MockOrchBrain.return_value = unified_brain
        MockTriageBrain.return_value = unified_brain
        MockDraftingBrain.return_value = unified_brain

        # Mock Labeling Rules
        mock_lre_instance = MockLRE.return_value
        mock_lre_instance.list_upcoming_calendar_events.return_value = []
        mock_lre_instance.list_recent_thread_history.return_value = []
        # Force "Awaiting Reply" label to trigger drafting
        mock_lre_instance.decide_labels.return_value = MagicMock(
            labels=["Awaiting Reply", "Urgent"],
            reasons={"Awaiting Reply": "Question detected", "Urgent": "ASAP detected"},
            skip_auto=False,
            override_applied=False
        )
        
        # Instantiate Orchestrator
        orch = AaliyahOrchestrator(workspace_id)
        
        # EXECUTE
        result = await orch.sync_inbox(db, user_id=user_id)
        
        # VERIFY
        print(f"   Synced Items: {result['count']}")
        if result['count'] > 0:
            item = result["items"][0]
            print(f"   Category: {item['category']}")
            print(f"   Labels: {item.get('labels')}")
            print(f"   Draft Generated: {item.get('has_draft')}")
            print(f"   Draft Status: {item.get('draft_status')}")
            
            if item.get("has_draft") and item.get("draft_status") == "sent":
                print("\n✅ SIMULATION SUCCESS: Logic flow verified (Triage -> Draft -> Auto-Send).")
                # Verify send_draft was called
                mock_exec_instance.send_draft.assert_called_once()
            else:
                 print("\n❌ SIMULATION FAILURE: Draft was not sent.")
        else:
             print("\n❌ SIMULATION FAILURE: No items synced.")

    db.close()

if __name__ == "__main__":
    asyncio.run(run_simulation())
