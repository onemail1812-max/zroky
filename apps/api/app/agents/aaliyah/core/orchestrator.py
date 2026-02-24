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
from sqlalchemy import func
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

    async def _emit(self, event_type: str, message: str, payload: Optional[dict[str, Any]] = None) -> None:
        event = LiveEvent(
            workspace_id=self.workspace_id,
            type=event_type,
            message=message,
            payload=payload or {},
        )
        await event_bus.publish(event)
        
        # Communication Engine Integration
        if event_type == "assistant_message":
            return

        state = self._get_state()
        p = payload or {}
        
        if event_type == "draft_ready":
            self.comm_engine.add_event(state.communication, "draft_ready", p)
        elif event_type == "approval_required":
            self.comm_engine.add_event(state.communication, "approval_required", p)
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
        
        # If DB is provided, get real-time ground truth for counts
        # This removes "dummy" 0 counts after restart
        stats = {
            "triaged_count": state.triaged_count,
            "queued_count": state.queued_count,
            "pending_approvals": state.pending_approvals,
            "escalations": state.escalations,
            "calendar_events": state.calendar_events,
            "calendar_conflicts": state.calendar_conflicts,
        }

        if db:
            try:
                # Triaged Count (Total Inbox)
                stats["triaged_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id
                ).count()
                
                # Queued Count (Waiting for user or system reply)
                stats["queued_count"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.category == "Needs Reply"
                ).count()

                # Pending Approvals
                stats["pending_approvals"] = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.category == "Approvals"
                ).count()

                # Conflicts
                stats["calendar_conflicts"] = db.query(CalendarConflict).filter(
                    CalendarConflict.workspace_id == self.workspace_id
                ).count()
            except Exception:
                pass
                
        return stats

    async def list_inbox(
        self,
        db: Session,
        *,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        include_noise: bool = False,
        queue: Optional[str] = None,
    ) -> dict[str, Any]:
        repo = TriagedInboxRepository(db, self.workspace_id)
        
        # If queue is provided, it takes precedence over category/priority
        q = queue or category
        if priority == "High" and not q:
            q = "priority"

        threads, total = repo.list_threads(
            queue=q,
            limit=limit,
            offset=offset
        )
        
        return {
            "items": [
                {
                    "id": row.id,
                    "provider": row.provider,
                    "thread_id": row.thread_id,
                    "sender": row.sender,
                    "subject": row.subject,
                    "snippet": row.snippet,
                    "received_at": row.received_at.isoformat() if row.received_at else None,
                    "category": row.category,
                    "priority": row.priority,
                    "is_noise": row.is_noise,
                    "is_read": row.is_read,
                    "confidence": row.confidence,
                    "reasoning": row.reasoning,
                    "message_count": 1,
                    "requires_approval": row.requires_approval or False,
                    "awaiting_reply": row.awaiting_reply or False,
                    "draft": (row.metadata_json or {}).get("draft"),
                    "metadata": row.metadata_json,
                }
                for row in threads
            ],
            "count": total,
        }

    def list_calendar_conflicts(self, db: Session, limit: int = 50) -> dict[str, Any]:
        rows = (
            db.query(CalendarConflict)
            .filter(CalendarConflict.workspace_id == self.workspace_id)
            .order_by(CalendarConflict.updated_at.desc())
            .limit(max(1, min(limit, 200)))
            .all()
        )
        return {
            "conflicts": [
                {
                    "id": row.id,
                    "event_a_id": row.event_a_id,
                    "event_b_id": row.event_b_id,
                    "conflict_type": row.conflict_type,
                    "conflict_minutes": int(row.conflict_minutes) if row.conflict_minutes else None,
                    "explain": row.explain,
                    "briefing": (row.metadata_json or {}).get("briefing"),
                }
                for row in rows
            ],
            "count": len(rows),
        }

    def _intent_from_message(self, message: str) -> str:
        """Weighted intent classification with scoring to prevent false positives."""
        text = (message or "").lower().strip()
        if not text:
            return "SUMMARY"

        scores: dict[str, float] = {
            "DRAFT": 0.0,
            "ARCHIVE": 0.0,
            "LABEL": 0.0,
            "CREATE_TASK": 0.0,
            "UPDATE_PREFERENCE": 0.0,
            "MEETING_PREP": 0.0,
            "BRIEFING": 0.0,
            "STATUS": 0.0,
            "SEARCH": 0.0,
            "HEALTH_CHECK": 0.0,
            "RESEARCH": 0.0,
            "CONFLICT": 0.0,
        }

        # Research intent
        if any(w in text for w in ("summarize the project", "deep dive", "research", "briefing on", "project update")):
            scores["RESEARCH"] += 2.0
        
        # Conflict
        if any(w in text for w in ("conflict", "overlap", "reschedule", "double booked")):
            scores["CONFLICT"] += 2.0

        # Draft intent: must show clear drafting desire, not just mention "email"
        if any(neg in text for neg in ("don't", "don't", "not", "no need to")):
            if "draft" in text:
                scores["DRAFT"] -= 1.5
        if any(w in text for w in ("draft a reply", "write a reply", "compose", "draft an email", "write an email")):
            scores["DRAFT"] += 2.0
        if any(w in text for w in ("reply to", "respond to")):
            scores["DRAFT"] += 1.5
        if "draft" in text:
            scores["DRAFT"] += 0.8

        # Archive
        if "archive" in text and not any(neg in text for neg in ("don't archive", "do not archive", "never archive", "not archive")):
            scores["ARCHIVE"] += 2.0

        # Label
        if any(w in text for w in ("label", "tag", "categorize")) and not any(neg in text for neg in ("don't label", "no need to label", "stop labeling", "don't tag")):
            scores["LABEL"] += 2.0

        # Task
        if any(w in text for w in ("create task", "add task", "todo", "to-do", "reminder")) and not any(neg in text for neg in ("don't create", "no need to add", "not a task")):
            scores["CREATE_TASK"] += 2.0

        # Preference update
        if any(w in text for w in ("rule", "preference", "don't label", "always label", "stop labeling", "start labeling", "internal domain")):
            scores["UPDATE_PREFERENCE"] += 2.0
        if any(w in text for w in (" vip", "vips", "mark as vip", "add to vip")):
            scores["UPDATE_PREFERENCE"] += 1.5

        if any(w in text for w in ("meeting prep", "prepare for meeting", "cheat sheet", "brief me on the meeting", "meeting briefing")) and not any(neg in text for neg in ("don't prepare", "no meeting prep", "stop preparing")):
            scores["MEETING_PREP"] += 2.0
            
        if "?" in text:
            scores["SEARCH"] += 0.5
        if any(w in text for w in ("search", "find", "show me", "look for", "where is", "when is", "did", "has", "what is")) and not any(neg in text for neg in ("don't search", "stop searching", "no need to find")):
            scores["SEARCH"] += 1.5
        if any(w in text for w in ("email from", "sent by", "calendar", "meeting with")):
            scores["SEARCH"] += 1.0

        # Briefing
        if any(w in text for w in ("morning briefing", "daily briefing", "what's my day", "today's agenda", "give me a briefing")) and not any(neg in text for neg in ("stop briefing", "no briefing", "don't brief")):
            scores["BRIEFING"] += 2.0

        # Status
        if any(w in text for w in ("status", "what's happening", "inbox status", "how many emails", "how many unread")):
            scores["STATUS"] += 2.0

        # Health / Connection
        if any(w in text for w in ("mail connected", "email connected", "connection status", "is my email working", "check connection", "health")):
            scores["HEALTH_CHECK"] += 2.5

        # Pick highest scoring intent, fallback to SUMMARY
        best_intent = max(scores, key=scores.get)  # type: ignore
        if scores[best_intent] < 0.5:
            return "SUMMARY"
        return best_intent

    def _extract_recipient(self, message: str) -> Optional[str]:
        match = self._recipient_re.search(message or "")
        return match.group(1) if match else None

    def _sender_display(self, sender: Optional[str]) -> str:
        raw = str(sender or "").strip()
        if not raw:
            return "Unknown Sender"
        name, email_addr = parseaddr(raw)
        if name:
            return name
        if email_addr:
            return email_addr.split("@", 1)[0] or email_addr
        return raw[:60]

    def _parse_critic(self, raw: str) -> dict[str, Any]:
        text = raw.strip()
        if "```json" in text:
            text = text.split("```json", 1)[1].split("```", 1)[0].strip()
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
        return {"must_refine": False, "issues": [], "notes": "No structured critic output."}

    async def _generate_draft_with_reflection(
        self,
        *,
        user_message: str,
        related_memories: list[dict[str, Any]],
        prompt_context: str = "",
    ) -> tuple[DraftOutput, dict[str, Any]]:
        memory_snippets = "\n".join([str(m.get("content_text") or "")[:200] for m in related_memories[:3]])

        # Build full context block (hot state + knowledge graph + memories)
        context_block = ""
        if prompt_context:
            context_block += f"{prompt_context}\n\n"
        if memory_snippets.strip():
            context_block += f"Relevant past context:\n{memory_snippets}\n"


        # Thought
        thought_system = (
            "You are Aaliyah. Draft an executive-quality email response. "
            "Return strict JSON only: subject, body, tone_tags, confidence."
        )
        thought_prompt = (
            f"Instruction:\n{user_message}\n\n"
            f"{context_block}\n"
            "Draft the reply now."
        )
        thought = await self.brain.think(
            prompt=thought_prompt,
            system_prompt=thought_system,
            model_override=ModelType.REASONING.value,
            temperature_override=0.2,
        )
        draft = parse_draft_output(thought.content)

        # Critic
        critic_system = (
            "You are a strict communication critic. "
            "Return JSON with keys: must_refine (bool), issues (list[str]), notes (str)."
        )
        critic_prompt = (
            f"Original instruction:\n{user_message}\n\n"
            f"Draft subject: {draft.subject}\nDraft body:\n{draft.body}\n"
            "Critique tone, warmth, clarity, and actionability."
        )
        critic_response = await self.brain.think(
            prompt=critic_prompt,
            system_prompt=critic_system,
            model_override=ModelType.FAST.value,
            temperature_override=0.0,
        )
        critic = self._parse_critic(critic_response.content)

        if not bool(critic.get("must_refine")):
            return draft, critic

        # Refine
        refine_system = (
            "You are Aaliyah refining an email draft. "
            "Return strict JSON only: subject, body, tone_tags, confidence."
        )
        issues = critic.get("issues") or []
        refine_prompt = (
            f"Instruction:\n{user_message}\n\n"
            f"Current draft subject: {draft.subject}\nCurrent draft body:\n{draft.body}\n\n"
            f"Critic issues: {issues}\n"
            "Refine the draft accordingly."
        )
        refined_response = await self.brain.think(
            prompt=refine_prompt,
            system_prompt=refine_system,
            model_override=ModelType.REASONING.value,
            temperature_override=0.15,
        )
        refined = parse_draft_output(refined_response.content)
        return refined, critic

    async def handle_chat(self, db: Session, *, user_id: str, message: str) -> dict[str, Any]:
        self._patch_state(status="thinking", active_task="Analyzing chat instruction")
        await self._emit("thinking", "Analyzing your request")

        # --- Dual-State Memory: recall full context ---
        memory = DualStateMemory(db, self.workspace_id)
        context = memory.recall(message, top_k=3)
        related_memories = context["memories"]
        intent = self._intent_from_message(message)

        gate = gate_email(
            db=db,
            user_id=user_id,
            workspace_id=self.workspace_id,
            intent=intent,
            subject="User chat request",
            body=message,
            context={"source": "chat", "is_actionable": True},
            model_confidence=1.0,
        )

        decision: dict[str, Any] = {
            "action": intent.lower(),
            "tool": "email_manager" if intent in {"DRAFT", "LABEL", "ARCHIVE"} else "none",
            "params": {"action": intent.lower()},
            "context": {"related_memories": related_memories},
            "gate": {
                "outcome": gate.outcome,
                "require_approval": gate.require_approval,
                "risk_domain": gate.risk.domain,
                "risk_score": gate.risk.score,
                "explain": gate.explain_one_liner,
            },
        }

        if gate.require_approval:
            state = self._get_state()
            self._patch_state(
                status="idle",
                active_task=None,
                pending_approvals=state.pending_approvals + 1,
                escalations=state.escalations + (1 if gate.outcome in {"ESCALATE", "SUMMARY_ONLY"} else 0),
            )
            await self._emit("approval_required", "Request requires approval", {"gate": decision["gate"]})
            await self._audit(
                db,
                user_id=user_id,
                action=AuditAction.CREATE,
                entity_id=f"chat:{datetime.now(timezone.utc).timestamp()}",
                metadata={"intent": intent, "gate": decision["gate"]},
                explain=gate.explain_one_liner,
            )
            return {
                "reply": "I prepared the request summary and flagged it for approval.",
                "answer_text": "I've flagged this request for your approval before proceeding.",
                "details": decision,
                "tool_result": {"status": "approval_required"},
            }

        draft: Optional[DraftOutput] = None
        critic: dict[str, Any] = {}
        if gate.allow_llm and intent == "DRAFT":
            try:
                draft, critic = await self._generate_draft_with_reflection(
                    user_message=message,
                    related_memories=related_memories,
                    prompt_context=context.get("prompt_context", ""),
                )
                recipient = self._extract_recipient(message)
                decision["params"].update(
                    {
                        "recipient": recipient,
                        "subject": draft.subject,
                        "body": draft.body,
                        "tone_tags": draft.tone_tags,
                        "confidence": draft.confidence,
                        "critic": critic,
                    }
                )
            except (BrainError, ValueError):
                state = self._get_state()
                self._patch_state(status="idle", active_task=None, pending_approvals=state.pending_approvals + 1)
                return {
                    "reply": "I couldn't generate a high-confidence draft safely. Please provide details for manual review.",
                    "answer_text": "I couldn't generate a safe draft for this. I've queued it for manual review.",
                    "details": decision,
                    "tool_result": {"status": "manual_review_required"},
                }

        # --- PREFERENCES AGENT ---
        if gate.allow_llm and intent == "UPDATE_PREFERENCE":
            try:
                from app.agents.aaliyah.core.preferences_agent import PreferencesAgent
                
                label_engine = LabelingRulesEngine(db, self.workspace_id)
                current_payload = label_engine.get_preferences_payload()
                
                pref_agent = PreferencesAgent(self.brain)
                updates = await pref_agent.interpret_update(message, current_payload)
                
                if updates:
                    updated_row = label_engine.update_preferences(**updates)
                    await self._emit("preference_updated", "Updated labeling preferences based on your request", {"updates": updates})
                    
                    decision["tool"] = "preferences_manager"
                    decision["params"]["updates"] = updates
                    
                    # Audit
                    await self._audit(
                         db,
                         user_id=user_id,
                         action=AuditAction.UPDATE,
                         entity_id=f"pref_update:{datetime.now(timezone.utc).timestamp()}",
                         metadata={"updates": updates, "intent": intent},
                         explain="Updated user preferences from natural language instruction"
                    )
                    
                    reply_msg = f"I've updated your preferences: {json.dumps(updates)}"
                    return {
                        "reply": reply_msg,
                        "answer_text": reply_msg,
                        "details": decision,
                        "tool_result": {"status": "updated", "updates": updates}
                    }
                else:
                     return {
                        "reply": "I understood you want to change settings, but I couldn't figure out exactly what to change. Could you be more specific?",
                        "answer_text": "I couldn't identify the specific preference update you requested. Could you clarify?",
                        "details": decision,
                        "tool_result": {"status": "no_change"}
                    }
            except Exception as e:
                import logging
                import traceback
                logger.error(f"Intent handling failed: {e}", exc_info=True)
                logging.getLogger(__name__).error(f"PreferencesAgent failed: {e}")
                raise e

        # --- DECENTRALIZED TOOL DISPATCHER (Search, Research, Conflict) ---
        if gate.allow_llm and intent in {"SEARCH", "RESEARCH", "CONFLICT"}:
            try:
                # Update dispatcher with current DB session
                self.dispatcher.db = db
                
                # Emit searching state
                await self._emit("thinking", f"Specialized agent '{intent}' thinking...")
                
                result = await self.dispatcher.dispatch(intent, message, decision["params"])
                
                # Audit
                await self._audit(
                     db,
                     user_id=user_id,
                     action=AuditAction.EXECUTE,
                     entity_id=f"{intent.lower()}:{datetime.now(timezone.utc).timestamp()}",
                     explain=f"Delegated to {intent} agent for: '{message}'",
                     metadata={"query": message, "intent": intent}
                )

                decision["tool"] = f"{intent.lower()}_subagent"
                answer = result.get("answer_text") or result.get("answer") or result.get("reply")
                
                return {
                    "status": result.get("status", "found"),
                    "answer_text": answer,
                    "evidence": result.get("evidence", []),
                    "reply": answer, 
                    "details": decision,
                    "tool_result": result.get("data", result)
                }
            except Exception as e:
                import logging
                import traceback
                logger.error(f"Intent handling failed: {e}", exc_info=True)
                logging.getLogger(__name__).error(f"ToolDispatcher failed for {intent}: {e}")
                # Fallback to chat response
                pass

        self._patch_state(status="acting", active_task="Preparing response artifact")
        await self._emit("acting", "Prepared an actionable response", {"intent": intent})

        # --- Dual-State Memory: persist interaction ---
        memory.save_interaction(
            source_type="chat",
            source_id=f"chat-{datetime.now(timezone.utc).timestamp()}",
            content_text=message,
            metadata={"intent": intent, "critic": critic},
        )

        # --- Generate a natural, context-aware conversational reply ---
        reply_text = "I've noted that and prepared the next action."
        
        # --- Mandatory Health Check for Actionable Intents ---
        health_info = {}
        if intent in {"DRAFT", "ARCHIVE", "LABEL", "STATUS", "SEARCH", "HEALTH_CHECK"}:
             from app.services.integrations.health_service import ConnectorHealthService
             health_svc = ConnectorHealthService(db, self.workspace_id)
             health_info = health_svc.get_detailed_health()
             
             # If disconnected and trying to act, override reply
             email_status = health_info.get("email", {}).get("status", "NOT_CONNECTED")
             if email_status != "OK" and intent not in {"HEALTH_CHECK", "SEARCH"}:
                 block_msg = f"Your email connection is currently {email_status}. Please re-authorize in settings."
                 return {
                     "reply": (
                         f"**Status**: action_blocked\n"
                         f"**Result**: I cannot {intent.lower()} because your email is disconnected.\n"
                         f"**Next step**: Please go to Settings > Integrations and authorize your email account."
                     ),
                     "answer_text": block_msg,
                     "details": {**decision, "health": health_info},
                     "tool_result": {"status": "connection_required", "service": "email"}
                 }

        if intent == "HEALTH_CHECK":
            email = health_info.get("email", {})
            cal = health_info.get("calendar", {})
            reply_text = (
                f"**Status**: system_report\n"
                f"**Result**: Email is {email.get('status')} ({email.get('provider', 'none')}) and Calendar is {cal.get('status')}.\n"
                f"**Next step**: {'Everything looks operational.' if email.get('status') == 'OK' else 'Please re-authorize your email to resume operations.'}"
            )
            return {
                "reply": reply_text,
                "answer_text": reply_text,
                "details": {**decision, "health": health_info},
                "tool_result": {"status": "ok", "health": health_info}
            }

        if gate.allow_llm:
            try:
                prompt_context = context.get("prompt_context", "")
                conv_system = (
                    "You are Aaliyah, an elite Executive Assistant.\n"
                    "RULES:\n"
                    "1. Respond using strictly this markdown format:\n"
                    "   **Status**: [current status, e.g. acting, pending_approval, info_provided]\n"
                    "   **Result**: [concise result of the action or reasoning]\n"
                    "   **Next step**: [what you are doing next or what the user should do]\n"
                    "2. Be concise, warm, and professional.\n"
                    "3. If context is provided, use it naturally.\n"
                    "4. (Authentic Ghostwriting): Avoid generic fluff. Do NOT use words like 'delve', 'moreover', 'testament', 'tapestry', 'crucial', or 'vital'. Do NOT use filler phrases."
                )
                conv_prompt = (
                    f"{prompt_context}\n\n" if prompt_context else ""
                ) + f"User says: {message}\n\nRespond following the strict Status/Result/Next step format:"

                conv_response = await self.brain.think(
                    prompt=conv_prompt,
                    system_prompt=conv_system,
                    model_override=ModelType.CHAT.value,
                    temperature_override=0.5,
                )
                reply_text = conv_response.content.strip() or reply_text
            except Exception:
                pass

        self._patch_state(status="idle", active_task=None)
        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.CREATE,
            entity_id=f"chat:{datetime.now(timezone.utc).timestamp()}",
            metadata={"intent": intent, "draft": asdict(draft) if draft else None, "critic": critic},
            explain="Generated chat response artifact",
        )
        return {
            "status": "found",
            "answer_text": reply_text,
            "reply": reply_text,
            "evidence": [],
            "details": decision,
            "tool_result": {"status": "ready"},
        }

    async def handle_chat_stream(self, db: Session, *, user_id: str, message: str):
        """
        Streaming version of handle_chat using Native SSE.
        Yields chunks as they arrive from the LLM, plus final payload.
        """
        self._patch_state(status="thinking", active_task="Analyzing chat instruction")
        await self._emit("thinking", "Analyzing your request")

        from app.services.brain.memory import DualStateMemory
        memory = DualStateMemory(db, self.workspace_id)
        
        # We start by sending an initial "thinking" chunk to the client
        yield {"type": "status", "content": "Analyzing context..."}

        # 1. Triage & Decision Fast-Path
        intent = self._intent_from_message(message)
        
        # We skip the complex gating for the stream version to keep it fast,
        # but in a real app you'd evaluate the risk domain here.
        yield {"type": "status", "content": "Formulating response..."}
        
        # 2. Main LLM Stream Setup
        try:
            from openai import AsyncOpenAI
            from app.config import settings
            
            # Use the same API key fallback chain as Brain.__init__
            api_key = settings.brain_api_key or settings.openrouter_api_key
            if not api_key:
                yield {"type": "error", "content": "No API key configured. Please set BRAIN_API_KEY or OPENROUTER_API_KEY in your .env file."}
                return
            
            client = AsyncOpenAI(
                base_url=settings.openrouter_base_url,
                api_key=api_key,
                default_headers={
                    "HTTP-Referer": settings.openrouter_app_url,
                    "X-Title": settings.openrouter_app_name,
                },
            )
            
            system_prompt = (
                "You are Aaliyah, an elite AI Executive Assistant. "
                "Respond directly, sharply, and professionally to the user's chat message. "
                "Use markdown formatting if helpful.\n\n"

                "## MANDATORY WRITING RULES (Anti-AI Humanizer)\n"
                "Your writing MUST sound like a real human wrote it. Follow every rule below:\n\n"

                "1. BANNED WORDS: Never use: delve, moreover, testament, tapestry, crucial, vital, underscore, "
                "pivotal, landscape (abstract), foster, garner, showcase, enduring, enhance, interplay, intricate, "
                "vibrant, profound, nestled, groundbreaking, renowned, breathtaking, stunning, Additionally.\n"

                "2. NO SIGNIFICANCE INFLATION: Don't puff up importance. No 'stands as', 'serves as a reminder', "
                "'marks a pivotal moment', 'reflects broader trends', 'setting the stage'.\n"

                "3. NO -ING ANALYSES: Don't tack on fake depth with '-ing' phrases like 'highlighting...', "
                "'underscoring...', 'emphasizing...', 'reflecting...', 'contributing to...'.\n"

                "4. NO PROMOTIONAL TONE: Don't sound like an ad. No 'boasts a', 'rich heritage', "
                "'commitment to excellence', 'in the heart of'.\n"

                "5. NO VAGUE ATTRIBUTIONS: Don't say 'experts believe', 'industry observers note', "
                "'some critics argue'. Be specific or don't attribute.\n"

                "6. NO COPULA AVOIDANCE: Use 'is/are/has' instead of 'serves as', 'stands as', 'represents', "
                "'boasts', 'features'.\n"

                "7. NO NEGATIVE PARALLELISMS: Don't use 'Not only...but...', 'It's not just about X, it's about Y'.\n"

                "8. NO RULE OF THREE: Don't force ideas into groups of three. Two or four is fine.\n"

                "9. NO EM DASH OVERUSE: Use commas or periods instead of em dashes (—).\n"

                "10. NO SYCOPHANCY: Never say 'Great question!', 'You're absolutely right!', 'Of course!', 'Certainly!'.\n"

                "11. NO FILLER PHRASES: Cut 'In order to', 'It is important to note that', 'At this point in time', "
                "'Due to the fact that', 'has the ability to'.\n"

                "12. NO GENERIC CONCLUSIONS: Don't end with 'The future looks bright', 'Exciting times lie ahead'.\n"

                "13. NO CHATBOT ARTIFACTS: Never include 'I hope this helps', 'Let me know if you need anything', "
                "'Here is a', 'Would you like me to'.\n"

                "14. HAVE PERSONALITY: Vary sentence length. Have opinions. Use 'I' when natural. "
                "Be specific about feelings. Let some mess in. Short punchy sentences mixed with longer ones.\n"

                "15. USE ACTIVE VOICE: Be direct and decisive. Speak like a busy founder/CEO.\n"

                "16. NO EXCESSIVE HEDGING: Don't over-qualify. Say 'The policy may affect outcomes' not "
                "'It could potentially possibly be argued that the policy might have some effect'.\n"

                "17. NO EMOJI in text. No boldface headers in bullet lists.\n"
            )
            
            # Use fast model for chat (not the slow reasoning model)
            model_name = settings.BRAIN_MODEL  # google/gemini-2.5-flash-lite
            
            stream = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                stream=True,
                temperature=0.3,
            )
            
            full_reply = ""
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        full_reply += delta.content
                        yield {"type": "chunk", "content": delta.content}
            
            # Save memory (non-blocking — don't crash the stream if this fails)
            try:
                memory.save_interaction(
                    source_type="chat_stream",
                    source_id=f"chat-{datetime.now(timezone.utc).timestamp()}",
                    content_text=message,
                    metadata={"intent": intent, "reply": full_reply},
                )
            except Exception:
                pass  # Memory save is best-effort, don't break the user experience
            self._patch_state(status="idle", active_task=None)
            
        except Exception as e:
            import logging
            import traceback
            logger.error(f"Intent handling failed: {e}", exc_info=True)
            logging.getLogger(__name__).error(f"Streaming failed: {e}")
            yield {"type": "error", "content": "I lost connection to my reasoning core."}

    async def _classify_and_persist_email(
        self,
        *,
        db: Session,
        message: NormalizedEmailMessage,
        triage: Optional[TriageResult] = None,
        metadata: Optional[dict[str, Any]] = None,
        previous_category: Optional[str] = None,
        deadline_at: Optional[datetime] = None,
        requires_approval: bool = False,
        approval_reason: Optional[str] = None,
        awaiting_reply: bool = False,
    ) -> dict[str, Any]:
        triage_result: TriageResult = triage or await self.triage_classifier.classify(message)
        repo = TriagedInboxRepository(db, self.workspace_id)
        safe_meta = {
            "source": message.source, 
            "is_read": message.is_read,
            "attachments": [a.model_dump() for a in message.metadata.attachments],
            "headers": message.metadata.headers
        }
        # Dynamic Categories based on Blueprint Logic
        final_category = triage_result.category
        final_requires_approval = requires_approval

        # 1. VIP / Priority Rules
        if final_category == "Priority":
             # Highly confident priorities get direct generation
             if triage_result.confidence < 0.85:
                 final_category = "Approvals"
                 final_requires_approval = True
             else:
                 awaiting_reply = True # Always draft for Priority

        # 2. Needs Reply Rules
        elif final_category == "Needs Reply":
             if triage_result.confidence >= 0.85:
                 awaiting_reply = True
                 final_requires_approval = False
             else:
                 final_category = "Approvals"
                 final_requires_approval = True

        elif final_category == "Approvals":
            final_requires_approval = True

        row = repo.upsert(
            provider=message.provider,
            external_message_id=message.id,
            thread_id=message.metadata.thread_id,
            sender=message.metadata.sender,
            subject=message.metadata.subject,
            snippet=message.content,
            received_at=message.created_at,
            category=final_category,
            priority=triage_result.priority,
            is_noise=triage_result.is_noise,
            is_read=message.is_read,
            confidence=triage_result.confidence,
            reasoning=triage_result.reasoning,
            metadata=safe_meta,
            previous_category=previous_category,
            deadline_at=deadline_at,
            requires_approval=final_requires_approval,
            approval_reason=approval_reason,
            awaiting_reply=awaiting_reply,
        )

        # Realtime events
        if row.is_noise and (not previous_category or previous_category != row.category):
             AuditLogService.log_action(
                 db=db,
                 workspace_id=self.workspace_id,
                 user_id="system",
                 action=AuditAction.UPDATE,
                 entity_type=AuditEntityType.ARTIFACT,
                 entity_id=row.thread_id,
                 metadata={"action": "auto_clean", "category": row.category},
                 after_state={"category": row.category, "is_noise": True},
                 explain_one_liner=f"Automatically cleaned {row.category} message from {row.sender}."
             )

        if previous_category and previous_category != row.category:
             await self._emit(
                  "thread_moved", 
                  f"Moved thread to {row.category}", 
                  {"thread_id": row.thread_id, "category": row.category, "previous_category": previous_category}
             )
        else:
             await self._emit(
                  "thread_updated",
                  f"Thread updated",
                  {
                      "thread_id": row.thread_id, 
                      "category": row.category, 
                      "priority": row.priority,
                      "is_read": row.is_read,
                      "id": row.id
                  }
             )
        return {
            "id": row.id,
            "provider": row.provider,
            "external_message_id": row.external_message_id,
            "subject": row.subject,
            "sender": row.sender,
            "category": row.category,
            "priority": row.priority,
            "is_noise": row.is_noise,
            "is_read": row.is_read,
            "confidence": row.confidence,
            "reasoning": row.reasoning,
            "deadline_at": row.deadline_at.isoformat() if row.deadline_at else None,
            "requires_approval": row.requires_approval,
            "approval_reason": row.approval_reason,
            "awaiting_reply": row.awaiting_reply,
            "labels": (row.metadata_json or {}).get("labels", []),
            "label_reasons": (row.metadata_json or {}).get("label_reasons", {}),
            "label_actions": (row.metadata_json or {}).get("label_actions", []),
        }

    async def sync_inbox(
        self,
        db: Session,
        *,
        user_id: str,
        provider: str = "auto",
        max_results: int = 25,
        incremental: bool = True,
    ) -> dict[str, Any]:
        ingestor = EmailIngestor(self.workspace_id, db)
        self._patch_state(status="thinking", active_task="Syncing inbox")
        await self._emit("sync_started", f"Syncing inbox (incremental={incremental})")

        # ZERO-HISTORY: Always use incremental sync.
        # On the first sync after onboarding, this sets the historyId/deltaLink
        # marker and returns empty — no old emails are loaded.
        # Only genuinely new emails (arriving after onboarding) are processed.
        messages, deleted_ids = await ingestor.fetch_incremental(provider=provider)
        
        # 0. Process Deletions (Two-Way Sync)
        if deleted_ids:
            from app.models.triaged_email import TriagedEmail
            deleted_count = db.query(TriagedEmail).filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.external_message_id.in_(deleted_ids)
            ).delete(synchronize_session=False)
            db.commit()
            
            for d_id in deleted_ids:
                await self._emit(
                    "message_deleted", 
                    "Message removed remotely", 
                    {"message_id": d_id}
                )
            
            if deleted_count > 0:
                self.logger.info(f"Two-Way Sync: Removed {deleted_count} deleted emails from Aaliyah.")
        triaged: list[dict[str, Any]] = []
        label_engine = LabelingRulesEngine(db, self.workspace_id)
        upcoming_events = label_engine.list_upcoming_calendar_events(days_ahead=7, limit=200)
        action_executor = ActionExecutor(db)
        memory = DualStateMemory(db, self.workspace_id)

        # Load workspace settings once
        workspace_row = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        settings = getattr(workspace_row, "settings_json", {}) or {}
        aaliyah_settings = settings.get("aaliyah", {})
        
        # Behavior flags
        organize_enabled = aaliyah_settings.get("organize_inbox_enabled", True)
        drafting_enabled = aaliyah_settings.get("draft_replies_enabled", True)
        archive_noise_enabled = aaliyah_settings.get("archive_less_important", False)
        auto_send_enabled = aaliyah_settings.get("auto_send_enabled", False)

        
        # 1. Parallel Classification (Speed up LLM calls)
        import asyncio
        
        # Limit concurrency to 15 to prevent LLM API rate-limit bottlenecks at scale.
        semaphore = asyncio.Semaphore(15)
        
        async def safe_classify(msg):
            async with semaphore:
                try:
                    return await self.triage_classifier.classify(msg)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Classification failed for {msg.id}: {e}")
                    # Fallback triage result
                    from app.agents.aaliyah.core.triage_service import TriageResult
                    return TriageResult(category="Inbox", priority="Medium", is_noise=False, confidence=0.0, reasoning="Classification failed")

        classified_results = await asyncio.gather(*(safe_classify(item) for item in messages))
        
        # 2. Serial Processing (Safe DB writes)
        for item, triage_result in zip(messages, classified_results):
            sender_display = self._sender_display(item.metadata.sender)
            
            history = label_engine.list_recent_thread_history(
                thread_id=item.metadata.thread_id,
                sender=item.metadata.sender,
                limit=8,
            )
            label_decision = label_engine.decide_labels(
                message=item,
                triage=triage_result,
                history=history,
                upcoming_events=upcoming_events,
                workspace_settings=settings,
            )

            # --- Cleaned Engine Integration ---
            final_triage = triage_result
            prev_cat = None
            
            # Apply organization preferences
            if organize_enabled:
                from dataclasses import replace
                if label_decision.priority:
                    final_triage = replace(final_triage, priority=label_decision.priority)
                
                if label_decision.suggested_category and label_decision.suggested_category != triage_result.category:
                    prev_cat = triage_result.category
                    # Replace triage result values
                    final_triage = replace(
                        final_triage, 
                        category=label_decision.suggested_category,
                        is_noise=True if label_decision.suggested_category in ["Newsletter", "Notification", "Receipt"] else final_triage.is_noise
                    )

            # --- Archive Logic (Sprint 2) ---
            should_archive = False
            if archive_noise_enabled and final_triage.is_noise and final_triage.category in ["Newsletter", "Notification"]:
                should_archive = True

            if should_archive:
                try:
                    await action_executor.archive(
                        user_id=user_id,
                        workspace_id=self.workspace_id,
                        provider=item.provider,
                        message_id=item.id,
                        explain_one_liner=f"Automatically archived {final_triage.category} per user settings."
                    )
                    await self._emit(
                        "triage_ignored",
                        f"Archived {final_triage.category} from {sender_display}.",
                        {
                            "message_id": item.id,
                            "category": final_triage.category,
                            "action": "archive"
                        }
                    )
                    continue # Skip further processing for archived items
                except Exception:
                    pass

            if final_triage.is_noise and final_triage.category == "Newsletter":
                await self._emit(
                    "triage_ignored",
                    f"Ignored newsletter from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": final_triage.category,
                        "reasoning": final_triage.reasoning,
                    },
                )
            else:
                await self._emit(
                    "triage_queued",
                    f"Queued {final_triage.category} email from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": final_triage.category,
                        "priority": final_triage.priority,
                    },
                )

            label_actions: list[dict[str, Any]] = []
            if not label_decision.skip_auto and organize_enabled:
                for label_name in label_decision.labels:
                    explain = label_decision.reasons.get(label_name) or f"Applied {label_name} by deterministic rule."
                    try:
                        action_result = await action_executor.apply_label(
                            user_id=user_id,
                            workspace_id=self.workspace_id,
                            provider=item.provider,
                            message_id=item.id,
                            label_name=label_name,
                            explain_one_liner=explain,
                            risk=SimpleNamespace(score=0.05, domain="LOW"),
                            model_confidence=float(triage_result.confidence),
                        )
                        label_actions.append(action_result)
                        await self._emit(
                            "label_applied",
                            f"Applied '{label_name}' label",
                            {
                                "message_id": item.id,
                                "provider": item.provider,
                                "label": label_name,
                                "reason": explain,
                                "audit_id": action_result.get("audit_id"),
                            },
                        )
                    except Exception as exc:
                        label_actions.append(
                            {
                                "status": "failed",
                                "message_id": item.id,
                                "label_name": label_name,
                                "error": redact_text(str(exc)),
                            }
                        )

            is_awaiting_reply = ("Awaiting Reply" in label_decision.labels) if organize_enabled else False
            
            triaged_row = await self._classify_and_persist_email(
                db=db,
                message=item,
                triage=final_triage,
                metadata={
                    "source": item.source,
                    "is_read": item.is_read,
                    "labels": label_decision.labels if organize_enabled else [],
                    "label_reasons": label_decision.reasons if organize_enabled else {},
                    "override_applied": label_decision.override_applied,
                    "label_actions": label_actions,
                },
                previous_category=prev_cat,
                deadline_at=label_decision.deadline_at,
                requires_approval=label_decision.requires_approval,
                approval_reason=label_decision.approval_reason,
                awaiting_reply=is_awaiting_reply,
            )

            # Sprint 8: Clear follow-ups if new inbound received (breaking the "waiting on them" cycle)
            # Inbound is defined by triage not being 'OUTBOUND' or 'DRAFT' (though Fetcher usually returns inbounds)
            if final_triage.category not in {"OUTBOUND", "DRAFT"} and item.metadata.thread_id:
                db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.thread_id == item.metadata.thread_id
                ).update({"followup_due_at": None, "followup_snoozed_until": None})
                db.commit()
            
            # --- Drafting Agent: Auto-generate reply for ALL actionable items ---
            # Draft for any non-noise email when drafting is enabled
            should_draft = (
                drafting_enabled
                and not label_decision.skip_auto
                and not final_triage.is_noise
                and final_triage.category not in {"Newsletter", "Notification", "Receipt"}
            )
            if should_draft:
                try:
                    from app.agents.aaliyah.core.drafting import DraftingAgent
                    draft_agent = DraftingAgent(db, self.workspace_id)
                    await self._emit("drafting_started", f"Drafting reply for {sender_display}...", {"message_id": item.id})
                    
                    # Fetch stored object via ID from returned dict
                    stored_email = db.query(TriagedEmail).filter(TriagedEmail.id == triaged_row["id"]).first()
                    if stored_email:
                        draft = await draft_agent.generate_draft(stored_email)
                        if draft:
                            await draft_agent.save_draft(stored_email.id, draft)
                            await self._emit("draft_ready", f"Drafted: {draft.subject}", {"message_id": item.id})
                            triaged_row["has_draft"] = True

                            # --- Proactive Chat Notification ---
                            # Aaliyah tells the user about the new email + draft in the chat feed
                            priority_label = f" [{final_triage.priority}]" if final_triage.priority in {"High", "urgent"} else ""
                            notify_msg = (
                                f"New mail from **{sender_display}**{priority_label}: "
                                f"*{item.metadata.subject or '(No Subject)'}*. "
                                f"{draft.rationale} "
                                f"I've drafted a reply for your review."
                            )
                            await self._emit(
                                "assistant_message",
                                notify_msg,
                                {"text": notify_msg, "role": "assistant", "email_id": item.id, "has_draft": True},
                            )

                            # --- Auto-Send Logic (Sprint 2) ---
                            if auto_send_enabled:
                                try:
                                    await action_executor.send_draft(
                                        user_id=user_id, 
                                        workspace_id=self.workspace_id, 
                                        email_id=stored_email.id,
                                        is_explicit_approval=False
                                    )
                                    await self._emit("auto_sent", f"Auto-sent Reply to {sender_display}", {"message_id": item.id})
                                    triaged_row["draft_status"] = "sent"
                                except PermissionError as exc:
                                     await self._emit("auto_send_blocked", f"Auto-send blocked: {str(exc)}", {"message_id": item.id})
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Drafting failed for {item.id}: {e}")

            triaged.append(triaged_row)
            # --- Dual-State Memory: extract facts from email + store ---
            memory.extract_and_learn_from_email(
                sender=item.metadata.sender or "",
                subject=item.metadata.subject or "",
                body=item.content or "",
                email_id=item.id,
            )

        state = self._get_state()
        self._patch_state(
            status="idle",
            active_task=None,
            triaged_count=state.triaged_count + len(triaged),
            queued_count=max(0, len([t for t in triaged if not t["is_noise"]])),
            last_sync={"gmail": datetime.now(timezone.utc).isoformat(), "calendar": state.last_sync.get("calendar")},
        )
        cleaned_count = len([t for t in triaged if t["is_noise"]])
        await self._emit("sync_complete", f"Triaged {len(triaged)} messages", {"count": len(triaged), "cleaned_count": cleaned_count})
        await self.broadcast_updates(db)
        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_id=f"sync_inbox:{datetime.now(timezone.utc).timestamp()}",
            metadata={
                "provider": provider,
                "triaged_count": len(triaged),
                "labels_applied": sum(
                    len([x for x in (item.get("label_actions") or []) if x.get("status") in {"applied", "already_applied"}])
                    for item in triaged
                ),
            },
            explain="Inbox sync and triage completed",
        )
        return {"items": triaged, "count": len(triaged)}

    async def sync_calendar(
        self,
        db: Session,
        *,
        user_id: str,
        provider: str = "auto",
        window_days: int = 7,
        buffer_minutes: int = 15,
    ) -> dict[str, Any]:
        self._patch_state(status="thinking", active_task="Syncing calendar")
        await self._emit("calendar_sync_started", "Syncing calendar events")

        calendar_sync = CalendarSync(self.workspace_id, db)
        result = await calendar_sync.sync_and_detect(
            provider=provider,
            window_days=window_days,
            max_results=100,
            buffer_minutes=buffer_minutes,
        )

        state = self._get_state()
        self._patch_state(
            status="idle",
            active_task=None,
            calendar_events=int(result.get("event_count", 0)),
            calendar_conflicts=int(result.get("conflict_count", 0)),
            escalations=state.escalations + int(result.get("conflict_count", 0)),
            last_sync={"gmail": state.last_sync.get("gmail"), "calendar": datetime.now(timezone.utc).isoformat()},
        )
        await self._emit(
            "calendar_sync_complete",
            f"Synced {result.get('event_count', 0)} events, detected {result.get('conflict_count', 0)} conflicts",
            {"conflicts": result.get("conflict_count", 0)},
        )

        # --- Meeting Prep Agent: Generate Briefing Notes ---
        # --- Meeting Prep Agent: Generate Briefing Notes ---
        if int(result.get("event_count", 0)) > 0 or int(result.get("conflict_count", 0)) > 0:
            try:
                prep_agent = MeetingPrepAgent(db=db, workspace_id=self.workspace_id, brain=self.brain)
                
                # 1. Brief Conflicts
                conflict_briefs = await prep_agent.scan_and_brief()
                
                # 2. Prepare Upcoming Meetings
                meeting_briefs = await prep_agent.scan_upcoming_meetings()
                
                if conflict_briefs > 0 or meeting_briefs > 0:
                    await self._emit(
                        "briefing_ready",
                        f"Prepared {conflict_briefs} conflict solutions & {meeting_briefs} meeting cheat sheets",
                        {
                            "conflict_briefs": conflict_briefs, 
                            "meeting_briefs": meeting_briefs
                        }
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"MeetingPrepAgent failed: {e}")

        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_id=f"sync_calendar:{datetime.now(timezone.utc).timestamp()}",
            metadata={"provider": provider, "result": result},
            explain="Calendar sync and conflict detection completed",
        )
        return result

    async def run_followup_scan(self, db: Session, user_id: str) -> dict[str, Any]:
        """
        Sprint 8: Hourly worker logic to detect due follow-ups.
        """
        workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        settings = getattr(workspace, "settings_json", {}) or {}
        aaliyah_settings = settings.get("aaliyah", {})
        
        if not aaliyah_settings.get("track_follow_ups", True):
            return {"count": 0, "status": "disabled"}

        self._patch_state(status="thinking", active_task="Scanning follow-ups")
        await self._emit("followup_scan_started", "Scanning for due follow-ups...")

        now = datetime.now(timezone.utc)
        
        # 1. Auto-detect Stale Threads (Sprint 7)
        # Find threads where:
        # - We are awaiting reply (last message was outbound)
        # - Last sent > X days ago (default 3)
        # - Not already in follow-ups
        # - Not noise
        follow_up_days = int(aaliyah_settings.get("auto_follow_up_days", 3))
        threshold = now - timedelta(days=follow_up_days)
        
        stale_threads = (
             db.query(TriagedThread)
             .filter(
                 TriagedThread.workspace_id == self.workspace_id,
                 TriagedThread.awaiting_reply == True,
                 TriagedThread.last_sent_at != None,
                 TriagedThread.last_sent_at < threshold,
                 TriagedThread.category != "followups",
                 TriagedThread.is_noise == False,
                 # Ensure we haven't already marked it due
                 (TriagedThread.followup_due_at == None)
             )
             .limit(50)
             .all()
        )
        
        detected_count = 0
        for thread in stale_threads:
            thread.category = "followups"
            thread.followup_due_at = now
            detected_count += 1
            
            # Audit log
            await self._audit(
                 db,
                 user_id=user_id,
                 action=AuditAction.UPDATE,
                 entity_id=thread.id,
                 metadata={"action": "auto_followup_detect", "days_stale": follow_up_days},
                 explain=f"Moved to Follow-ups: No reply after {follow_up_days} days.",
                 after_state={"category": "followups"}
            )
            
            # Generate Follow-up Draft
            try:
                from app.agents.aaliyah.core.drafting import DraftingAgent
                draft_agent = DraftingAgent(db, self.workspace_id)
                # Find the latest email to attach draft to
                latest_email = (
                    db.query(TriagedEmail)
                    .filter(
                        TriagedEmail.workspace_id == self.workspace_id,
                        TriagedEmail.thread_id == thread.external_thread_id
                    )
                    .order_by(TriagedEmail.received_at.desc())
                    .first()
                )
                
                if latest_email:
                    await self._emit("drafting_started", f"Drafting follow-up for {thread.sender}...", {"thread_id": thread.external_thread_id})
                    draft = await draft_agent.generate_draft(latest_email, is_followup=True)
                    if draft:
                        await draft_agent.save_draft(latest_email.id, draft)
                        thread.has_draft = True
                        if hasattr(draft, 'model_dump'):
                             thread.draft_json = draft.model_dump()
                        else:
                             thread.draft_json = draft.dict()
                        
                        await self._emit("draft_ready", f"Follow-up Drafted: {draft.subject}", {"thread_id": thread.external_thread_id})
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to generate follow-up draft for thread {thread.id}: {e}")
            
            await self._emit(
                 "thread_moved", 
                 f"Auto-moved to Follow-ups (no reply for {follow_up_days} days)", 
                 {"thread_id": thread.external_thread_id, "category": "followups"}
            )
        
        if detected_count > 0:
             db.commit()

        # 2. Process Due Items (Existing manual follow-ups)
        # Find items where current time > followup_due_at AND (no snooze OR current time > snooze)
        due_items = (
            db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.followup_due_at != None,
                TriagedEmail.followup_due_at <= now,
                (TriagedEmail.followup_snoozed_until == None) | (TriagedEmail.followup_snoozed_until <= now)
            )
            .all()
        )

        from app.agents.aaliyah.core.drafting import DraftingAgent
        draft_agent = DraftingAgent(db, self.workspace_id)
        
        found_count = 0
        for item in due_items:
            # 1. Move to followups queue
            item.category = "followups"
            item.awaiting_reply = True # We now need to act on the follow-up
            
            # 2. Generate Follow-up Draft
            # We pass a flag or hint to the drafting agent
            draft = await draft_agent.generate_draft(item, is_followup=True)
            if draft:
                await draft_agent.save_draft(item.id, draft)
                found_count += 1
            
            # Reset due date to prevent immediate re-trigger
            item.followup_due_at = None
            item.followup_snoozed_until = None
        
        db.commit()
        
        self._patch_state(status="idle", active_task=None)
        await self._emit("followup_scan_complete", f"Detected and drafted {found_count} follow-ups.", {"count": found_count})
        await self.broadcast_updates(db)
        return {"count": found_count}

    async def handle_webhook(self, db: Session, *, user_id: str, event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
        event_type_normalized = str(event_type or "").lower().strip()
        if event_type_normalized in {"sync", "inbox_sync", "sync_email"}:
            return await self.sync_inbox(
                db,
                user_id=user_id,
                provider=str(payload.get("provider") or "auto"),
                max_results=int(payload.get("max_results") or 25),
            )

        if event_type_normalized in {"sync_calendar", "calendar_sync"}:
            return await self.sync_calendar(
                db,
                user_id=user_id,
                provider=str(payload.get("provider") or "auto"),
                window_days=int(payload.get("window_days") or 7),
                buffer_minutes=int(payload.get("buffer_minutes") or 15),
            )

        if event_type_normalized in {"new_email", "email_received"}:
            ingestor = EmailIngestor(self.workspace_id, db)
            normalized = await ingestor.normalize_message(payload, provider=str(payload.get("provider") or "unknown"))
            triage_result = await self.triage_classifier.classify(normalized)
            sender_display = self._sender_display(normalized.metadata.sender)
            if triage_result.is_noise and triage_result.category == "Newsletter":
                await self._emit(
                    "thread_processed",
                    f"Ignored newsletter from {sender_display}.",
                    {
                        "thread_id": normalized.metadata.thread_id,
                        "category": "Newsletter",
                        "status": "ignored",
                        "toast": {
                            "type": "info",
                            "message": f"Cleaned: Newsletter from {sender_display}"
                        }
                    },
                )
            else:
                await self._emit(
                    "thread_processed",
                    f"Queued {triage_result.category} from {sender_display}.",
                    {
                        "thread_id": normalized.metadata.thread_id,
                        "category": triage_result.category,
                        "status": "queued",
                        "toast": {
                            "type": "success",
                            "message": f"New: {triage_result.category} from {sender_display}"
                        }
                    },
                )
            label_engine = LabelingRulesEngine(db, self.workspace_id)
            history = label_engine.list_recent_thread_history(
                thread_id=normalized.metadata.thread_id,
                sender=normalized.metadata.sender,
                limit=8,
            )
            label_decision = label_engine.decide_labels(
                message=normalized,
                triage=triage_result,
                history=history,
                upcoming_events=label_engine.list_upcoming_calendar_events(days_ahead=7, limit=150),
            )
            actions: list[dict[str, Any]] = []
            if not label_decision.skip_auto:
                action_executor = ActionExecutor(db)
                for label_name in label_decision.labels:
                    explain = label_decision.reasons.get(label_name) or f"Applied {label_name} by deterministic rule."
                    try:
                        action_result = await action_executor.apply_label(
                            user_id=user_id,
                            workspace_id=self.workspace_id,
                            provider=normalized.provider,
                            message_id=normalized.id,
                            label_name=label_name,
                            explain_one_liner=explain,
                            risk=SimpleNamespace(score=0.05, domain="LOW"),
                            model_confidence=float(triage_result.confidence),
                        )
                        actions.append(action_result)
                    except Exception as exc:
                        actions.append(
                            {
                                "status": "failed",
                                "label_name": label_name,
                                "error": redact_text(str(exc)),
                            }
                        )
            triage = await self._classify_and_persist_email(
                db=db,
                message=normalized,
                triage=triage_result,
                metadata={
                    "labels": label_decision.labels,
                    "label_reasons": label_decision.reasons,
                    "override_applied": label_decision.override_applied,
                    "label_actions": actions,
                },
                deadline_at=label_decision.deadline_at,
                requires_approval=label_decision.requires_approval,
                approval_reason=label_decision.approval_reason,
            )
            
            # --- Drafting Agent: Auto-generate reply for actionable items ---
            if "Awaiting Reply" in label_decision.labels and not label_decision.skip_auto:
                try:
                    from app.agents.aaliyah.core.drafting import DraftingAgent
                    draft_agent = DraftingAgent(db, self.workspace_id)
                    await self._emit("drafting_started", f"Drafting reply for {sender_display}...", {"message_id": normalized.id})
                    
                    # Fetch stored object to pass to agent
                    stored_email = db.query(TriagedEmail).filter(TriagedEmail.id == triage["id"]).first()
                    if stored_email:
                        draft = await draft_agent.generate_draft(stored_email)
                        if draft:
                            await draft_agent.save_draft(stored_email.id, draft)
                            await self._emit("draft_created", f"Drafted: {draft.subject}", {"message_id": normalized.id})
                            # Update returned payload to include draft status
                            triage["has_draft"] = True
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Drafting failed: {e}")

            state = self._get_state()
            self._patch_state(status="idle", active_task=None, triaged_count=state.triaged_count + 1)
            await self._emit("new_email", "New email triaged", triage)
            return {"event": "new_email", "triage": triage}

        await self._emit("noop", "Webhook received but no handler matched", {"type": event_type})
        return {"event": "noop"}

