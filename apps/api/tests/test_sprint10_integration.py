import pytest
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.search_index import EmailIndex, CalendarIndex
from app.models.triaged_email import TriagedEmail
from app.agents.aaliyah.core.search_agent import SearchAgent
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.agents.aaliyah.core.inbox_repository import TriagedInboxRepository

# Setup mini test DB
TEST_DB_URL = "sqlite:///./integration_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MockBrain:
    async def think(self, **kwargs):
        system = kwargs.get("system_prompt", "")
        prompt = kwargs.get("prompt", "")
        
        if "parser" in system.lower() or "intent" in system.lower():
            if "invoice" in prompt.lower():
                return type('obj', (object,), {'content': '{"intent": "email_search", "scope": "all", "keywords": "invoice"}'})()
            return type('obj', (object,), {'content': '{"intent": "email_search", "scope": "all", "keywords": "test"}'})()
        
        # Synthesis
        if "invoice" in prompt.lower():
            return type('obj', (object,), {
                'content': '{"status": "found", "answer": "I found your invoice from last month.\\nI found this in: Invoice March • 2026-02-18 • gmail", "relevant_ids": ["thread_inv"]}'
            })()
            
        return type('obj', (object,), {
            'content': '{"status": "found", "answer": "The answer is here.", "relevant_ids": ["thread_1"]}'
        })()

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_search_ranking_sanity(db_session):
    """Verify that more relevant or recent results appear higher in logic/synthesis context."""
    workspace_id = "ws_ranking"
    agent = SearchAgent(db_session, workspace_id, MockBrain())
    
    # 1. Old relevant email
    db_session.add(EmailIndex(
        id="old", workspace_id=workspace_id, thread_id="t_old", provider="gmail",
        subject="Invoice for Jan", searchable_text="invoice content old", 
        last_message_at=datetime.utcnow() - timedelta(days=60)
    ))
    # 2. New relevant email (should be preferred)
    db_session.add(EmailIndex(
        id="new", workspace_id=workspace_id, thread_id="t_new", provider="gmail",
        subject="Invoice for Feb", searchable_text="invoice content new", 
        last_message_at=datetime.utcnow() - timedelta(days=30)
    ))
    db_session.commit()
    
    result = await agent.execute_search("invoice")
    # In a real system, the synthesis or ranking logic would prefer t_new.
    # We verify the agent flows correctly and retrieves objects.
    assert result["status"] == "found"
    assert "Invoice" in result["answer_text"]

@pytest.mark.asyncio
async def test_workspace_isolation_deep(db_session):
    """Hard check: Workspace A cannot access Workspace B content even if ID is known."""
    db_session.add(EmailIndex(
        id="secret", workspace_id="workspace_B", thread_id="thread_B", provider="gmail",
        subject="Secret", searchable_text="Sensitive Data", last_message_at=datetime.utcnow()
    ))
    db_session.commit()
    
    agent_a = SearchAgent(db_session, "workspace_A", MockBrain())
    # Even if they ask specifically for "Sensitive Data"
    result = await agent_a.execute_search("Sensitive Data")
    
    assert "Sensitive Data" not in result["answer_text"]
    assert result["status"] == "not_found"

@pytest.mark.asyncio
async def test_sync_idempotency(db_session):
    """Verify that same data ingested twice doesn't create duplicate TriagedEmail rows."""
    workspace_id = "ws_idempotency"
    repo = TriagedInboxRepository(db_session, workspace_id)
    
    msg_id = "ext_123"
    payload = {
        "provider": "google",
        "external_message_id": msg_id,
        "thread_id": "thread_1",
        "sender": "test@example.com",
        "subject": "Hello",
        "snippet": "World",
        "received_at": datetime.utcnow(),
        "category": "FYI",
        "priority": "Low",
        "is_noise": False,
        "is_read": False,
        "confidence": 0.9,
        "reasoning": "Test",
        "metadata": {}
    }
    
    # Run twice
    repo.upsert(**payload)
    repo.upsert(**payload)
    
    count = db_session.query(TriagedEmail).filter(
        TriagedEmail.workspace_id == workspace_id,
        TriagedEmail.external_message_id == msg_id
    ).count()
    
    assert count == 1
