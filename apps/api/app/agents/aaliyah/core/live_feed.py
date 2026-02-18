"""Workspace-scoped Redis event bus for SSE streaming."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from pydantic import BaseModel, Field
from redis.asyncio import from_url
from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class LiveEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_sse(self) -> str:
        body = json.dumps(self.model_dump(mode="json"), ensure_ascii=True)
        return f"id: {self.id}\nevent: {self.type}\ndata: {body}\n\n"


class WorkspaceEventBus:
    def __init__(self):
        self._redis_url = settings.redis_url
        self._redis: Optional[Redis] = None
        self._use_memory_fallback = False
        self._subscribers: dict[str, list[asyncio.Queue[LiveEvent]]] = {}
        self._lock = asyncio.Lock()

    async def _get_redis(self) -> Redis:
        if self._redis:
            return self._redis
        if self._use_memory_fallback:
            raise ConnectionError("Memory fallback active")
        try:
            self._redis = from_url(self._redis_url, decode_responses=True)
            await self._redis.ping()
            return self._redis
        except Exception as e:
            logger.warning(f"Redis for Live Feed not available: {e}. Falling back to memory.")
            self._use_memory_fallback = True
            raise ConnectionError("Redis fallback")

    async def publish(self, event: LiveEvent) -> None:
        try:
            redis = await self._get_redis()
            channel = f"zroky:live:{event.workspace_id}"
            await redis.publish(channel, event.model_dump_json())
        except (ConnectionError, Exception):
            # Memory broadcast
            async with self._lock:
                queues = self._subscribers.get(event.workspace_id, [])
                for q in queues:
                    await q.put(event)

    async def subscribe(self, workspace_id: str) -> AsyncGenerator[LiveEvent, None]:
        # Handle Memory Fallback first if already active
        if self._use_memory_fallback:
            async for e in self._subscribe_memory(workspace_id):
                yield e
            return

        # Attempt Redis Subscription
        try:
            redis_client = from_url(self._redis_url, decode_responses=True)
            pubsub = redis_client.pubsub()
            channel = f"zroky:live:{workspace_id}"
            await pubsub.subscribe(channel)
            
            async for message in pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        yield LiveEvent(**data)
                    except:
                        pass
        except (OSError, Exception) as e:
            logger.warning(f"Redis subscription failed, switching to memory for {workspace_id}")
            self._use_memory_fallback = True
            async for e in self._subscribe_memory(workspace_id):
                yield e

    async def _subscribe_memory(self, workspace_id: str) -> AsyncGenerator[LiveEvent, None]:
        q = asyncio.Queue()
        async with self._lock:
            if workspace_id not in self._subscribers:
                self._subscribers[workspace_id] = []
            self._subscribers[workspace_id].append(q)
        
        try:
            while True:
                event = await q.get()
                yield event
        finally:
            async with self._lock:
                if workspace_id in self._subscribers:
                    self._subscribers[workspace_id].remove(q)

event_bus = WorkspaceEventBus()
