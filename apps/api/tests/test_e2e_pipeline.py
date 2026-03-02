import pytest
import json
import asyncio
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, AsyncMock

from app.database import Base
from app.models.workspace import Workspace
from app.models.triaged_email import TriagedEmail
from app.models.draft import Draft
from app.models.job import Job, JobStatus
from app.core.queue import JobType
from app.agents.aaliyah.core.ingestion.email_ingestor import NormalizedEmailMessage
from app.agents.aaliyah.core.triage_service import TriageResult
from app.workers.local_sync import process_sync_provider, process_ai_triage, process_drafting

import app.services.aaliyah.relationship_manager
import app.services.aaliyah.vision_service
import app.agents.aaliyah.core.action_executor
import app.agents.aaliyah.core.drafting

# Setup mini test DB
TEST_DB_URL = "sqlite:///./e2e_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # We must patch SessionLocal inside the workers to supply fresh sessions targeting the test DB
    with patch("app.workers.local_sync.SessionLocal", side_effect=TestingSessionLocal):
        with patch("app.core.queue.SessionLocal", side_effect=TestingSessionLocal):
            yield session
            
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_e2e_pipeline(db_session):
    """
    Simulates the 3-stage background pipeline:
    1. Discovery (process_sync_provider)
    2. Triage (process_ai_triage)
    3. Drafting (process_drafting)
    """
    workspace_id = "ws_e2e_test"
    db_session.add(Workspace(id=workspace_id, owner_id="user_1", name="Test WS", slug="test-ws", settings_json={}))
    db_session.commit()

    # ==========================================
    # STAGE 1: Discovery
    # ==========================================
    mock_msg = NormalizedEmailMessage(
        id="ext_msg_1",
        workspace_id=workspace_id,
        provider="gmail",
        content="Could you send the Q3 report?",
        created_at=datetime.now(timezone.utc),
        metadata={
            "thread_id": "thread_1",
            "sender": "boss@company.com",
            "subject": "Q3 Report",
            "headers": {}
        }
    )

    with patch("app.workers.local_sync.EmailIngestor") as MockIngestor:
        instance = MockIngestor.return_value
        instance.fetch_incremental = AsyncMock(return_value=([mock_msg], []))

        # We also mock Orchestrator to prevent websocket emits during testing
        with patch("app.workers.local_sync.AaliyahOrchestrator") as MockOrc:
            MockOrc.return_value.emit_status = AsyncMock()
            MockOrc.return_value.flush_communication = AsyncMock()
            await process_sync_provider({"workspace_id": workspace_id, "provider": "gmail"})

    # Verify Discovery enqueued AI_TRIAGE
    triage_job = db_session.query(Job).filter(Job.type == JobType.AI_TRIAGE.value).first()
    assert triage_job is not None, "Discovery failed to enqueue AI_TRIAGE job"
    assert triage_job.status == JobStatus.PENDING

    # ==========================================
    # STAGE 2: AI Triage
    # ==========================================
    triage_payload = json.loads(triage_job.payload_json)
    
    with patch("app.workers.local_sync.SmartTriageClassifier") as MockClassifier:
        classifier_instance = MockClassifier.return_value
        classifier_instance.classify = AsyncMock(return_value=TriageResult(
            category="Priority",
            is_noise=False,
            priority="High",
            confidence=0.95,
            reasoning="Important report request.",
            language="en",
            can_draft=True,
            needs_clarity=False,
            is_vip=True
        ))
        
        with patch("app.workers.local_sync.AaliyahOrchestrator") as MockOrc:
            MockOrc.return_value.emit_status = AsyncMock()
            MockOrc.return_value.broadcast_updates = AsyncMock()
            with patch("app.services.aaliyah.relationship_manager.RelationshipManager") as MockRM:
                MockRM.return_value.analyze_relationship = AsyncMock(return_value="Prior interactions were positive.")
                from unittest.mock import MagicMock
                MockRM.return_value.get_relationship_summary = MagicMock(return_value="Summary")
                with patch("app.services.aaliyah.vision_service.VisionService") as MockVision:
                    MockVision.return_value.analyze_attachment = AsyncMock(return_value="test analysis")
                    with patch("app.agents.aaliyah.core.action_executor.ActionExecutor") as MockAction:
                        MockAction.return_value.archive = AsyncMock()
                        await process_ai_triage(triage_payload)

    # Verify Triage updated the TriagedEmail
    triage_entry = db_session.query(TriagedEmail).filter_by(id=triage_payload["triaged_id"]).first()
    assert triage_entry is not None
    assert triage_entry.category == "Priority"
    assert triage_entry.priority == "High", "VIP status should escalate priority to High"
    
    # Verify Triage enqueued PROCESS_DRAFT
    draft_job = db_session.query(Job).filter(Job.type == JobType.PROCESS_DRAFT.value).first()
    assert draft_job is not None, "Triage failed to enqueue PROCESS_DRAFT job"

    # ==========================================
    # STAGE 3: Auto-Drafting
    # ==========================================
    draft_payload = json.loads(draft_job.payload_json)

    with patch("app.agents.aaliyah.core.drafting.DraftingAgent") as MockDrafter:
        drafter_instance = MockDrafter.return_value
        from app.agents.aaliyah.core.drafting import DraftResponse
        mock_draft_result = DraftResponse(
            subject="Re: Q3 Report",
            body="Here is the Q3 report attached.",
            rationale="Standard report response.",
            intent="reply",
            risk_labels=[],
            tone_tags=["Professional", "Concise"]
        )
        drafter_instance.generate_draft = AsyncMock(return_value=mock_draft_result)
        with patch("app.workers.local_sync.AaliyahOrchestrator") as MockOrc:
            MockOrc.return_value.emit_status = AsyncMock()
            MockOrc.return_value.broadcast_updates = AsyncMock()
            await process_drafting(draft_payload)
            drafter_instance.generate_draft.assert_called_once()

    # Verify Draft was cached in metadata
    draft_entry = db_session.query(TriagedEmail).filter_by(id=triage_payload["triaged_id"]).first()
    assert draft_entry is not None
    db_session.refresh(draft_entry)
    print(f"DEBUG METADATA: {draft_entry.metadata_json}")
    assert "draft" in draft_entry.metadata_json, "Drafting stage failed to store draft in metadata"
    assert draft_entry.metadata_json["draft"]["body"] == "Here is the Q3 report attached."
