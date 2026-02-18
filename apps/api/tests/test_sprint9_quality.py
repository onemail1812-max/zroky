import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.search_index import EmailIndex
from app.agents.aaliyah.core.search_agent import SearchAgent
from app.agents.aaliyah.core.ingestion.email_ingestor import normalize_sender, normalize_timestamp

# Setup mini test DB
TEST_DB_URL = "sqlite:///./quality_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MockBrain:
    def __init__(self, mode="single"):
        self.mode = mode

    async def think(self, **kwargs):
        system = kwargs.get("system_prompt", "")
        prompt = kwargs.get("prompt", "")
        if "parser" in system.lower() or "intent" in system.lower():
            return type('obj', (object,), {'content': '{"intent": "email_search", "scope": "all", "keywords": "test"}'})()
        
        if self.mode == "multiple":
            return type('obj', (object,), {
                'content': '{"status": "multiple_found", "answer": "I found 3 similar emails—pick one.", "relevant_ids": ["t1", "t2", "t3"]}'
            })()
        
        return type('obj', (object,), {
            'content': '{"status": "found", "answer": "The answer is here.\\nI found this in: Test Subject • 2026-02-18 • gmail", "relevant_ids": ["thread_1"]}'
        })()

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_normalization():
    # Sender normalization
    assert normalize_sender("John Doe <john@example.com>") == "John Doe <john@example.com>"
    assert normalize_sender("<john@example.com>") == "john@example.com"
    assert normalize_sender("JOHN@EXAMPLE.COM") == "john@example.com"
    
    # Timezone normalization (IST check)
    dt = datetime(2026, 2, 18, 10, 0, 0) # Naive
    normalized = normalize_timestamp(dt)
    assert normalized.tzinfo is not None
    # IST is UTC+5:30. 10:00 UTC -> 15:30 IST
    assert normalized.hour == 15
    assert normalized.minute == 30

@pytest.mark.asyncio
async def test_search_stability(db):
    agent = SearchAgent(db, "w1", MockBrain(mode="single"))
    
    # Seed data
    db.query(EmailIndex).delete()
    db.add(EmailIndex(
        id="1", workspace_id="w1", thread_id="thread_1", provider="gmail",
        subject="Test Subject", sender="test@example.com", 
        searchable_text="some test content", last_message_at=datetime.utcnow()
    ))
    db.commit()

    # Repeated calls should return same result (stability)
    r1 = await agent.execute_search("test")
    r2 = await agent.execute_search("test")
    
    assert r1["status"] == "found"
    assert r2["status"] == "found"
    assert r1["answer_text"] == r2["answer_text"]
    assert "I found this in: Test Subject" in r1["answer_text"]

@pytest.mark.asyncio
async def test_ambiguity_handling(db):
    # Mock brain returning multiple_found status
    agent = SearchAgent(db, "w1", MockBrain(mode="multiple"))
    
    result = await agent.execute_search("similar items")
    assert result["status"] == "multiple_found"
    assert "I found 3 similar emails—pick one." in result["answer_text"]

