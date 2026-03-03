"""Aaliyah orchestrator — async-safe with non-blocking DB ops."""

from __future__ import annotations

import asyncio
import logging
import re
import threading
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Dict

from sqlalchemy import func, cast, Text
from sqlalchemy.orm import Session
from app.database import SessionLocal

from app.models.calendar_event_snapshot import CalendarConflict
from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.services.audit_log_service import AuditAction, AuditEntityType, AuditLogService
from app.agents.aaliyah.core.live_feed import LiveEvent, event_bus
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier
from app.services.brain.core import Brain
from app.agents.aaliyah.core.communication_engine import CommunicationEngine, CommunicationState
from app.agents.aaliyah.core.tools.tool_dispatcher import ToolDispatcher
from app.agents.aaliyah.core.intent_service import IntentService
from app.agents.aaliyah.core.handlers.base import BaseHandler

# Import the specialized handlers
from app.agents.aaliyah.core.handlers.chat_handler import ChatHandler
from app.agents.aaliyah.core.handlers.inbox_manager import InboxManager
from app.agents.aaliyah.core.handlers.calendar_syncer import CalendarSyncer
from app.agents.aaliyah.core.handlers.followup_scanner import FollowupScanner
from app.agents.aaliyah.core.handlers.webhook_handler import WebhookHandler

from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

@dataclass
class WorkspaceRuntimeState:
    status: str = "idle"
    active_task: Optional[str] = None
    pending_approvals: int = 0
    triaged_count: int = 0
    queued_count: int = 0
    escalations: int = 0
    calendar_events: int = 0
    calendar_conflicts: int = 0
    last_sync: dict[str, Optional[str]] = field(default_factory=lambda: {"gmail": None, "calendar": None})
    last_updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    communication: CommunicationState = field(default_factory=CommunicationState)


