import asyncio
import logging
from unittest.mock import MagicMock, patch, AsyncMock
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailMetadata, NormalizedEmailMessage
from app.database import SessionLocal
from datetime import datetime
import uuid

logging.basicConfig(level=logging.INFO)

async def test_flow():
    workspace_id = "ws_demo_stable_001"
    user_id = "user_demo_001"
    db = SessionLocal()
    
    # CORRECT: Constructor takes workspace_id, NOT db
    orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
    
    # Mock Ingestor to return 1 fresh email
    fake_msg = NormalizedEmailMessage(
        id=f"test-{uuid.uuid4()}",
        workspace_id=workspace_id,
        provider="google",
        metadata=EmailMetadata(
            sender="rahul@example.com",
            subject="Q3 Report Data Request",
            thread_id="thread-abc-123"
        ),
        content="Hi, can you send me the Q3 report data by Friday? Thanks, Rahul.",
        created_at=datetime.utcnow()
    )
    
    print(f"--- Simulating new email arrival: {fake_msg.metadata.subject} ---")
    
    # Mock emitted events
    events = []
    async def mock_emit(event_type, message, payload=None):
        print(f"EVENT EMITTED: {event_type} | {message}")
        events.append({"type": event_type, "message": message, "payload": payload})
    orchestrator._emit = mock_emit

    with patch("app.agents.aaliyah.core.orchestrator.EmailIngestor") as MockIngestor:
        mock_ingestor_instance = MockIngestor.return_value
        mock_ingestor_instance.fetch_incremental = AsyncMock(return_value=[fake_msg])
        mock_ingestor_instance.normalize_message = AsyncMock(side_effect=lambda m, p: m)
        
        with patch("app.agents.aaliyah.core.orchestrator.LabelingRulesEngine") as MockLabelEngine:
            mock_label_instance = MockLabelEngine.return_value
            mock_label_instance.list_upcoming_calendar_events.return_value = []
            
            # Use SimpleNamespace or a real dict/object to avoid MagicMock persistence issues
            from types import SimpleNamespace
            mock_label_instance.evaluate.return_value = SimpleNamespace(
                skip_auto=False,
                labels=[],
                reasons={},
                deadline_at=None,
                suggested_category=None,
                suggested_priority=None
            )
            
            # Run sync - Pass db here
            await orchestrator.sync_inbox(db=db, user_id=user_id, provider="google")
        
    print("\n--- Verifying Database ---")
    from app.models.triaged_email import TriagedEmail
    stored = db.query(TriagedEmail).filter(TriagedEmail.external_message_id == fake_msg.id).first()
    if stored:
        print(f"Email stored in DB: {stored.subject}")
        print(f"Draft exists in metadata: {'draft' in (stored.metadata_json or {})}")
        if stored.metadata_json and 'draft' in stored.metadata_json:
            print(f"Draft Body: {stored.metadata_json['draft']['body'][:100]}...")
    else:
        print("ERROR: Email not found in DB")

    print("\n--- Summary of Events ---")
    for e in events:
        if e['type'] == 'assistant_message':
            print(f"PROACTIVE NOTIFICATION: {e['message']}")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_flow())
