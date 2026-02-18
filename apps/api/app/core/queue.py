import asyncio
import json
import logging
import uuid
import time
from enum import Enum
from typing import Optional, Dict, Any, Callable
from redis.asyncio import Redis, from_url
from redis.exceptions import ConnectionError as RedisConnectionError
from app.config import settings

logger = logging.getLogger(__name__)

class JobType(str, Enum):
    SYNC_PROVIDER = "sync_provider"
    PROCESS_THREAD = "process_thread"
    TRIAGE_THREAD = "triage_thread"
    GENERATE_DRAFT = "generate_draft"
    FOLLOWUP_SCAN = "followup_scan"
    EMIT_UPDATES = "emit_updates"
    DAILY_SYNC = "daily_6am_sync"

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DELAYED = "delayed"

class JobQueue:
    def __init__(self, redis_url: str = settings.redis_url):
        self.redis_url = redis_url
        self._redis: Optional[Redis] = None
        self._use_memory_fallback = False
        self._memory_queue: asyncio.Queue[str] = asyncio.Queue()
        self.queue_key = "zroky:queue:default"
        self.dlq_key = "zroky:queue:dlq"
        self.delayed_key = "zroky:queue:delayed"

    async def _get_redis(self) -> Redis:
        if self._redis:
            return self._redis
        
        if self._use_memory_fallback:
            raise ConnectionError("Using memory fallback")

        try:
            self._redis = from_url(self.redis_url, decode_responses=True)
            # Ping test
            await self._redis.ping()
            return self._redis
        except Exception as e:
            logger.warning(f"Redis not available at {self.redis_url}, falling back to memory queue. Error: {e}")
            self._use_memory_fallback = True
            raise e

    async def enqueue(self, job_type: str, payload: Dict[str, Any], dedupe_id: Optional[str] = None) -> Optional[str]:
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "type": job_type,
            "payload": payload,
            "created_at": time.time(),
            "attempts": 0,
            "dedupe_id": dedupe_id
        }
        job_str = json.dumps(job)

        try:
            redis_client = await self._get_redis()
            if dedupe_id:
                key = f"zroky:idempotency:{dedupe_id}"
                if await redis_client.get(key):
                    logger.info(f"Skipping duplicate job {job_type} ({dedupe_id})")
                    return None
                await redis_client.set(key, "1", ex=3600) 

            await redis_client.rpush(self.queue_key, job_str)
            logger.debug(f"Enqueued job {job_id} ({job_type}) via Redis")
        except Exception:
            # Fallback
            await self._memory_queue.put(job_str)
            logger.info(f"Enqueued job {job_id} ({job_type}) via Memory Queue")
            
        return job_id

    async def _process_delayed(self):
        """Check delayed set and move ready jobs to queue"""
        try:
            redis_client = await self._get_redis()
            now = time.time()
            jobs = await redis_client.zrangebyscore(self.delayed_key, "-inf", now)
            if jobs:
                await redis_client.zrem(self.delayed_key, *jobs)
                for job_str in jobs:
                    await redis_client.rpush(self.queue_key, job_str)
                logger.info(f"Moved {len(jobs)} delayed jobs to main queue")
        except:
            pass

    async def get_stats(self):
        try:
            redis_client = await self._get_redis()
            return {
                "queue_depth": await redis_client.llen(self.queue_key),
                "dlq_depth": await redis_client.llen(self.dlq_key),
                "delayed_count": await redis_client.zcard(self.delayed_key),
                "mode": "redis"
            }
        except:
            return {
                "queue_depth": self._memory_queue.qsize(),
                "mode": "memory"
            }

    async def worker_loop(self, handlers: Dict[str, Callable]):
        logger.info("Worker started listening on queue...")
        while True:
            try:
                job_str: Optional[str] = None
                
                try:
                    redis_client = await self._get_redis()
                    await self._process_delayed()
                    result = await redis_client.blpop([self.queue_key], timeout=5)
                    if result:
                        _, job_str = result
                except Exception:
                    # Use memory queue
                    try:
                        job_str = await asyncio.wait_for(self._memory_queue.get(), timeout=5.0)
                    except asyncio.TimeoutError:
                        continue

                if not job_str:
                    continue
                
                try:
                    job = json.loads(job_str)
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode job: {job_str}")
                    continue

                job_type = job["type"]
                job_id = job["id"]
                
                start_time = time.time()
                logger.info(f"Processing job {job_id} ({job_type})")
                
                handler = handlers.get(job_type)
                if not handler:
                    logger.error(f"No handler for job type {job_type}")
                    continue

                try:
                    await handler(job["payload"])
                    duration = time.time() - start_time
                    logger.info(f"Job {job_id} completed", extra={"job_duration": duration, "job_type": job_type})
                except Exception as e:
                    logger.exception(f"Job {job_id} failed: {e}")
                    job["attempts"] += 1
                    if job["attempts"] < 5:
                        # Re-queue in memory for now if Redis is down
                        # In production this would go back to Redis
                        await asyncio.sleep(2)
                        await self.enqueue(job["type"], job["payload"])

            except Exception as e:
                logger.error(f"Worker loop error: {e}")
                await asyncio.sleep(5)

# Global instance
queue = JobQueue()
