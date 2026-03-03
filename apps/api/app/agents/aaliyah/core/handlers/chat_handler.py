from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, List, TYPE_CHECKING

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.services.audit_log_service import AuditAction
from app.services.brain.errors import BrainError
from app.services.brain.schemas.models import ModelType
from app.services.brain.memory import DualStateMemory
from app.agents.aaliyah.core.runtime_gate import gate_email
from app.agents.aaliyah.core.llm_schemas import DraftOutput, parse_draft_output
from app.agents.aaliyah.core.labeling_rules import LabelingRulesEngine

from .base import BaseHandler

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

class ChatHandler(BaseHandler):
    """Handles chat-based interactions and streaming responses."""

    async def _intent_from_message(self, message: str) -> str:
        """Delegates to the decoupled IntentService."""
        return await self.intent_service.get_intent(message)

    def _extract_recipient(self, message: str) -> Optional[str]:
        # Using the orchestrator's pre-compiled regex
        match = self.orchestrator._recipient_re.search(message or "")
        return match.group(1) if match else None

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

    async def handle_chat(self, db: Session, *, user_id: str, message: str, thread_id: Optional[str] = None, email_id: Optional[str] = None) -> dict[str, Any]:
        self._patch_state(status="thinking", active_task="Analyzing chat instruction")
        await self._emit("thinking", "Analyzing your request")

        memory = DualStateMemory(db, self.workspace_id)
        
        email_context_str = ""
        if email_id:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if email:
                email_context_str = f"Specific Email Context (Focus on this):\nSubject: {email.subject}\nSender: {email.sender}\nDate: {email.received_at}\nBody:\n{email.snippet}\n---\n"
                
        augmented_message = f"{email_context_str}{message}" if email_context_str else message

        context = memory.recall(augmented_message, top_k=3, thread_id=thread_id)
        related_memories = context["memories"]
        intent = await self._intent_from_message(augmented_message)

        if thread_id and intent in {"SUMMARY", "DRAFT"}:
             latest_email = None
             if email_id:
                 latest_email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id, TriagedEmail.needs_clarity == True).first()
             
             if not latest_email:
                 latest_email = (
                     db.query(TriagedEmail)
                     .filter(
                         TriagedEmail.workspace_id == self.workspace_id,
                         TriagedEmail.thread_id == thread_id,
                         TriagedEmail.needs_clarity == True
                     )
                     .order_by(TriagedEmail.received_at.desc())
                     .first()
                 )
             if latest_email:
                 from app.agents.aaliyah.core.drafting import DraftingAgent
                 draft_agent = DraftingAgent(db, self.workspace_id)
                 
                 meta = dict(latest_email.metadata_json or {})
                 meta["clarity_instruction"] = message
                 latest_email.needs_clarity = False 
                 from sqlalchemy.orm.attributes import flag_modified
                 flag_modified(latest_email, "metadata_json")
                 db.commit()

                 await self._emit("clarification_received", "Got it! Re-drafting your reply now...", {"thread_id": thread_id})
                 
                 draft = await draft_agent.generate_draft(latest_email)
                 if draft:
                     await draft_agent.save_draft(latest_email.id, draft)
                     await self._emit("draft_updated", f"I've updated the draft using your instructions.", {"thread_id": thread_id, "has_draft": True})
                     await self._emit("thread_updated", "Draft updated", {"thread_id": thread_id})
                     
                 self._patch_state(status="idle", active_task=None)
                 return {
                     "reply": "Thank you for the clarification! I've updated the draft for your review.",
                     "answer_text": "I've updated the draft with your instructions. Ready for your review.",
                     "details": {"action": "clarification_resolved", "email_id": latest_email.id},
                     "tool_result": {"status": "draft_updated"}
                 }

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

        if gate.allow_llm and intent == "UPDATE_PREFERENCE":
            try:
                from app.agents.aaliyah.core.preferences_agent import PreferencesAgent
                
                label_engine = LabelingRulesEngine(db, self.workspace_id)
                current_payload = label_engine.get_preferences_payload()
                
                pref_agent = PreferencesAgent(self.brain)
                updates = await pref_agent.interpret_update(message, current_payload)
                
                if updates:
                    label_engine.update_preferences(**updates)
                    await self._emit("preference_updated", "Updated labeling preferences based on your request", {"updates": updates})
                    
                    decision["tool"] = "preferences_manager"
                    decision["params"]["updates"] = updates
                    
                    await self._audit(
                         db,
                         user_id=user_id,
                         action=AuditAction.UPDATE,
                         entity_id=f"pref_update:{datetime.now(timezone.utc).timestamp()}",
                         metadata={"updates": updates, "intent": intent},
                         explain="Updated user preferences from natural language instruction"
                    )
                    
                    reply_msg = f"I've updated your preferences: {json.dumps(updates)}"
                    self._patch_state(status="idle", active_task=None)
                    return {
                        "reply": reply_msg,
                        "answer_text": reply_msg,
                        "details": decision,
                        "tool_result": {"status": "updated", "updates": updates}
                    }
                else:
                     self._patch_state(status="idle", active_task=None)
                     return {
                        "reply": "I understood you want to change settings, but I couldn't figure out exactly what to change. Could you be more specific?",
                        "answer_text": "I couldn't identify the specific preference update you requested. Could you clarify?",
                        "details": decision,
                        "tool_result": {"status": "no_change"}
                    }
            except Exception as e:
                logger.error(f"Intent handling failed: {e}", exc_info=True)
                raise e

        if gate.allow_llm and intent in {"SEARCH", "RESEARCH", "CONFLICT"}:
            try:
                await self._emit("thinking", f"Specialized agent '{intent}' thinking...")
                result = await self.dispatcher.dispatch(db, intent, message, decision["params"])
                
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
                
                self._patch_state(status="idle", active_task=None)
                return {
                    "status": result.get("status", "found"),
                    "answer_text": answer,
                    "evidence": result.get("evidence", []),
                    "reply": answer, 
                    "details": decision,
                    "tool_result": result.get("data", result)
                }
            except Exception as e:
                logger.error(f"Intent handling failed: {e}", exc_info=True)
                pass

        self._patch_state(status="acting", active_task="Preparing response artifact")
        await self._emit("acting", "Prepared an actionable response", {"intent": intent})

        memory.save_interaction(
            source_type="chat",
            source_id=f"chat-{datetime.now(timezone.utc).timestamp()}",
            content_text=message,
            metadata={"intent": intent, "critic": critic},
        )

        reply_text = "I've noted that and prepared the next action."
        
        health_info = {}
        if intent in {"DRAFT", "ARCHIVE", "LABEL", "STATUS", "SEARCH", "HEALTH_CHECK"}:
             from app.services.integrations.health_service import ConnectorHealthService
             health_svc = ConnectorHealthService(db, self.workspace_id)
             health_info = health_svc.get_detailed_health()
             
             email_status = health_info.get("email", {}).get("status", "NOT_CONNECTED")
             if email_status != "OK" and intent not in {"HEALTH_CHECK", "SEARCH"}:
                 block_msg = f"Your email connection is currently {email_status}. Please re-authorize in settings."
                 self._patch_state(status="idle", active_task=None)
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
            self._patch_state(status="idle", active_task=None)
            return {
                "reply": reply_text,
                "answer_text": reply_text,
                "details": {**decision, "health": health_info},
                "tool_result": {"status": "ok", "health": health_info}
            }

        if gate.allow_llm:
            try:
                prompt_context = context.get("prompt_context", "")
                workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
                ws_settings = workspace.settings_json or {}
                aaliyah_settings = ws_settings.get("aaliyah", {})
                user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

                conv_system = (
                    f"You are Aaliyah, an elite Executive Assistant for {user_name}.\n"
                    "RULES:\n"
                    "1. Respond using strictly this markdown format:\n"
                    "   **Status**: [current status, e.g. acting, pending_approval, info_provided]\n"
                    "   **Result**: [concise result of the action or reasoning]\n"
                    "   **Next step**: [what you are doing next or what the user should do]\n"
                    "2. Be concise, warm, and professional.\n"
                    "3. If context is provided, use it naturally.\n"
                    "4. (Authentic Ghostwriting): Avoid generic fluff. Do NOT use words like 'delve', 'moreover', 'testament', 'tapestry', 'crucial', or 'vital'. Do NOT use filler phrases.\n"
                    "5. ALWAYS respond in professional English, even if the user speaks in Hindi, Hinglish, or other languages."
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
            except Exception as e:
                logger.warning(f"Conversational generation fallback: {e}")

        self._patch_state(status="idle", active_task=None)
        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.CREATE,
            entity_id=f"chat:{datetime.now(timezone.utc).timestamp()}",
            metadata={"intent": intent, "draft": (draft.model_dump() if hasattr(draft, 'model_dump') else asdict(draft)) if draft else None, "critic": critic},
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

    async def handle_chat_stream(
        self, 
        db: Session, 
        *, 
        user_id: str, 
        message: str, 
        thread_id: Optional[str] = None,
        attachments: Optional[List[Any]] = None
    ):
        self._patch_state(status="thinking", active_task="Analyzing chat instruction")
        await self._emit("thinking", "Analyzing your request")

        memory = DualStateMemory(db, self.workspace_id)
        yield {"type": "status", "content": "Analyzing context..."}

        try:
            context = memory.recall(message, top_k=3, thread_id=thread_id)
            prompt_context = context.get("prompt_context", "")
        except Exception as mem_err:
            logger.warning("Memory recall failed (chat will continue without context): %s", mem_err)
            prompt_context = ""

        llm_images = []
        if attachments:
            from app.services.extraction.file_extractor import FileExtractorService
            attachment_info = "\n\n[USER ATTACHMENTS]:\n"
            
            for att in attachments:
                att_dict = att.model_dump() if hasattr(att, 'model_dump') else att
                name = att_dict.get('name', 'Unknown')
                mime_type = att_dict.get('type', 'Unknown')
                data_b64 = att_dict.get('data', '')
                
                if not data_b64:
                    continue
                    
                try:
                    import base64
                    if "," in data_b64:
                        data_bytes = base64.b64decode(data_b64.split(",")[1])
                    else:
                        data_bytes = base64.b64decode(data_b64)
                except Exception:
                    logger.warning(f"Failed to decode base64 for attachment {name}")
                    continue

                if FileExtractorService.is_image(mime_type):
                    llm_images.append(data_b64)
                    attachment_info += f"- Image: {name} (Passed to Vision Engine)\n"
                else:
                    extracted_text = FileExtractorService.extract_text(data_bytes, mime_type)
                    attachment_info += f"- File: {name} ({mime_type})\n"
                    attachment_info += f"  --- Extracted Content ---\n{extracted_text}\n  --- End Extracted Content ---\n"
            
            prompt_context = f"{prompt_context}\n{attachment_info}"

        from app.models.integration import Integration, IntegrationStatus
        def _check_integrations():
            try:
                integrations = db.query(Integration).filter(Integration.workspace_id == self.workspace_id).all()
                google_ok = any("google" in str(i.provider).lower() and i.status == IntegrationStatus.CONNECTED and i.token_encrypted for i in integrations)
                outlook_ok = any("outlook" in str(i.provider).lower() and i.status == IntegrationStatus.CONNECTED and i.token_encrypted for i in integrations)
                return google_ok or outlook_ok
            except Exception as int_err:
                logger.warning("Integration query failed: %s", int_err)
                return False
        is_connected = await asyncio.to_thread(_check_integrations)
        connection_status_msg = (
            "CONNECTED to inbox and calendar." if is_connected 
            else "DISCONNECTED. You cannot see emails or calendar events right now. Proactively inform the user they must connect in Settings if they ask for data you don't have."
        )

        def _get_workspace_settings():
            try:
                workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
                ws_settings = workspace.settings_json or {} if workspace else {}
                aaliyah_settings = ws_settings.get("aaliyah", {})
                return aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"
            except Exception as ws_err:
                logger.warning("Workspace query failed: %s", ws_err)
                return "there"
        user_name = await asyncio.to_thread(_get_workspace_settings)

        system_prompt = (
            f"You are Aaliyah, an elite AI Chief of Staff for {user_name}.\n"
            f"CONNECTION STATUS: {connection_status_msg}\n\n"
            f"CONTEXT:\n{prompt_context}\n\n"
            "STRICT HUMANIZATION PROTOCOL (Blader/Humanizer Principles):\n"
            "1. NO AI FILLER: Do not use 'delve', 'tapestry', 'testament', 'underscores', 'pivotal', 'crucial', or 'vibrant'.\n"
            "2. NO COPULA AVOIDANCE: Use simple 'is' or 'are'. Avoid 'serves as', 'represents a shift', or 'boasts'.\n"
            "3. VARY THE RHYTHM: Use a mix of short, punchy sentences and longer, thoughtful ones. Avoid same-length sentence monotony.\n"
            "4. NO AI POLISH: Remove 'moreover', 'nonetheless', or sterile tone. Use active voice and be decisive.\n"
            "5. ADAPT TO CONTEXT: Respond concisely and professionally using markdown. Use the provided context precisely.\n"
            "6. ALWAYS respond in professional English."
        )
        
        from app.core.queue import queue, JobType
        
        pending_email = None
        def _find_pending_email():
            pe = None
            try:
                if thread_id:
                    pe = db.query(TriagedEmail).filter(
                        TriagedEmail.thread_id == thread_id,
                        TriagedEmail.workspace_id == self.workspace_id
                    ).first()
                
                recent_emails = db.query(TriagedEmail).filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                ).order_by(TriagedEmail.created_at.desc()).limit(10).all()

                if not pe or not (pe.metadata_json or {}).get("needs_clarity"):
                    found = None
                    for item in recent_emails:
                        if item is None: continue
                        meta = item.metadata_json or {}
                        if meta.get("needs_clarity") and not meta.get("clarification_complete"):
                            found = item
                            break
                    pe = found
            except Exception as te_err:
                logger.warning("TriagedEmail query failed: %s", te_err)
                pe = None
            return pe
        pending_email = await asyncio.to_thread(_find_pending_email)
        
        if pending_email:
            meta = dict(pending_email.metadata_json or {})
            
            if meta.get("clarification_pending_confirmation"):
                confirm_intent = await self._intent_from_message(message)
                confirm_words = ["yes", "yep", "sure", "ok", "draft", "karo", "haan", "go ahead", "y"]
                if confirm_intent in ["ACKNOWLEDGE", "DRAFT", "PROCEED"] or any(w in message.lower() for w in confirm_words):
                    meta["clarification_pending_confirmation"] = False
                    meta["clarification_complete"] = True
                    meta["needs_clarity"] = False
                    pending_email.metadata_json = meta
                    db.commit()
                    
                    reply = "On it! Drafting the reply now. ✍️"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    
                    await queue.enqueue(
                        job_type=JobType.PROCESS_DRAFT.value,
                        payload={
                            "workspace_id": self.workspace_id,
                            "triaged_id": pending_email.id,
                            "message_raw": {}
                        },
                        dedupe_id=f"draft_clarity:{pending_email.id}"
                    )
                    self._patch_state(status="idle", active_task=None)
                    return
                else:
                    reply = "Got it. Let me know when you're ready for me to draft the reply!"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    self._patch_state(status="idle", active_task=None)
                    return

            if meta.get("followup_pending_confirmation"):
                confirm_intent = await self._intent_from_message(message)
                confirm_words = ["yes", "yep", "sure", "ok", "draft", "karo", "haan", "go ahead", "y", "bhej do"]
                deny_words = ["no", "nanhi", "nope", "wait", "later", "stop", "don't", "not now"]
                
                if confirm_intent in ["ACKNOWLEDGE", "DRAFT", "PROCEED"] or any(w in message.lower() for w in confirm_words):
                    meta["followup_pending_confirmation"] = False
                    pending_email.metadata_json = meta
                    db.commit()
                    
                    reply = "Absolutely. I'm preparing that follow-up nudge for you now. ✍️"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    
                    await queue.enqueue(
                        job_type=JobType.PROCESS_DRAFT.value,
                        payload={
                            "workspace_id": self.workspace_id,
                            "triaged_id": pending_email.id,
                            "message_raw": {}
                        },
                        dedupe_id=f"draft_nudge:{pending_email.id}"
                    )
                    self._patch_state(status="idle", active_task=None)
                    return
                elif any(w in message.lower() for w in deny_words):
                    meta["followup_pending_confirmation"] = False
                    meta["last_nudge_at"] = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
                    pending_email.metadata_json = meta
                    db.commit()
                    
                    reply = "No problem at all. I've snoozed the follow-up and I'll remind you again later if needed! 😊"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    self._patch_state(status="idle", active_task=None)
                    return
            
            if meta.get("needs_clarity") and not meta.get("clarification_complete"):
                questions = meta.get("clarification_questions", [])
                answers = meta.get("clarification_answers", [])
                current_idx = meta.get("clarification_current_index", 0)
                
                answers.append({"question": questions[current_idx] if current_idx < len(questions) else "general", "answer": message})
                current_idx += 1
                
                meta["clarification_answers"] = answers
                meta["clarification_current_index"] = current_idx
                
                if current_idx < len(questions):
                    pending_email.metadata_json = meta
                    db.commit()
                    
                    next_q = questions[current_idx]
                    reply = f"Got it! Next question:\n\n**{current_idx + 1}. {next_q}**"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    
                    self._patch_state(status="idle", active_task=None)
                    return
                else:
                    meta["clarification_pending_confirmation"] = True
                    clarity_text = ""
                    for qa in answers:
                        clarity_text += f"Q: {qa['question']}\nA: {qa['answer']}\n\n"
                    meta["clarity_instruction"] = clarity_text.strip()
                    
                    pending_email.metadata_json = meta
                    db.commit()
                    
                    reply = "I've sorted out the details! Shall I go ahead and draft the reply?"
                    for word in reply.split(" "):
                        yield {"type": "chunk", "content": word + " "}
                    
                    self._patch_state(status="idle", active_task=None)
                    return

        intent = await self._intent_from_message(message)
        
        if intent == "COMPOSE_NEW" or (intent == "DRAFT" and not thread_id):
            from app.agents.aaliyah.core.compose_drafting import ComposeDraftingAgent
            agent = ComposeDraftingAgent(db, self.workspace_id)
            async for chunk in agent.handle_compose_intent(message, user_id):
                yield chunk
            self._patch_state(status="idle", active_task=None)
            return

        EMAIL_ACTION_INTENTS = {"DRAFT", "ARCHIVE", "LABEL", "SEARCH", "BRIEFING", "STATUS", "MEETING_PREP", "CREATE_TASK", "CONFLICT", "RESEARCH"}
        
        if not is_connected and intent in EMAIL_ACTION_INTENTS:
            yield {"type": "status", "content": "Checking account status..."}
            
            intent_labels = {
                "DRAFT": "draft or send emails",
                "ARCHIVE": "archive messages",
                "LABEL": "label or categorize emails",
                "SEARCH": "search your inbox or calendar",
                "BRIEFING": "prepare your daily briefing",
                "STATUS": "check your inbox status",
                "MEETING_PREP": "prepare for upcoming meetings"
            }
            action_desc = intent_labels.get(intent, "perform this action")
            
            reply = (
                f"**Status**: action_blocked\n"
                f"**Result**: I cannot {action_desc} because your email account is not connected.\n"
                f"**Next step**: Please go to **Settings > Integrations** and connect your Google or Microsoft account to enable this feature."
            )
            for word in reply.split(" "):
                yield {"type": "chunk", "content": word + " "}
            self._patch_state(status="idle", active_task=None)
            return

        if intent in {"SEARCH", "RESEARCH", "CONFLICT"}:
            try:
                await self._emit("thinking", f"Specialized agent '{intent}' thinking...")
                result = await self.dispatcher.dispatch(db, intent, message, {"query": message})
                
                await self._audit(
                     db,
                     user_id=user_id,
                     action=AuditAction.EXECUTE,
                     entity_id=f"{intent.lower()}:{datetime.now(timezone.utc).timestamp()}",
                     explain=f"Delegated to {intent} agent for: '{message}'",
                     metadata={"query": message, "intent": intent}
                )

                answer = result.get("answer_text") or result.get("answer") or result.get("reply") or "I couldn't find an answer."
                
                for word in answer.split(" "):
                    yield {"type": "chunk", "content": word + " "}
                
                self._patch_state(status="idle", active_task=None)
                return
            except Exception as e:
                logger.error(f"Intent streaming subagent failed: {e}", exc_info=True)
                # Fall through to generic LLM on failure
        
        async for chunk in self.brain.think_stream(
            prompt=message,
            system_prompt=system_prompt,
            model_override=ModelType.CHAT.value,
            temperature_override=0.4,
            image_data=llm_images if llm_images else None
        ):
            yield {"type": "chunk", "content": chunk.content}

        self._patch_state(status="idle", active_task=None)
