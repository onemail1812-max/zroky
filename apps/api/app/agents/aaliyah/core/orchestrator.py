"""Aaliyah orchestrator — async-safe with non-blocking DB ops."""

from __future__ import annotations

import asyncio
import logging
import re
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, Dict
import json
from pathlib import Path
from collections import OrderedDict

from sqlalchemy import func, cast, Text
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
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
from app.agents.aaliyah.core.event_service import EventService

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
    _instances: OrderedDict[str, AaliyahOrchestrator] = OrderedDict()
    _MAX_INSTANCES = 100
    _MAX_STATES = 500
    _state_file = Path("data/workspace_states.json")
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

    @classmethod
    def get_orchestrator(cls, workspace_id: str, brain: Optional[Brain] = None) -> "AaliyahOrchestrator":
        """Get or create singleton orchestrator for a workspace."""
        with cls._state_lock:
            # Check existing
            instance = cls._instances.get(workspace_id)
            if instance is not None:
                # Move to end (LRU behavior)
                cls._instances.move_to_end(workspace_id)
                # optionally swap brain if a new one is provided and differs
                if brain and instance.brain != brain:
                     instance.brain = brain
                     instance.triage_classifier.brain = brain
                     instance.intent_service.brain = brain
                     instance.dispatcher.brain = brain
                return instance
            
            # Prune if too many
            if len(cls._instances) >= cls._MAX_INSTANCES:
                cls._instances.popitem(last=False)
                
            # Create new
            instance = cls(workspace_id, brain)
            cls._instances[workspace_id] = instance
            return instance

    def _load_persisted_state(self) -> WorkspaceRuntimeState:
        try:
            db = SessionLocal()
            workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            if workspace and workspace.settings_json:
                ws_data = workspace.settings_json.get("_runtime_state", {})
                valid_keys = WorkspaceRuntimeState.__dataclass_fields__.keys()
                
                # Reconstruct CommunicationState if present
                comm_data = ws_data.get("communication")
                if comm_data:
                    from app.agents.aaliyah.core.communication_engine import CommunicationEvent
                    pending_events_data = comm_data.get("pending_events", [])
                    pending_events = [CommunicationEvent(**ev) for ev in pending_events_data]
                    comm_state = CommunicationState(
                        last_message_at=comm_data.get("last_message_at", 0.0),
                        pending_events=pending_events
                    )
                    ws_data["communication"] = comm_state
                
                filtered = {k: v for k, v in ws_data.items() if k in valid_keys}
                return WorkspaceRuntimeState(**filtered)
        except Exception as e:
            logger.error(f"Failed to load state from DB: {e}", exc_info=True)
        finally:
            try:
                db.close()
            except:
                pass
        return WorkspaceRuntimeState()

    def _save_persisted_state(self, state: WorkspaceRuntimeState) -> None:
        try:
            db = SessionLocal()
            workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            if workspace:
                settings = workspace.settings_json or {}
                state_dict = asdict(state)
                # Ensure communication state is fully included
                settings["_runtime_state"] = state_dict
                workspace.settings_json = settings
                flag_modified(workspace, "settings_json")
                db.commit()
        except Exception as e:
            logger.error(f"Failed to save state to DB: {e}", exc_info=True)
            db.rollback()
        finally:
            try:
                db.close()
            except:
                pass

    def _get_state(self) -> WorkspaceRuntimeState:
        with self._state_lock:
            state = self._state.get(self.workspace_id)
            if state is None:
                # Prune if too many states
                if len(self._state) >= self._MAX_STATES:
                    # Remove the first (oldest) item
                    self._state.pop(next(iter(self._state)), None)
                
                state = self._load_persisted_state()
                self._state[self.workspace_id] = state
            return state

    def _patch_state(self, **kwargs: Any) -> WorkspaceRuntimeState:
        with self._state_lock:
            state = self._state.get(self.workspace_id)
            if state is None:
                state = self._load_persisted_state()
                self._state[self.workspace_id] = state
            for key, value in kwargs.items():
                if hasattr(state, key):
                    setattr(state, key, value)
            state.last_updated_at = datetime.now(timezone.utc).isoformat()
            self._save_persisted_state(state)
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
        
        # Persist messages and notifications via specialized EventService
        await EventService.persist_event(self.workspace_id, event_type, message, payload)

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
        
        # Persist communication state if modified
        await asyncio.to_thread(self._save_persisted_state, state)

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
                     # Persist state again after successfully flushing (last_message_at changed and events cleared)
                     await asyncio.to_thread(self._save_persisted_state, state)
                     await self._emit("assistant_message", msg, {"text": msg, "role": "assistant"})
            except Exception as e:
                logger.error(f"CommEngine flush failed: {e}", exc_info=True)

    async def broadcast_updates(self, db: Optional[Session] = None) -> None:
        """Fetch and broadcast latest counts and stats (non-blocking)."""
        ws_id = self.workspace_id
        
        # Invalidate related response caches
        try:
            from app.services.cache import invalidate_cache
            invalidate_cache("aaliyah_inbox", workspace_id=ws_id)
            invalidate_cache("aaliyah_counts", workspace_id=ws_id)
            invalidate_cache("aaliyah_threads", workspace_id=ws_id)
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {e}")
        def _fetch_counts():
            # Use SessionLocal for thread safety if no db provided or even if provided (safer for to_thread)
            local_db = SessionLocal()
            try:
                # [Bug 3.3] Keys MUST match what the frontend store.ts updateCountsFromPayload expects
                triaged_count = local_db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.is_read == False).count()
                priority_count = local_db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.priority == "High").count()
                queued_count = local_db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.awaiting_reply == True).count()
                pending_approvals = local_db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.requires_approval == True).count()
                escalations = local_db.query(TriagedEmail).filter(TriagedEmail.workspace_id == ws_id, TriagedEmail.category == "Follow-ups").count()
                return {
                    "triaged_count": triaged_count,
                    "priority_count": priority_count,
                    "queued_count": queued_count,
                    "pending_approvals": pending_approvals,
                    "escalations": escalations,
                }
            finally:
                local_db.close()
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
                stats["queued_count"] = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id, (TriagedEmail.category == "Needs Reply") | (TriagedEmail.awaiting_reply == True)).count()
                stats["escalations"] = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id, TriagedEmail.category == "Follow-ups").count()
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

    @classmethod
    def get_orchestrator(cls, workspace_id: str, brain: Optional[Brain] = None) -> AaliyahOrchestrator:
        """Factory method to get or create a cached orchestrator instance."""
        with cls._state_lock:
            if workspace_id in cls._instances:
                # Move to end (most recently used)
                cls._instances.move_to_end(workspace_id)
                return cls._instances[workspace_id]
            
            # Create new instance
            instance = cls(workspace_id, brain)
            cls._instances[workspace_id] = instance
            
            # Prune cache if exceeds limit
            if len(cls._instances) > cls._MAX_INSTANCES:
                cls._instances.popitem(last=False)
            
            return instance
