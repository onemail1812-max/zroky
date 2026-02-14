"""Workspace-scoped in-memory event bus for SSE streaming."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
import json
import uuid
from typing import Any

from pydantic import BaseModel, Field


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
        self._subscribers: dict[str, set[asyncio.Queue[LiveEvent]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def publish(self, event: LiveEvent) -> None:
        async with self._lock:
            subscribers = list(self._subscribers.get(event.workspace_id, set()))
        for queue in subscribers:
            if queue.full():
                try:
                    queue.get_nowait()
                except Exception:
                    pass
            try:
                queue.put_nowait(event)
            except Exception:
                continue

    async def subscribe(self, workspace_id: str) -> asyncio.Queue[LiveEvent]:
        queue: asyncio.Queue[LiveEvent] = asyncio.Queue(maxsize=250)
        async with self._lock:
            self._subscribers[workspace_id].add(queue)
        return queue

    async def unsubscribe(self, workspace_id: str, queue: asyncio.Queue[LiveEvent]) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(workspace_id)
            if not subscribers:
                return
            subscribers.discard(queue)
            if not subscribers:
                self._subscribers.pop(workspace_id, None)


event_bus = WorkspaceEventBus()
