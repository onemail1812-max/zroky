"""Script to Enqueue a new Sync Job to the Custom Native Queue"""
import asyncio
from app.core.queue import queue, JobType

async def trigger_test_job():
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

if __name__ == "__main__":
    asyncio.run(trigger_test_job())
