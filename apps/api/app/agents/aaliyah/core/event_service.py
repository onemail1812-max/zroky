"""Aaliyah Event Service — handles persistence and high-level event side effects."""

import asyncio
import logging
import uuid
from typing import Any, Dict, Optional
from app.database import SessionLocal
from app.models.chat_message import ChatRepository

logger = logging.getLogger(__name__)

class EventService:
    """Service dedicated to persisting and routing high-value events."""

    @staticmethod
    async def persist_event(workspace_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        """
        Persist high-value events to the chat history asynchronously.
        This runs in a background task to keep the main orchestration loop fast.
        """
        if event_type not in ["assistant_message", "new_email_arrival", "draft_ready"]:
            return

        # Launch persistence in background, don't await it here to keep _emit fast
        asyncio.create_task(EventService._persist_event_async(workspace_id, event_type, message, payload))

    @staticmethod
    async def _persist_event_async(workspace_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]]) -> None:
        """Run persistence in thread pool to avoid blocking event loop."""
        await asyncio.to_thread(EventService._do_persist_sync, workspace_id, event_type, message, payload)

    @staticmethod
    def _do_persist_sync(workspace_id: str, event_type: str, message: str, payload: Optional[Dict[str, Any]]) -> None:
        db = SessionLocal()
        try:
            repo = ChatRepository(db, workspace_id)
            if event_type == "assistant_message":
                text = (payload or {}).get("text", message)
                repo.add_message(
                    id=f"proactive_{uuid.uuid4().hex[:12]}",
                    role="assistant",
                    content=text,
                    thread_id=(payload or {}).get("thread_id"),
                    msg_type="text",
                    payload=payload,
                )
            elif event_type == "new_email_arrival":
                p = payload or {}
                repo.add_message(
                    id=f"arrival_{uuid.uuid4().hex[:12]}",
                    role="assistant",
                    content=None,
                    thread_id=None,
                    msg_type="email_action",
                    payload={
                        "sender": p.get("sender_name", p.get("sender", "Unknown")),
                        "subject": p.get("subject", "No Subject"),
                        "snippet": p.get("snippet", ""),
                        "priority": "New",
                        "actions": p.get("actions", []),
                    },
                )
            elif event_type == "draft_ready":
                p = payload or {}
                repo.add_message(
                    id=f"draft_{uuid.uuid4().hex[:12]}",
                    role="assistant",
                    content=None,
                    thread_id=None,
                    msg_type="email_action",
                    payload={
                        "action": "draft_ready",
                        "sender": p.get("sender", ""),
                        "subject": p.get("subject", ""),
                        "snippet": p.get("snippet", ""),
                        "draft": p.get("draft", {}),
                    },
                )
        except Exception as persist_err:
            logger.warning(f"Failed to persist {event_type} event: {persist_err}")
        finally:
            db.close()