class AaliyahOrchestrator:
    """Main cognitive loop for chat, inbox sync, and calendar sync."""

    _state_lock = threading.Lock()
    _state: Dict[str, WorkspaceRuntimeState] = {}
    _recipient_re = re.compile(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")

    def __init__(self, workspace_id: str, brain: Optional[Brain] = None):
        self.workspace_id = workspace_id
        self.brain = brain or Brain()
        self.triage_classifier = SmartTriageClassifier(self.brain)
        self.comm_engine = CommunicationEngine()
        self.intent_service = IntentService(self.brain)
        self.dispatcher = ToolDispatcher(workspace_id=workspace_id, brain=self.brain, db=None) # DB set during actual call
        
        # Initialize handlers
        self.chat_handler = ChatHandler(self)
        self.inbox_manager = InboxManager(self)
        self.calendar_syncer = CalendarSyncer(self)
        self.followup_scanner = FollowupScanner(self)
        self.webhook_handler = WebhookHandler(self)

    def _get_state(self) -> WorkspaceRuntimeState:
        with self._state_lock:
            state = self._state.get(self.workspace_id)
            if state is None:
                state = WorkspaceRuntimeState()
                self._state[self.workspace_id] = state
            return state

    def _patch_state(self, **kwargs: Any) -> WorkspaceRuntimeState:
        with self._state_lock:
            state = self._state.get(self.workspace_id)
            if state is None:
                state = WorkspaceRuntimeState()
                self._state[self.workspace_id] = state
            for key, value in kwargs.items():
                if hasattr(state, key):
                    setattr(state, key, value)
            state.last_updated_at = datetime.now(timezone.utc).isoformat()
            return state

    async def emit_status(self, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        """Public entry point for background workers to emit events."""
        await self._emit(event_type, message, payload)

    async def flush_communication(self) -> None:
        """Trigger a heartbeat flush of the communication engine."""
        await self._emit("heartbeat", "Checking for updates...")

    async def _emit(self, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None) -> None:
        event = LiveEvent(
            workspace_id=self.workspace_id,
            type=event_type,
            message=message,
            payload=payload or {},
        )
        await event_bus.publish(event)
        
        # Persist messages and notifications (omitting long persistence logic for brevity as it remains same as monolith)
        # In a real app we'd keep the persistence logic here or move to an EventManager
        if event_type in ["assistant_message", "new_email_arrival", "draft_ready"]:
             from app.models.chat_message import ChatRepository
             import uuid
             ws_id = self.workspace_id
             ev_type = event_type
             ev_payload = payload
             ev_message = message
             def _persist_event():
                 persist_db = SessionLocal()
                 try:
                     repo = ChatRepository(persist_db, ws_id)
                     if ev_type == "assistant_message":
                         text = (ev_payload or {}).get("text", ev_message)
                         repo.add_message(
                            id=f"proactive_{uuid.uuid4().hex[:12]}",
                            role="assistant",
                            content=text,
                            thread_id=(ev_payload or {}).get("thread_id"),
                            msg_type="text",
                            payload=ev_payload,
                         )
                     elif ev_type == "new_email_arrival":
                         p = ev_payload or {}
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
                     elif ev_type == "draft_ready":
                         p = ev_payload or {}
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
                     logger.warning(f"Failed to persist {ev_type} event: {persist_err}")
                 finally:
                     persist_db.close()
             await asyncio.to_thread(_persist_event)

        # CommEngine events
        state = self._get_state()
        p = payload or {}
        if event_type == "draft_ready":
            is_urgent = p.get("priority") == "High" or p.get("is_vip", False)
            self.comm_engine.add_event(state.communication, "draft_ready", p, urgent=is_urgent)
        elif event_type == "thread_updated" and (p.get("priority") == "High" or p.get("is_vip", False)):
            self.comm_engine.add_event(state.communication, "priority_added", p, urgent=True)
        elif event_type == "approval_required":
            self.comm_engine.add_event(state.communication, "approval_required", p, urgent=True)
        elif event_type == "followup_scan_complete" and p.get("count", 0) > 0:
            self.comm_engine.add_event(state.communication, "followup_due", p)
        elif event_type == "calendar_conflict_detected":
            self.comm_engine.add_event(state.communication, "calendar_conflict_detected", p, urgent=True)
        elif event_type == "daily_6am_sync_complete":
            self.comm_engine.add_event(state.communication, "daily_6am_sync_complete", p, urgent=True)
        elif event_type == "sync_complete":
            if p.get("cleaned_count", 0) > 0:
                self.comm_engine.add_event(state.communication, "cleaned_done", {"count": p.get("cleaned_count")})
            if p.get("count", 0) > 0:
                self.comm_engine.add_event(state.communication, "sync_complete", p)

        # Flush CommEngine
        if event_type != "assistant_message":
            try:
                ws_id = self.workspace_id
                def _fetch_preferences():
                    db = SessionLocal()
                    try:
                        workspace = db.query(Workspace).filter(Workspace.id == ws_id).first()
                        preferences = workspace.settings_json if workspace and workspace.settings_json else {}
                        if isinstance(preferences, str):
                            import json
                            try:
                                preferences = json.loads(preferences)
                            except Exception:
                                preferences = {}
                        return preferences
                    finally:
                        db.close()
                preferences = await asyncio.to_thread(_fetch_preferences)
                user_name = preferences.get("user_name") or preferences.get("first_name") or "there"
                
                msg = await self.comm_engine.flush(state.communication, user_name=user_name, brain=self.brain, preferences=preferences)
                if msg:
                     await self._emit("assistant_message", msg, {"text": msg, "role": "assistant"})
            except Exception as e:
                logger.error(f"CommEngine flush failed: {e}", exc_info=True)

    async def broadcast_updates(self, db: Session) -> None:
        """Fetch and broadcast latest counts and stats (non-blocking)."""
        ws_id = self.workspace_id
        def _fetch_counts():
            unread = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.is_read == False).count()
            needs_reply = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.awaiting_reply == True).count()
            followups = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.category == "followups").count()
            drafts_count = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == ws_id, 
                cast(TriagedEmail.metadata_json, Text).like('%"draft":%')
            ).count()
            return {"unread": unread, "needs_reply": needs_reply, "followups": followups, "drafts": drafts_count}
        counts = await asyncio.to_thread(_fetch_counts)
        counts["timestamp"] = datetime.now(timezone.utc).timestamp()
        await self._emit("counts_update", "Updated inbox counts", counts)

    async def _audit(self, db: Session, **kwargs: Any) -> None:
        try:
            AuditLogService.log_action(db=db, workspace_id=self.workspace_id, entity_type=AuditEntityType.ARTIFACT, **kwargs)
        except Exception:
            pass

    def get_status(self) -> dict[str, Any]:
        state = self._get_state()
        return {
            "status": state.status,
            "active_task": state.active_task,
            "pending_approvals": state.pending_approvals,
            "last_sync": state.last_sync,
            "last_updated_at": state.last_updated_at,
        }

    def get_stats(self, db: Optional[Session] = None) -> dict[str, Any]:
        try:
            state = self._get_state()
            stats = {
                "triaged_count": state.triaged_count,
                "queued_count": state.queued_count,
                "pending_approvals": state.pending_approvals,
                "escalations": state.escalations,
                "calendar_events": state.calendar_events,
                "calendar_conflicts": state.calendar_conflicts,
            }
        except Exception as state_err:
            logger.error(f"Failed to get_state in get_stats: {state_err}")
            stats = {
                "triaged_count": 0, "queued_count": 0, "pending_approvals": 0,
                "escalations": 0, "calendar_events": 0, "calendar_conflicts": 0,
            }
            
        if db:
            try:
                stats["priority_count"] = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id, TriagedEmail.priority == "High").count()
                stats["needs_reply_count"] = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id, (TriagedEmail.category == "Needs Reply") | (TriagedEmail.awaiting_reply == True)).count()
                stats["followups_count"] = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id, TriagedEmail.category == "Followups").count()
                stats["drafts_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id, 
                    cast(TriagedEmail.metadata_json, Text).like('%"draft":%')
                ).count()
            except Exception as e:
                logger.error(f"Failed to fetch realtime stats from db: {e}")
                # Provide safe defaults if DB queries fail (e.g. table not found in this environment)
                stats["priority_count"] = 0
                stats["needs_reply_count"] = 0
                stats["followups_count"] = 0
                stats["drafts_count"] = 0
        return stats

    # --- DELEGATED HANDLERS ---
    async def handle_webhook(self, *args, **kwargs): return await self.webhook_handler.handle_webhook(*args, **kwargs)
    async def run_followup_scan(self, *args, **kwargs): return await self.followup_scanner.run_followup_scan(*args, **kwargs)
    async def sync_calendar(self, *args, **kwargs): return await self.calendar_syncer.sync_calendar(*args, **kwargs)
    def list_calendar_conflicts(self, *args, **kwargs): return self.calendar_syncer.list_calendar_conflicts(*args, **kwargs)
    async def sync_inbox(self, *args, **kwargs): return await self.inbox_manager.sync_inbox(*args, **kwargs)
    def list_inbox(self, *args, **kwargs): return self.inbox_manager.list_inbox(*args, **kwargs)
    async def historical_sync(self, *args, **kwargs): return await self.inbox_manager.historical_sync(*args, **kwargs)
    async def handle_chat(self, *args, **kwargs): return await self.chat_handler.handle_chat(*args, **kwargs)
    async def handle_chat_stream(self, *args, **kwargs):
        async for chunk in self.chat_handler.handle_chat_stream(*args, **kwargs):
            yield chunk
