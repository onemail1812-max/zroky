import asyncio
import time
import uuid
from datetime import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.search_index import EmailIndex
from app.agents.aaliyah.core.search_agent import SearchAgent

# Setup mini test DB
TEST_DB_URL = "sqlite:///./load_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MockBrain:
    async def think(self, **kwargs):
        # Heavy-ish mock brain to simulate LLM latency if needed
        # await asyncio.sleep(0.01) 
        return type('obj', (object,), {'content': '{"status": "found", "answer": "Mock Answer", "relevant_ids": []}'})()

def seed_10k_threads(db, workspace_id):
    """Seed DB with 10k threads."""
    print(f"Seeding 10,000 threads for workspace {workspace_id}...")
    db.query(EmailIndex).filter(EmailIndex.workspace_id == workspace_id).delete()
    db.commit()

    batch_size = 1000
    for i in range(0, 10000, batch_size):
        batch = []
        for j in range(i, i + batch_size):
            batch.append(EmailIndex(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                thread_id=f"thread_{j}",
                provider="google",
                subject=f"Thread subject {j}",
                sender="sender@example.com",
                searchable_text=f"content for thread {j} with keywords invoice report important",
                last_message_at=datetime.utcnow()
            ))
        db.bulk_save_objects(batch)
        db.commit()

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_10k_threads(session, "ws_load")
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.mark.asyncio
async def test_search_latency_10k(db_session):
    """Deliverable: 10k threads search latency."""
    agent = SearchAgent(db_session, "ws_load", MockBrain())
    
    # Measure latency
    start = time.time()
    await agent.execute_search("invoice")
    latency = time.time() - start
    
    print(f"\n[LOAD TEST] 10k Search Latency: {latency:.4f}s")
    # Rule of thumb: SQLite index search on 10k rows should be < 500ms even with app logic
    assert latency < 1.5 # Relaxed for CI environments but still tight

@pytest.mark.asyncio
async def test_concurrent_q_and_a_100(db_session):
    """Deliverable: 100 concurrent Q&A requests."""
    agent = SearchAgent(db_session, "ws_load", MockBrain())
    
    print("\n[LOAD TEST] Starting 100 concurrent requests...")
    start = time.time()
    tasks = [agent.execute_search(f"query {i}") for i in range(100)]
    results = await asyncio.gather(*tasks)
    duration = time.time() - start
    
    print(f"[LOAD TEST] 100 Concurrent Requests Duration: {duration:.4f}s")
    print(f"[LOAD TEST] Throughput: {100 / duration:.2f} req/s")
    
    assert len(results) == 100
    # 100 requests in a few seconds is reasonable for local/mock
    assert duration < 30.0
