import asyncio
import logging
import sys

from app.core.queue import queue, JobType
from app.database import SessionLocal
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.logging_config import setup_logging

logger = logging.getLogger(__name__)

async def handle_sync_provider(payload: dict):
    user_id = payload["user_id"]
    workspace_id = payload["workspace_id"]
    provider = payload.get("provider", "auto")
    max_results = payload.get("max_results", 50)
    kind = payload.get("kind", "inbox")
    
    logger.info(f"Worker executing sync ({kind}) for {workspace_id}")
    
    orchestrator = AaliyahOrchestrator(workspace_id)
    # Orchestrator uses its own Brain instance which is fine
    
    db = SessionLocal()
    try:
        if kind == "calendar":
            window_days = payload.get("window_days", 7)
            buffer_minutes = payload.get("buffer_minutes", 15)
            await orchestrator.sync_calendar(
                db, 
                user_id=user_id, 
                provider=provider, 
                window_days=window_days, 
                buffer_minutes=buffer_minutes
            )
        else:
            await orchestrator.sync_inbox(
                db, 
                user_id=user_id, 
                provider=provider, 
                max_results=max_results
            )
    except Exception as e:
        logger.exception(f"Sync failed for {workspace_id}")
        raise e
    finally:
        db.close()

async def handle_generate_draft(payload: dict):
    workspace_id = payload["workspace_id"]
    email_id = payload["email_id"]
    user_id = payload.get("user_id")
    
    orchestrator = AaliyahOrchestrator(workspace_id)
    # Ideally Orchestrator has a method for just generating draft for an existing email?
    # sync_inbox calls DraftingAgent directly.
    # We can use ActionExecutor or DraftingAgent here.
    from app.agents.aaliyah.core.drafting import DraftingAgent
    from app.models.triaged_email import TriagedEmail

    logger.info(f"Generating draft for email {email_id}")
    
    db = SessionLocal()
    try:
        stored_email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not stored_email:
            logger.error(f"Email {email_id} not found")
            return

        draft_agent = DraftingAgent(db, workspace_id)
        draft = await draft_agent.generate_draft(stored_email)
        if draft:
            await draft_agent.save_draft(stored_email.id, draft)
            # Emit event
            from app.agents.aaliyah.core.live_feed import event_bus, LiveEvent
            # We can use orchestrator._emit logic if accessible or direct bus
            # Orchestrator _emit is protected but we can simulate it or just use bus directly
            await event_bus.publish(LiveEvent(
                workspace_id=workspace_id,
                type="draft_created",
                message=f"Drafted: {draft.subject}",
                payload={"message_id": stored_email.id}
            ))
            logger.info(f"Draft generated for {email_id}")
            
    finally:
        db.close()

HANDLERS = {
    JobType.SYNC_PROVIDER: handle_sync_provider,
    JobType.GENERATE_DRAFT: handle_generate_draft,
    JobType.PROCESS_THREAD: lambda p: logger.info(f"PROCESS_THREAD: {p}"),
    JobType.TRIAGE_THREAD: lambda p: logger.info(f"TRIAGE_THREAD: {p}"),
    JobType.FOLLOWUP_SCAN: lambda p: logger.info(f"FOLLOWUP_SCAN: {p}"),
    JobType.EMIT_UPDATES: lambda p: logger.info(f"EMIT_UPDATES: {p}"),
    JobType.DAILY_SYNC: lambda p: logger.info(f"DAILY_SYNC: {p}"),
}

async def main():
    setup_logging("worker.json.log")
    logger.info("--- ZROKY WORKER STARTED ---")
    await queue.worker_loop(HANDLERS)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
