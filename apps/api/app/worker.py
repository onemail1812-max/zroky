"""Minimal worker — no background sync loops in stateless architecture."""
import asyncio
import logging

from app.core.queue import queue, JobType
from app.logging_config import setup_logging

logger = logging.getLogger(__name__)


async def handle_noop(payload: dict):
    """All old sync jobs are now no-ops in stateless mode."""
    logger.info(f"NOOP handler invoked (stateless mode): {payload}")


HANDLERS = {
    JobType.SYNC_PROVIDER: handle_noop,
    JobType.GENERATE_DRAFT: handle_noop,
    JobType.FOLLOWUP_SCAN: handle_noop,
    JobType.EMIT_UPDATES: handle_noop,
    JobType.DAILY_SYNC: handle_noop,
    JobType.PROCESS_THREAD: handle_noop,
    JobType.TRIAGE_THREAD: handle_noop,
}


async def main():
    setup_logging("worker.json.log")
    logger.info("--- ZROKY WORKER (v2.1 Hardened) — Active Watchdogs ---")
    
    # Run worker loop and watchdog concurrently
    await asyncio.gather(
        queue.worker_loop(HANDLERS),
        queue.run_watchdog()
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
