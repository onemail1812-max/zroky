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
        self._history: dict[str, list[LiveEvent]] = {} # [v2.1] Journaling ring-buffer
        self._history_limit = 100
        self._lock = asyncio.Lock()

    async def publish(self, event: LiveEvent) -> None:
        """Publish an event natively. Instantly received by connected SSE clients."""
        async with self._lock:
            # 1. Update Journal (Ring Buffer)
            if event.workspace_id not in self._history:
                self._history[event.workspace_id] = []
            
            history = self._history[event.workspace_id]
            history.append(event)
            if len(history) > self._history_limit:
                history.pop(0)

            # 2. Push to active subscribers
            queues = self._subscribers.get(event.workspace_id, [])
            for q in queues:
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    pass

    async def subscribe(self, workspace_id: str, last_event_id: Optional[str] = None) -> AsyncGenerator[LiveEvent, None]:
        """Yield events natively to connected SSE stream. Replays missed events if last_event_id provided."""
        q = asyncio.Queue(maxsize=100)
        
        async with self._lock:
            # 1. Replay missed events from Journal
            if last_event_id and workspace_id in self._history:
                history = self._history[workspace_id]
                try:
                    # Find index of last seen event
                    idx = -1
                    for i, ev in enumerate(history):
                        if ev.id == last_event_id:
                            idx = i
                            break
                    
                    # Replay everything after that
                    if idx != -1:
                        for ev in history[idx+1:]:
                            q.put_nowait(ev)
                    else:
                        # If ID not found (stale), replay ALL current history to be safe
                        for ev in history:
                            q.put_nowait(ev)
                except Exception as e:
                    logger.error(f"Event Replay failed: {e}")

            # 2. Register subscriber
            if workspace_id not in self._subscribers:
                self._subscribers[workspace_id] = []
            self._subscribers[workspace_id].append(q)
        
        try:
            logger.info(f"New internal SSE listener attached for {workspace_id} (last_id={last_event_id})")
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
