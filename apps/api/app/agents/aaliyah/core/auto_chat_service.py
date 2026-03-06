"""
Automatic Proactive Chat Service for Aaliyah.
Automatically initiates conversations, asks clarifying questions, and handles workflows autonomously.
Triggered by: new emails, calendar events, pending tasks, user status changes.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from enum import Enum
from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.workspace import Workspace
from app.models.user import User
from app.models.thread import Thread
from app.models.chat_message import ChatMessageRow, ChatRepository
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.services.brain.memory import DualStateMemory
from app.agents.aaliyah.core.triage_service import SmartTriageClassifier
from app.agents.aaliyah.core.greeting_service import GreetingService

logger = logging.getLogger(__name__)

class ConversationTrigger(str, Enum):
    """What triggers automatic conversation initiation."""
    NEW_EMAIL = 'new_email'
    URGENT_EMAIL = 'urgent_email'
    MEETING_PREP = 'meeting_prep'
    PENDING_FOLLOWUP = 'pending_followup'
    TASK_REMINDER = 'task_reminder'
    CLARIFICATION_NEEDED = 'clarification_needed'
    AFTERNOON_DIGEST = 'afternoon_digest'
    CALENDAR_CONFLICT = 'calendar_conflict'
    VIP_RESPONSE = 'vip_response'

class AutoChatService:
    """
    Automatically initiates and drives conversations.
    
    Features:
    - Auto-starts chat when high-priority emails arrive
    - Asks clarification questions automatically
    - Generates follow-up suggestions
    - Provides proactive meeting prep
    - Handles email drafting end-to-end
    """
    
    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.brain = Brain()
        self.triage = SmartTriageClassifier(self.brain)
        self.memory = DualStateMemory()
        
    async def trigger_auto_chat(
        self, 
        db: Session, 
        *, 
        user_id: str, 
        trigger: ConversationTrigger, 
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        context = context or {}
        
        if trigger == ConversationTrigger.NEW_EMAIL:
            return await self._handle_new_email(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.URGENT_EMAIL:
            return await self._handle_urgent_email(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.CLARIFICATION_NEEDED:
            return await self._handle_clarification_needed(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.MEETING_PREP:
            return await self._handle_meeting_prep(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.PENDING_FOLLOWUP:
            return await self._handle_pending_followup(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.AFTERNOON_DIGEST:
            return await self._handle_afternoon_digest(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.CALENDAR_CONFLICT:
            return await self._handle_calendar_conflict(db, user_id=user_id, **context)
        elif trigger == ConversationTrigger.VIP_RESPONSE:
            return await self._handle_vip_response(db, user_id=user_id, **context)
            
        return None

    # Implementations of the handlers
    async def _handle_new_email(self, db: Session, user_id: str, email_id: str = None, **kwargs) -> Optional[Dict[str, Any]]:
        email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email: return None
        greeting_service = GreetingService(db, self.workspace_id, user_id)
        name = greeting_service._resolve_name()
        
        opening_msg = f"📧 {name}, I just received an email from {email.sender}"
        if email.priority in ["High", "Critical"] or email.category == "Priority":
            opening_msg += " - this one needs your attention:"
        else:
            opening_msg += ":"
            
        snippet = email.snippet or email.body or ""
        opening_msg += f"\n\n**{email.subject}**\n{snippet[:200]}"
        
        payload = {
            "type": "auto_chat_opening",
            "trigger": ConversationTrigger.NEW_EMAIL.value,
            "email_id": email_id,
            "sender": email.sender,
            "subject": email.subject,
            "category": email.category,
            "priority": email.priority,
            "snippet": snippet[:200],
            "is_urgent": email.priority in ["High", "Critical"],
            "next_action": "clarify" if (email.metadata_json or {}).get("triage_result", {}).get("needs_clarity") else "draft"
        }
        await self._store_system_message(db, user_id, opening_msg, payload)
        return payload

    async def _handle_urgent_email(self, db: Session, user_id: str, email_id: str = None, **kwargs) -> Optional[Dict[str, Any]]:
        email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email: return None
        greeting_service = GreetingService(db, self.workspace_id, user_id)
        name = greeting_service._resolve_name()
        
        msg = f"🔴 **URGENT**, {name}!\n\nFrom: {email.sender}\nSubject: {email.subject}\n\n{(email.snippet or email.body or '')[:300]}\n\n**What should we do?**\n- 📝 Draft a reply\n- 📅 Schedule a call\n- 🔔 Snooze until later\n- ➡️ Delegate to someone\n"
        
        payload = {
            "type": "urgent_action_required",
            "trigger": ConversationTrigger.URGENT_EMAIL.value,
            "email_id": email_id,
            "sender": email.sender,
            "subject": email.subject,
            "suggested_actions": ["draft", "schedule", "snooze", "delegate"]
        }
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _handle_clarification_needed(self, db: Session, user_id: str, email_id: str = None, questions: List[str] = None, **kwargs) -> Optional[Dict[str, Any]]:
        return await self._auto_ask_questions(db, user_id=user_id, email_id=email_id, questions=questions)

    async def _handle_meeting_prep(self, db: Session, user_id: str, event_id: str = None, **kwargs) -> Optional[Dict[str, Any]]:
        msg = "I've prepared a brief for your upcoming meeting."
        payload = {"type": "meeting_prep", "event_id": event_id}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _handle_pending_followup(self, db: Session, user_id: str, email_id: str = None, days_pending: int = 3, **kwargs) -> Optional[Dict[str, Any]]:
        msg = f"It's been {days_pending} days. Do you want me to follow up?"
        payload = {"type": "pending_followup", "email_id": email_id}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _handle_afternoon_digest(self, db: Session, user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        msg = "Here is your afternoon digest of pending items."
        payload = {"type": "afternoon_digest"}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _handle_calendar_conflict(self, db: Session, user_id: str, conflicts: List[Dict[str, str]] = None, **kwargs) -> Optional[Dict[str, Any]]:
        # Check if any are hard overlaps
        has_overlap = any(c.get("type") == "overlap" for c in (conflicts or []))
        if has_overlap:
            msg = "You have a direct calendar overlap. Should I reschedule one of these for you?"
        else:
            msg = "Your calendar is looking tight with back-to-back meetings. Want me to add some buffer time?"
            
        payload = {"type": "calendar_conflict", "conflicts": conflicts}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _handle_vip_response(self, db: Session, user_id: str, email_id: str = None, vip_name: str = None, **kwargs) -> Optional[Dict[str, Any]]:
        msg = f"Important email from VIP: {vip_name}."
        payload = {"type": "vip_response", "email_id": email_id, "vip_name": vip_name}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _auto_ask_questions(self, db: Session, user_id: str, email_id: str, questions: List[str]) -> Optional[Dict[str, Any]]:
        q_str = "\n".join([f"- {q}" for q in questions])
        msg = f"Before I can draft a response, I need clarification on:\n{q_str}"
        payload = {"type": "clarification_needed", "email_id": email_id, "questions": questions}
        await self._store_system_message(db, user_id, msg, payload)
        return payload

    async def _store_system_message(self, db: Session, user_id: str, content: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Stores a system message in the chat repository."""
        try:
            repo = ChatRepository(db, self.workspace_id)
            msg_id = f"auto_{uuid.uuid4().hex[:12]}"
            repo.add_message(
                id=msg_id,
                role="assistant",
                content=content,
                thread_id=None,
                email_id=payload.get("email_id"),
                msg_type="system_action",
                payload=payload
            )
            db.commit()
            return None
        except Exception as e:
            logger.error(f"[AutoChat] Error storing message: {e}", exc_info=True)
            db.rollback()
            return None

    async def auto_execute_follow_through(self, db: Session, user_id: str, email_id: str, auto_action: str) -> bool:
        if auto_action == "draft":
            return await self._auto_draft_response(db, user_id=user_id, email_id=email_id)
        elif auto_action == "schedule":
            return await self._auto_schedule_followup(db, user_id=user_id, email_id=email_id)
        elif auto_action == "snooze":
            return await self._auto_snooze(db, user_id=user_id, email_id=email_id)
        return False

    async def _auto_draft_response(self, db: Session, user_id: str, email_id: str) -> bool:
        email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email: return False
        
        try:
            memories = self.memory.recall(email.subject or email.body or "", 3)
            prompt = f"Draft a professional response to this email:\n\nFrom: {email.sender}\nSubject: {email.subject}\n\nBody:\n{email.body or email.snippet or '(No body available)'}\n\nRelevant context:\n{' | '.join([m.get('content_text', '')[:100] for m in memories])}\n\nReturn strict JSON: {{\"subject\": \"...\", \"body\": \"...\"}}"
            response = await self.brain.think(prompt, "You are Aaliyah, an executive assistant. Draft professional, warm, actionable emails.", model_override=ModelType.REASONING.value)
            
            draft_data = json.loads(response.content)
            meta = email.metadata_json or {}
            meta["auto_draft"] = {
                "subject": draft_data.get("subject", ""),
                "body": draft_data.get("body", ""),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "status": "ready_for_review"
            }
            email.metadata_json = meta
            db.commit()
            return True
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_draft: {e}", exc_info=True)
            return False
        
    async def _auto_schedule_followup(self, db: Session, user_id: str, email_id: str) -> bool:
        email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email: return False
        try:
            meta = email.metadata_json or {}
            meta["auto_scheduled_followup"] = {
                "scheduled_at": datetime.now(timezone.utc).isoformat(),
                "reminder_in_days": 3
            }
            email.metadata_json = meta
            db.commit()
            return True
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_schedule: {e}", exc_info=True)
            return False
        
    async def _auto_snooze(self, db: Session, user_id: str, email_id: str, hours: int = 24) -> bool:
        email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
        if not email: return False
        try:
            meta = email.metadata_json or {}
            meta["auto_snooze"] = {
                "snoozed_at": datetime.now(timezone.utc).isoformat(),
                "hours": hours
            }
            email.metadata_json = meta
            db.commit()
            return True
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_snooze: {e}", exc_info=True)
            return False
