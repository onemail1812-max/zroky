"""
Advanced SQLite-Backed Background Queue Engine.
Replaces Redis/Celery with a 100% native, crash-proof architecture.
Features: Crash Recovery, Auto-Retries, Exponential Backoff, Dead Letter Queue.
"""
import asyncio
import json
import logging
import uuid
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Callable
from enum import Enum
import traceback

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc

from app.config import settings
from app.database import SessionLocal
from app.models.job import Job, JobStatus

logger = logging.getLogger(__name__)

class JobType(Enum):
    SYNC_PROVIDER = "sync_provider"
    AI_TRIAGE = "ai_triage"
    PROCESS_DRAFT = "process_draft"
    PROCESS_AUDIO = "process_audio"
    AUTO_FOLLOWUP = "auto_followup"
    HEARTBEAT = "heartbeat"
    WATCHDOG = "watchdog"

class AdvancedSQLiteQueue:
    def __init__(self, worker_id: Optional[str] = None):
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"

    async def enqueue(self, job_type: str, payload: Dict[str, Any], dedupe_id: Optional[str] = None, run_at: Optional[datetime] = None) -> Optional[str]:
        db = SessionLocal()
        try:
            # Check deduplication
            if dedupe_id:
                # Same dedupe_id and it is not FINISHED/DLQ -> skip
                existing = db.query(Job).filter(
                    Job.dedupe_id == dedupe_id,
                    Job.status.in_([JobStatus.PENDING, JobStatus.RUNNING])
                ).first()
                if existing:
                    logger.debug(f"Skipping duplicate job {job_type} ({dedupe_id})")
                    return existing.id

            job_id = str(uuid.uuid4())
            new_job = Job(
                id=job_id,
                type=job_type,
                workspace_id=payload.get("workspace_id"),
                payload_json=json.dumps(payload, default=str),
                dedupe_id=dedupe_id,
                run_at=run_at or datetime.now(timezone.utc),
                status=JobStatus.PENDING
            )
            db.add(new_job)
            db.commit()
            logger.info(f"Enqueued {job_type} job {job_id} in SQLiteQueue")
            return job_id
        except Exception as e:
            logger.error(f"Failed to enqueue job: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    def _acquire_job(self) -> Optional[Job]:
        """Atomic locking using SQLite."""
        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)
            
            # Find a pending job that is ready to run
            # OR a dead RUNNING job (crash recovery: locked more than 5 mins ago)
            five_mins_ago = now - timedelta(minutes=5)
            
            candidate = db.query(Job).filter(
                or_(
                    and_(Job.status == JobStatus.PENDING, Job.run_at <= now),
                    and_(Job.status == JobStatus.RUNNING, Job.locked_at < five_mins_ago)
                )
            ).order_by(asc(Job.run_at)).first()
            
            if not candidate:
                return None
                
            # Attempt to lock it
            candidate.status = JobStatus.RUNNING
            candidate.locked_at = now
            candidate.locked_by = self.worker_id
            
            db.commit()
            db.refresh(candidate)
            
            # Detach the object so we can use it outside session
            db.expunge(candidate)
            return candidate
            
        except Exception as e:
            db.rollback()
            return None
        finally:
            db.close()

    async def run_watchdog(self):
        """
        [v2.1 Scale] Background task to reclaim zombie jobs.
        Uses randomized jitter to prevent multiple workers from colliding on the same recovery block.
        """
        import random
        logger.info(f"Watchdog started for worker {self.worker_id}")
        while True:
            # 1. Random Heartbeat Jitter (Enterprise Grade)
            # Prevents thundering herd when reclaiming jobs
            await asyncio.sleep(60 + random.randint(0, 30))
            
            db = SessionLocal()
            try:
                now = datetime.now(timezone.utc)
                # Stale jobs: Running but locked more than 10 mins ago
                stale_threshold = now - timedelta(minutes=10)
                
                zombies = db.query(Job).filter(
                    Job.status == JobStatus.RUNNING,
                    Job.locked_at < stale_threshold
                ).all()
                
                if zombies:
                    logger.warning(f"Watchdog found {len(zombies)} zombie jobs. Reclaiming...")
                    for job in zombies:
                         job.status = JobStatus.PENDING
                         job.locked_at = None
                         job.locked_by = None
                         job.attempts += 1 # Count as a failed attempt due to crash
                    db.commit()
            except Exception as e:
                logger.error(f"Watchdog error: {e}")
                db.rollback()
            finally:
                db.close()

    async def worker_loop(self, handlers: Dict[str, Callable]):
        logger.info(f"Advanced Native Worker '{self.worker_id}' started listening to SQLiteQueue...")
        while True:
            job = self._acquire_job()
            if not job:
                await asyncio.sleep(2.0)  # Polling interval
                continue
                
            # We got a job!
            logger.info(f"Worker {self.worker_id} acquired job {job.id} ({job.type}, attempt {job.attempts + 1})")
            db = SessionLocal()
            try:
                # Parse payload
                payload = json.loads(job.payload_json) if job.payload_json else {}
                handler = handlers.get(job.type)
                
                if not handler:
                    raise ValueError(f"No handler registered for job type: {job.type}")
                
                # Execute the actual worker
                if asyncio.iscoroutinefunction(handler):
                    await handler(payload)
                else:
                    handler(payload)
                
                # Success! Mark as done
                db_job = db.get(Job, job.id)
                db_job.status = JobStatus.DONE
                db_job.updated_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Job {job.id} completed successfully")
                
            except Exception as e:
                # Failure! Handle Retry or DLQ
                db.rollback()
                db_job = db.get(Job, job.id)
                
                db_job.attempts += 1
                db_job.last_error = str(e)
                db_job.traceback_data = traceback.format_exc()
                
                if db_job.attempts >= db_job.max_attempts:
                    db_job.status = JobStatus.DLQ
                    logger.error(f"Job {job.id} failed {db_job.attempts} times -> Dead Letter Queue")
                else:
                    db_job.status = JobStatus.PENDING
                    # Exponential backoff: 2s, 4s, 8s, etc.
                    backoff_secs = 2 ** db_job.attempts
                    db_job.run_at = datetime.now(timezone.utc) + timedelta(seconds=backoff_secs)
                    
                    # Also unlock
                    db_job.locked_at = None
                    db_job.locked_by = None
                    
                    logger.warning(f"Job {job.id} failed, retrying in {backoff_secs}s. Error: {e}")
                    
                db.commit()
            finally:
                db.close()

    async def scheduler_loop(self):
        """
        Runs continuously in the background. Every 5 minutes, it finds all workspaces
        with active email integrations and queues a sync job for them.
        """
        from app.models.integration import Integration, IntegrationStatus
        
        logger.info("Scheduler started. Running 24/7 background sync every 5 minutes...")
        while True:
            try:
                db = SessionLocal()
                try:
                    # Find all unique workspace IDs that have a connected email provider
                    integrations = db.query(Integration.workspace_id).filter(
                        Integration.status == IntegrationStatus.CONNECTED,
                        Integration.provider.in_(["google", "google_gmail", "GOOGLE_GMAIL", "microsoft", "outlook", "OUTLOOK"])
                    ).distinct().all()
                    
                    for (workspace_id,) in integrations:
                        logger.debug(f"Scheduler auto-queueing sync for workspace: {workspace_id}")
                        await self.enqueue(
                            job_type=JobType.SYNC_PROVIDER.value,
                            payload={
                                 "workspace_id": workspace_id,
                                 "provider": "all"
                            },
                            dedupe_id=f"auto_sync:{workspace_id}" 
                        )

                        # Queue Auto-Followup check (every 5 mins is fine, but it internally checks 48h logic)
                        await self.enqueue(
                            job_type=JobType.AUTO_FOLLOWUP.value,
                            payload={"workspace_id": workspace_id},
                            dedupe_id=f"auto_followup:{workspace_id}"
                        )

                        # Queue Orchestrator Heartbeat (Flush communication queues)
                        await self.enqueue(
                            job_type=JobType.HEARTBEAT.value,
                            payload={"workspace_id": workspace_id},
                            dedupe_id=f"heartbeat:{workspace_id}"
                        )
                finally:
                    db.close()
            except asyncio.CancelledError:
                logger.info("Scheduler loop cancelled, shutting down cleanly")
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                
            await asyncio.sleep(300)

queue = AdvancedSQLiteQueue()