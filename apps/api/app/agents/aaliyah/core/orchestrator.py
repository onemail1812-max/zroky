"""Aaliyah orchestrator for Sprint 1 sensory foundation."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from email.utils import parseaddr
import json
import re
import threading
from types import SimpleNamespace
from typing import Any, Optional

from sqlalchemy.orm import Session

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


class AaliyahOrchestrator:
    """Main cognitive loop for chat, inbox sync, and calendar sync."""

    _state_lock = threading.Lock()
    _state: dict[str, WorkspaceRuntimeState] = {}
    _recipient_re = re.compile(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")

    def __init__(self, workspace_id: str, brain: Optional[Brain] = None):
        self.workspace_id = workspace_id
        self.brain = brain or Brain()
        self.triage_classifier = SmartTriageClassifier(self.brain)

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

    async def _emit(self, event_type: str, message: str, payload: Optional[dict[str, Any]] = None) -> None:
        event = LiveEvent(
            workspace_id=self.workspace_id,
            type=event_type,
            message=message,
            payload=payload or {},
        )
        await event_bus.publish(event)

    async def _audit(
        self,
        db: Session,
        *,
        user_id: str,
        action: AuditAction,
        entity_id: str,
        metadata: Optional[dict[str, Any]] = None,
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

    def get_stats(self) -> dict[str, Any]:
        state = self._get_state()
        return {
            "triaged_count": state.triaged_count,
            "queued_count": state.queued_count,
            "pending_approvals": state.pending_approvals,
            "escalations": state.escalations,
            "calendar_events": state.calendar_events,
            "calendar_conflicts": state.calendar_conflicts,
        }

    def list_inbox(
        self,
        db: Session,
        *,
        limit: int = 50,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        include_noise: bool = False,
    ) -> dict[str, Any]:
        repo = TriagedInboxRepository(db, self.workspace_id)
        rows = repo.list_recent(
            limit=limit,
            category=category,
            priority=priority,
            include_noise=include_noise,
        )
        return {
            "items": [
                {
                    "id": row.id,
                    "provider": row.provider,
                    "external_message_id": row.external_message_id,
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
                    "labels": (row.metadata_json or {}).get("labels", []),
                    "label_reasons": (row.metadata_json or {}).get("label_reasons", {}),
                    "label_actions": (row.metadata_json or {}).get("label_actions", []),
                    "draft": (row.metadata_json or {}).get("draft"),
                }
                for row in rows
            ],
            "count": len(rows),
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
        }

        # Draft intent: must show clear drafting desire, not just mention "email"
        if any(w in text for w in ("draft a reply", "write a reply", "compose", "draft an email", "write an email")):
            scores["DRAFT"] += 2.0
        if any(w in text for w in ("reply to", "respond to")):
            scores["DRAFT"] += 1.5
        if "draft" in text:
            scores["DRAFT"] += 0.8

        # Archive
        if "archive" in text:
            scores["ARCHIVE"] += 2.0

        # Label
        if any(w in text for w in ("label", "tag", "categorize")):
            scores["LABEL"] += 2.0

        # Task
        if any(w in text for w in ("create task", "add task", "todo", "to-do", "reminder")):
            scores["CREATE_TASK"] += 2.0

        # Preference update
        if any(w in text for w in ("rule", "preference", "don't label", "always label", "stop labeling", "start labeling", "internal domain")):
            scores["UPDATE_PREFERENCE"] += 2.0
        if any(w in text for w in (" vip", "vips", "mark as vip", "add to vip")):
            scores["UPDATE_PREFERENCE"] += 1.5

        # Meeting prep
        if any(w in text for w in ("meeting prep", "prepare for meeting", "cheat sheet", "brief me on the meeting", "meeting briefing")):
            scores["MEETING_PREP"] += 2.0

        # Briefing
        if any(w in text for w in ("morning briefing", "daily briefing", "what's my day", "today's agenda", "give me a briefing")):
            scores["BRIEFING"] += 2.0

        # Status
        if any(w in text for w in ("status", "what's happening", "inbox status", "how many emails", "how many unread")):
            scores["STATUS"] += 2.0

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
                    
                    return {
                        "reply": f"I've updated your preferences: {json.dumps(updates)}",
                        "details": decision,
                        "tool_result": {"status": "updated", "updates": updates}
                    }
                else:
                     return {
                        "reply": "I understood you want to change settings, but I couldn't figure out exactly what to change. Could you be more specific?",
                        "details": decision,
                        "tool_result": {"status": "no_change"}
                    }
            except Exception as e:
                import logging
                import traceback
                traceback.print_exc()
                logging.getLogger(__name__).error(f"PreferencesAgent failed: {e}")
                raise e

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
        if gate.allow_llm:
            try:
                prompt_context = context.get("prompt_context", "")
                conv_system = (
                    "You are Aaliyah, an elite Executive Chief of Staff. "
                    "Respond naturally and helpfully to the user's message. "
                    "Be concise, warm, and professional. "
                    "If you have relevant context from memory, weave it in naturally. "
                    "Never say 'I processed that'. Give a real, useful answer."
                )
                conv_prompt = (
                    f"{prompt_context}\n\n" if prompt_context else ""
                ) + f"User says: {message}\n\nRespond helpfully:"

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
            "reply": reply_text,
            "details": decision,
            "tool_result": {"status": "ready"},
        }

    async def _classify_and_persist_email(
        self,
        *,
        db: Session,
        message: NormalizedEmailMessage,
        triage: Optional[TriageResult] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        triage_result: TriageResult = triage or await self.triage_classifier.classify(message)
        repo = TriagedInboxRepository(db, self.workspace_id)
        safe_meta = {"source": message.source, "is_read": message.is_read}
        if isinstance(metadata, dict):
            safe_meta.update(metadata)
        row = repo.upsert(
            provider=message.provider,
            external_message_id=message.id,
            thread_id=message.metadata.thread_id,
            sender=message.metadata.sender,
            subject=message.metadata.subject,
            snippet=message.content,
            received_at=message.created_at,
            category=triage_result.category,
            priority=triage_result.priority,
            is_noise=triage_result.is_noise,
            is_read=message.is_read,
            confidence=triage_result.confidence,
            reasoning=triage_result.reasoning,
            metadata=safe_meta,
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
    ) -> dict[str, Any]:
        ingestor = EmailIngestor(self.workspace_id, db)
        self._patch_state(status="thinking", active_task="Syncing inbox")
        await self._emit("sync_started", "Syncing inbox from providers")

        messages = await ingestor.fetch_and_normalize(provider=provider, max_results=max_results)
        triaged: list[dict[str, Any]] = []
        label_engine = LabelingRulesEngine(db, self.workspace_id)
        upcoming_events = label_engine.list_upcoming_calendar_events(days_ahead=7, limit=200)
        action_executor = ActionExecutor(db)
        memory = DualStateMemory(db, self.workspace_id)

        for item in messages:
            triage_result = await self.triage_classifier.classify(item)
            sender_display = self._sender_display(item.metadata.sender)
            if triage_result.is_noise and triage_result.category == "Newsletter":
                await self._emit(
                    "triage_ignored",
                    f"Ignored newsletter from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": triage_result.category,
                        "reasoning": triage_result.reasoning,
                    },
                )
            else:
                await self._emit(
                    "triage_queued",
                    f"Queued {triage_result.category} email from {sender_display}.",
                    {
                        "message_id": item.id,
                        "provider": item.provider,
                        "category": triage_result.category,
                        "priority": triage_result.priority,
                    },
                )
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
            )
            label_actions: list[dict[str, Any]] = []
            if not label_decision.skip_auto:
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

            triaged_row = await self._classify_and_persist_email(
                db=db,
                message=item,
                triage=triage_result,
                metadata={
                    "source": item.source,
                    "is_read": item.is_read,
                    "labels": label_decision.labels,
                    "label_reasons": label_decision.reasons,
                    "override_applied": label_decision.override_applied,
                    "label_actions": label_actions,
                },
            )
            
            # --- Drafting Agent: Auto-generate reply for actionable items ---
            if "Awaiting Reply" in label_decision.labels and not label_decision.skip_auto:
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
                            await self._emit("draft_created", f"Drafted: {draft.subject}", {"message_id": item.id})
                            triaged_row["has_draft"] = True

                            # --- Auto-Send Logic ---
                            # Check workspace preference for auto-sending drafts
                            workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
                            settings_json = getattr(workspace, "settings_json", {}) or {}
                            auto_send = settings_json.get("aaliyah", {}).get("auto_send_enabled", False)

                            if auto_send:
                                try:
                                    await action_executor.send_draft(
                                        user_id=user_id, 
                                        workspace_id=self.workspace_id, 
                                        email_id=stored_email.id
                                    )
                                    await self._emit("auto_sent", f"Auto-sent Reply to {sender_display}", {"message_id": item.id})
                                    triaged_row["draft_status"] = "sent"
                                except Exception as e:
                                    logging.getLogger(__name__).error(f"Auto-send failed: {e}")

                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Drafting failed in sync: {e}")

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
        await self._emit("sync_complete", f"Triaged {len(triaged)} messages", {"count": len(triaged)})
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
                    "triage_ignored",
                    f"Ignored newsletter from {sender_display}.",
                    {
                        "message_id": normalized.id,
                        "provider": normalized.provider,
                        "category": triage_result.category,
                        "reasoning": triage_result.reasoning,
                    },
                )
            else:
                await self._emit(
                    "triage_queued",
                    f"Queued {triage_result.category} email from {sender_display}.",
                    {
                        "message_id": normalized.id,
                        "provider": normalized.provider,
                        "category": triage_result.category,
                        "priority": triage_result.priority,
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
            )
            
            # --- Drafting Agent: Auto-generate reply for actionable items ---
            if "Awaiting Reply" in label_decision.labels and not label_decision.skip_auto:
                try:
                    from app.services.aaliyah.drafting import DraftingAgent
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
