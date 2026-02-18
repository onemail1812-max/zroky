import asyncio
import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import List

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.search_index import EmailIndex, CalendarIndex
from app.agents.aaliyah.core.search_agent import SearchAgent
from app.services.brain.core import Brain

# Setup mini test DB
TEST_DB_URL = "sqlite:///./perf_test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class MockBrain:
    async def think(self, **kwargs):
        return type('obj', (object,), {'content': '{"status": "found", "answer": "Mock Answer", "relevant_ids": []}'})()
    
    async def parse(self, text):
        return {"scope": "all", "keywords": "report", "sender": "rahul", "intent": "email_search"}

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def brain():
    return MockBrain()

def seed_data(db, count=1000):
    """Seed DB with dummy data for scaling verification."""
    print(f"Seeding {count} threads...")
    workspace_id = "perf_test_ws"
    
    # Clear existing
    db.query(EmailIndex).delete()
    db.commit()

    batch_size = 500
    for i in range(0, count, batch_size):
        batch = []
        for j in range(i, min(i + batch_size, count)):
            batch.append(EmailIndex(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                thread_id=f"thread_{j}",
                provider="google",
                subject=f"Urgent: Report review number {j}",
                sender="rahul@example.com",
                searchable_text=f"report review rahul important document {j}",
                last_message_at=datetime.utcnow() - timedelta(minutes=j)
            ))
        db.bulk_save_objects(batch)
        db.commit()

@pytest.mark.asyncio
async def test_search_latency_scaling(db, brain):
    seed_data(db, count=1000) 
    
    agent = SearchAgent(db, "perf_test_ws", brain)
    
    # 1. Measure Latency (Cold)
    print("\n--- Starting COLD Search ---")
    start_time = time.time()
    result = await agent.execute_search("rahul report")
    cold_latency = time.time() - start_time
    print(f"[LATENCY] COLD Search: {cold_latency:.4f}s")
    
    # 2. Measure Latency (Warm - Cache Hit)
    print("--- Starting WARM Search ---")
    start_time = time.time()
    result_warm = await agent.execute_search("rahul report")
    warm_latency = time.time() - start_time
    print(f"[LATENCY] WARM Search (Cache Hit): {warm_latency:.4f}s")
    
    assert result_warm["answer_text"] == result["answer_text"]
    assert warm_latency < 0.1
    assert warm_latency < cold_latency
    
@pytest.mark.asyncio
async def test_concurrency_stability(db, brain):
    """Verify system stability under 10 concurrent requests."""
    agent = SearchAgent(db, "perf_test_ws", brain)
    
    queries = ["rahul report", "important", "review", "urgent", "document"] * 2
    
    start_time = time.time()
    tasks = [agent.execute_search(q) for q in queries]
    results = await asyncio.gather(*tasks)
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"[CONCURRENCY] Handled {len(queries)} requests in {duration:.2f}s")
    
    assert len(results) == 10

if __name__ == "__main__":
    # Manual run if needed
    async def run_manual():
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        seed_data(db, 10000) # FULL 10K SCALE
        agent = SearchAgent(db, "perf_test_ws", Brain())
        
        print("Testing 10K threads search...")
        start = time.time()
        await agent.execute_search("rahul")
        print(f"10K Search Time: {time.time() - start:.4f}s")
        
        db.close()
    
    # asyncio.run(run_manual())
