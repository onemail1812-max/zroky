import pytest
import uuid
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.search_index import EmailIndex
from app.models.audit_log import AuditLog
from app.agents.aaliyah.core.search_agent import SearchAgent

# Setup mini test DB
TEST_DB_URL = "sqlite:///./security_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import re

class MockBrain:
    async def think(self, **kwargs):
        system = kwargs.get("system_prompt", "")
        prompt = kwargs.get("prompt", "")
        # Detect if this is a parser call or synthesis call
        if "parser" in system.lower() or "intent" in system.lower():
            # Try to extract keywords from prompt: "Query: some words"
            # QueryParser prompt usually starts with "Query: {query}\n"
            match = re.search(r"Query:\s*([^\n]*)", prompt)
            q = match.group(1).strip() if match else "secret"
            # Simple keyword extraction: take last word or full string
            kw = q if q else "something"
            return type('obj', (object,), {'content': f'{{"intent": "email_search", "scope": "all", "keywords": "{kw}"}}'})()
        else:
            # SearchAgent synthesis response
            return type('obj', (object,), {'content': '{"status": "found", "answer": "Mock Answer", "relevant_ids": ["thread_B"]}'})()

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def agent_a(db):
    return SearchAgent(db, "workspace_A", MockBrain())

@pytest.fixture
def agent_b(db):
    return SearchAgent(db, "workspace_B", MockBrain())

@pytest.mark.asyncio
async def test_workspace_isolation(db, agent_a):
    """Verify that workspace A cannot see workspace B data."""
    # Seed workspace B data
    email_b = EmailIndex(
        id=str(uuid.uuid4()),
        workspace_id="workspace_B",
        thread_id="thread_B",
        provider="google",
        subject="Secret Plans",
        sender="attacker@example.com",
        searchable_text="top secret document for B",
        last_message_at=datetime.utcnow()
    )
    db.add(email_b)
    db.commit()

    # Search with workspace A agent
    result = await agent_a.execute_search("secret")
    
    # Should not find workspace B thread
    assert "thread_B" not in [ev["id"] for ev in result.get("evidence", [])]
    assert "top secret" not in result["answer_text"]
    assert result["status"] == "not_found"

@pytest.mark.asyncio
async def test_audit_log_generation(db, agent_a):
    """Verify that search generates audit logs."""
    # Clear logs
    db.query(AuditLog).delete()
    db.commit()

    await agent_a.execute_search("hello")
    
    logs = db.query(AuditLog).all()
    # 1. asked_question
    # 2. possibly accessed_content (if any match) - in this case none match workspace_A
    
    actions = [l.action for l in logs]
    assert "asked_question" in actions
    
    # Verify no body in logs
    for log in logs:
        if log.meta:
            meta = json.loads(log.meta)
            for k, v in meta.items():
                assert "snippet" not in k
                assert "body" not in k

    # Generic - should trigger clarification
    async def mock_parse_generic(text):
        return {"scope": "all", "keywords": None, "sender": None}
    agent_a.parser.parse = mock_parse_generic
    
    result = await agent_a.execute_search("nothing")
    assert result["status"] == "clarify"
    assert "I don't have enough context. Tell me the sender or a keyword." in result["answer_text"]
    
    # Specific keywords but NOT FOUND - should use generic "I searched..." or specific email phrase
    async def mock_parse_specific(text):
        return {"scope": "all", "keywords": "random-xyz-123", "sender": None}
    agent_a.parser.parse = mock_parse_specific
    
    result = await agent_a.execute_search("search random-xyz-123")
    assert result["status"] == "not_found"
    assert "I couldn't find an email that mentions random-xyz-123" in result["answer_text"]

if __name__ == "__main__":
    import asyncio
    # Manual verification logic here if needed
