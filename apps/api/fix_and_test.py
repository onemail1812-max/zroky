from app.database import engine, Base
import app.models # Ensures all models are loaded
from app.models.job import Job
from sqlalchemy import text
import asyncio
from app.core.queue import queue, JobType

# 1. Drop old table and recreate
try:
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS jobs;"))
        conn.commit()
    Base.metadata.create_all(engine)
    print("Table recreated.")
except Exception as e:
    print(f"Schema Error: {e}")

# 2. Enqueue test job
async def test():
    job_id = await queue.enqueue(
        job_type=JobType.SYNC_PROVIDER.value,
        payload={
            "workspace_id": "ws_demo_stable_001",
            "provider": "google",
            "max_results": 20
        },
        dedupe_id="demo_sync_test"
    )
    print(f"Triggered Test Job: {job_id}")

asyncio.run(test())
