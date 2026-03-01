"""Aaliyah orchestrator for Sprint 1 sensory foundation."""
# [IDE FORCE RELOAD CACHE - FILE IS ALREADY FIXED]

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone, timedelta
from email.utils import parseaddr
from app.models.triaged_thread import TriagedThread
import json
import re
import threading
from types import SimpleNamespace
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

from sqlalchemy import func, cast, Text
from sqlalchemy.orm import Session
from app.database import SessionLocal

from app.models.calendar_event_snapshot import CalendarConflict
from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.services.audit_log_service import AuditAction, AuditEntityType, AuditLogService
from app.agents.aaliyah.core.action_executor import ActionExecutor
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor, NormalizedEmailMessage
from app.agents.aaliyah.core.inbox_repository import TriagedInboxRepository
from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine
from app.agents.aaliyah.core.llm_schemas import DraftOutput, parse_draft_output
from app.agents.aaliyah.core.live_feed import LiveEvent, event_bus
from app.agents.aaliyah.core.meeting_prep import MeetingPrepAgent
from app.agents.aaliyah.core.runtime_gate import gate_email
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier, TriageResult
from app.services.brain.core import Brain
from app.services.brain.errors import BrainError
from app.services.brain.guardrails import redact_text
from app.services.brain.schemas.models import ModelType
from app.services.brain.memory import DualStateMemory
from app.agents.aaliyah.core.communication_engine import CommunicationEngine, CommunicationState
from app.agents.aaliyah.core.tools.tool_dispatcher import ToolDispatcher
from app.agents.aaliyah.core.intent_service import IntentService

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
    _state: dict[str, WorkspaceRuntimeState] = {}
    _recipient_re = re.compile(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")

    def __init__(self, workspace_id: str, brain: Optional[Brain] = None):
        self.workspace_id = workspace_id
        self.brain = brain or Brain()
        self.triage_classifier = SmartTriageClassifier(self.brain)
        self.comm_engine = CommunicationEngine()
        self.intent_service = IntentService(self.brain)
        self.dispatcher = ToolDispatcher(workspace_id=workspace_id, brain=self.brain, db=None) # DB set during actual call

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
                setattr(state, key, value)
            state.last_updated_at = datetime.now(timezone.utc).isoformat()
            return state

    async def emit_status(self, event_type: str, message: str, payload: Optional[dict[str, Any]] = None) -> None:
        """Public entry point for background workers to emit events and trigger conversational voice."""
        await self._emit(event_type, message, payload)

    async def flush_communication(self) -> None:
        """Trigger a heartbeat flush of the communication engine."""
        await self._emit("heartbeat", "Checking for updates...")

    async def _emit(self, event_type: str, message: str, payload: Optional[dict[str, Any]] = None) -> None:
        event = LiveEvent(
            workspace_id=self.workspace_id,
            type=event_type,
            message=message,
            payload=payload or {},
        )
        await event_bus.publish(event)
        
        # Persist proactive assistant messages to chat history DB
        # so they survive page refreshes and appear when the user opens the workspace
        if event_type == "assistant_message":
            try:
                from app.models.chat_message import ChatRepository
                import uuid
                persist_db = SessionLocal()
                try:
                    repo = ChatRepository(persist_db, self.workspace_id)
                    text = (payload or {}).get("text", message)
                    thread_id = (payload or {}).get("thread_id")
                    repo.add_message(
                        id=f"proactive_{uuid.uuid4().hex[:12]}",
                        role="assistant",
                        content=text,
                        thread_id=thread_id,
                        msg_type="text",
                        payload=payload,
                    )
                except Exception as persist_err:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to persist proactive message: {persist_err}")
                finally:
                    persist_db.close()
            except Exception:
                pass  # Best-effort persistence
            return

        # Persist new_email_arrival events as rich email_action cards
        if event_type == "new_email_arrival":
            try:
                from app.models.chat_message import ChatRepository
                import uuid
                persist_db = SessionLocal()
                try:
                    repo = ChatRepository(persist_db, self.workspace_id)
                    p = payload or {}
                    sender_name = p.get("sender_name", p.get("sender", "Unknown"))
                    subject = p.get("subject", "No Subject")
                    repo.add_message(
                        id=f"arrival_{uuid.uuid4().hex[:12]}",
                        role="assistant",
                        content=None,
                        thread_id=None,
                        msg_type="email_action",
                        payload={
                            "sender": sender_name,
                            "subject": subject,
                            "snippet": p.get("snippet", ""),
                            "priority": "New",
                            "actions": p.get("actions", []),
                        },
                    )
                except Exception as persist_err:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to persist arrival notification: {persist_err}")
                finally:
                    persist_db.close()
            except Exception:
                pass

        # Persist draft_ready events as rich email_action cards
        if event_type == "draft_ready":
            try:
                from app.models.chat_message import ChatRepository
                import uuid
                persist_db = SessionLocal()
                try:
                    repo = ChatRepository(persist_db, self.workspace_id)
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
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to persist draft notification: {persist_err}")
                finally:
                    persist_db.close()
            except Exception:
                pass

        state = self._get_state()
        p = payload or {}
        
        if event_type == "draft_ready":
            is_urgent = p.get("priority") == "High" or p.get("is_vip", False)
            self.comm_engine.add_event(state.communication, "draft_ready", p, urgent=is_urgent)
        elif event_type == "thread_updated":
            # Map thread updates to priority alerts
            if p.get("priority") == "High" or p.get("is_vip", False):
                self.comm_engine.add_event(state.communication, "priority_added", p, urgent=True)
        elif event_type == "approval_required":
            self.comm_engine.add_event(state.communication, "approval_required", p, urgent=True)
        elif event_type == "followup_scan_complete":
            if p.get("count", 0) > 0:
                self.comm_engine.add_event(state.communication, "followup_due", p)
        elif event_type == "triage_queued" and p.get("priority") == "High":
            self.comm_engine.add_event(state.communication, "priority_added", p)
        elif event_type == "sync_complete":
             cleaned = p.get("cleaned_count", 0)
             if cleaned > 0:
                  self.comm_engine.add_event(state.communication, "cleaned_done", {"count": cleaned})
        elif event_type == "daily_briefing_ready":
             self.comm_engine.add_event(state.communication, "daily_6am_sync_complete", p)
        elif event_type == "sync_failed":
             self.comm_engine.add_event(state.communication, "sync_failed", p, urgent=True)

        # Attempt flush
        db = None
        try:
            db = SessionLocal()
            workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            preferences = workspace.settings_json if workspace else {}
            # Potentially fetch name from settings or default to Boss
            user_name = preferences.get("user_name") or preferences.get("first_name") or "there"
            
            msg = await self.comm_engine.flush(
                state.communication, 
                user_name=user_name, 
                brain=self.brain, 
                preferences=preferences
            )
            if msg:
                 # Recursive call but event_type == "assistant_message" will break it
                 await self._emit("assistant_message", msg, {"text": msg, "role": "assistant"})
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"CommEngine flush failed: {e}")
        finally:
            if db:
                db.close()

    async def broadcast_updates(self, db: Session) -> None:
        """Fetch and broadcast latest counts and stats."""
        # Calculate aggregations
        cat_counts = (
            db.query(TriagedEmail.category, func.count(TriagedEmail.id))
            .filter(TriagedEmail.workspace_id == self.workspace_id)
            .group_by(TriagedEmail.category)
            .all()
        )
        cats = {c: n for c, n in cat_counts}
        
        pri_counts = (
            db.query(TriagedEmail.priority, func.count(TriagedEmail.id))
            .filter(TriagedEmail.workspace_id == self.workspace_id)
            .group_by(TriagedEmail.priority)
            .all()
        )
        pris = {p: n for p, n in pri_counts}
        
        unread = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id, 
            TriagedEmail.is_read == False
        ).count()
        
        needs_reply = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id, 
            TriagedEmail.awaiting_reply == True
        ).count()
        
        followups = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id,
            TriagedEmail.category == "followups"
        ).count()

        # Drafts count (emails with draft in metadata_json)
        drafts_count = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id,
            TriagedEmail.metadata_json.like('%"draft":%')
        ).count()

        payload = {
            "by_category": cats,
            "by_priority": pris,
            "unread": unread,
            "needs_reply": needs_reply,
            "followups": followups,
            "drafts": drafts_count,
            "timestamp": datetime.now(timezone.utc).timestamp()
        }
        
        await self._emit("counts_update", "Updated inbox counts", payload)
        
        # Provider totals
        prov_counts = (
            db.query(TriagedEmail.provider, func.count(TriagedEmail.id))
            .filter(TriagedEmail.workspace_id == self.workspace_id)
            .group_by(TriagedEmail.provider)
            .all()
        )
        provs = {p: n for p, n in prov_counts}
        await self._emit("provider_totals", "Provider breakdown", {"totals": provs})

    async def _audit(
        self,
        db: Session,
        *,
        user_id: str,
        action: AuditAction,
        entity_id: str,
        metadata: Optional[dict[str, Any]] = None,
        undo_payload: Optional[dict[str, Any]] = None,
        explain: Optional[str] = None,
    ) -> None:
        try:
            AuditLogService.log_action(
                db=db,
                workspace_id=self.workspace_id,
                user_id=user_id,
                action=action,
                entity_type=AuditEntityType.ARTIFACT,
                entity_id=entity_id,
                metadata=metadata,
                undo_payload=undo_payload,
                explain_one_liner=explain,
            )
        except Exception:
            return

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
        state = self._get_state()
        
        # Default stats from memory-state (may be 0 after restart)
        stats = {
            "triaged_count": state.triaged_count,
            "queued_count": state.queued_count,
            "pending_approvals": state.pending_approvals,
            "escalations": state.escalations,
            "calendar_events": state.calendar_events,
            "calendar_conflicts": state.calendar_conflicts,
            "priority_count": 0,
            "needs_reply_count": 0,
            "followups_count": 0,
            "drafts_count": 0
        }

        if db:
            try:
                # 1. Total Triaged (Everything in DB for this workspace)
                stats["triaged_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id
                ).count()
                
                # 2. Priority Count (High Priority)
                stats["priority_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.priority == "High"
                ).count()

                # 3. Needs Reply Count (Explicit category or awaiting_reply flag)
                stats["needs_reply_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    (TriagedEmail.category == "Needs Reply") | (TriagedEmail.awaiting_reply == True)
                ).count()
                
                # Alias for legacy queued_count
                stats["queued_count"] = stats["needs_reply_count"]

                # 4. Pending Approvals
                stats["pending_approvals"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.category == "Approvals"
                ).count()

                # 5. Follow-ups Count
                stats["followups_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.category == "Followups"
                ).count()
                
                # Alias for legacy escalations
                stats["escalations"] = stats["followups_count"]

                # 6. Drafts Count
                stats["drafts_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    cast(TriagedEmail.metadata_json, Text).like('%"draft":%')
                ).count()

                # 7. Conflicts
                stats["calendar_conflicts"] = db.query(CalendarConflict).filter(
                    CalendarConflict.workspace_id == self.workspace_id
                ).count()
            except Exception as e:
                logger.error(f"Failed to fetch realtime stats: {e}")
                
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
