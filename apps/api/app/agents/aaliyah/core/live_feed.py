"""Workspace-scoped pure in-memory event bus for SSE streaming."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from pydantic import BaseModel, Field
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
    """A resilient, native, 100% in-memory pub-sub bus for SSE UI updates."""
    
    def __init__(self):
        self._subscribers: dict[str, list[asyncio.Queue[LiveEvent]]] = {}
        self._lock = asyncio.Lock()

    async def publish(self, event: LiveEvent) -> None:
        """Publish an event natively. Instantly received by connected SSE clients."""
        async with self._lock:
            queues = self._subscribers.get(event.workspace_id, [])
            for q in queues:
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass

    async def subscribe(self, workspace_id: str) -> AsyncGenerator[LiveEvent, None]:
        """Yield events natively to connected SSE stream."""
        q = asyncio.Queue(maxsize=100)
        async with self._lock:
            if workspace_id not in self._subscribers:
                self._subscribers[workspace_id] = []
            self._subscribers[workspace_id].append(q)
        
        try:
            logger.info(f"New internal SSE listener attached for {workspace_id}")
            while True:
                event = await q.get()
                yield event
        finally:
            async with self._lock:
                if workspace_id in self._subscribers:
                    try:
                        self._subscribers[workspace_id].remove(q)
                    except ValueError:
                        pass
            logger.info(f"Internal SSE listener detached for {workspace_id}")

event_bus = WorkspaceEventBus()
