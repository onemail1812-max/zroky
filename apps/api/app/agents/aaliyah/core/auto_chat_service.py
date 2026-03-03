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
    NEW_EMAIL = "new_email"
    URGENT_EMAIL = "urgent_email"
    MEETING_PREP = "meeting_prep"
    PENDING_FOLLOWUP = "pending_followup"
    TASK_REMINDER = "task_reminder"
    CLARIFICATION_NEEDED = "clarification_needed"
    AFTERNOON_DIGEST = "afternoon_digest"
    CALENDAR_CONFLICT = "calendar_conflict"
    VIP_RESPONSE = "vip_response"


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
        """
        Automatically initiate a conversation based on trigger.
        Returns the initial system message payload.
        """
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
    
    async def _handle_new_email(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-chat for any new email: triage + draft + suggest actions."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return None
            
            # Get greeting
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            # Auto-triage if not done
            if not email.category:
                triage_result = await self.triage.classify_email(
                    email.subject,
                    email.body or email.snippet or "",
                    sender=email.sender
                )
                email.category = triage_result.category
                email.priority = triage_result.priority
                email.metadata_json = {
                    **(email.metadata_json or {}),
                    "triage_result": {
                        "category": triage_result.category,
                        "priority": triage_result.priority,
                        "confidence": triage_result.confidence,
                    }
                }
                db.commit()
            
            # Determine urgency level
            is_urgent = email.priority in ["High", "Critical"] or email.category == "PRIORITY"
            
            # Build opening message
            opening_msg = f"📧 {name}, I just received an email from {email.sender}"
            
            if is_urgent:
                opening_msg += " - this one needs your attention:"
            else:
                opening_msg += ":"
            
            # Add email snippet
            snippet = (email.snippet or email.body or "")[:200]
            opening_msg += f"\n\n**{email.subject}**\n{snippet}"
            
            # System payload
            payload = {
                "type": "auto_chat_opening",
                "trigger": ConversationTrigger.NEW_EMAIL.value,
                "email_id": email_id,
                "sender": email.sender,
                "subject": email.subject,
                "category": email.category,
                "priority": email.priority,
                "snippet": snippet,
                "is_urgent": is_urgent,
                "next_action": None  # Will be filled by auto_suggest_action
            }
            
            # Store opening message
            await self._store_system_message(db, user_id, opening_msg, payload)
            
            # If high priority, auto-ask clarification questions
            if is_urgent and email.metadata_json.get("triage_result", {}).get("needs_clarity"):
                questions = email.metadata_json.get("triage_result", {}).get("clarification_questions", [])
                if questions:
                    await self._auto_ask_questions(db, user_id, email_id, questions)
            
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in new_email handler: {e}", exc_info=True)
            return None
    
    async def _handle_urgent_email(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-chat for URGENT emails: immediate action required."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return None
            
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            # Urgent opening
            msg = f"🔴 **URGENT**, {name}!\n\n"
            msg += f"From: {email.sender}\n"
            msg += f"Subject: {email.subject}\n\n"
            msg += f"{(email.snippet or email.body or '')[:300]}\n\n"
            msg += "**What should we do?**\n"
            msg += "- 📝 Draft a reply\n"
            msg += "- 📅 Schedule a call\n"
            msg += "- 🔔 Snooze until later\n"
            msg += "- ➡️ Delegate to someone\n"
            
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
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in urgent_email handler: {e}", exc_info=True)
            return None
    
    async def _handle_clarification_needed(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        questions: List[str],
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-ask clarification questions automatically."""
        try:
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            if not questions:
                return None
            
            msg = f"Hi {name}! Before I draft a response, I need a few clarifications:\n\n"
            for i, q in enumerate(questions, 1):
                msg += f"**Q{i}: {q}**\n"
            
            payload = {
                "type": "clarification_questions",
                "trigger": ConversationTrigger.CLARIFICATION_NEEDED.value,
                "email_id": email_id,
                "questions": questions,
                "awaiting_user_input": True
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in clarification handler: {e}", exc_info=True)
            return None
    
    async def _handle_meeting_prep(
        self,
        db: Session,
        *,
        user_id: str,
        event_id: str,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-chat: Meeting prep 5 minutes before."""
        try:
            event = db.query(CalendarEventSnapshot).filter(
                CalendarEventSnapshot.id == event_id
            ).first()
            if not event:
                return None
            
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            # Retrieve relevant context
            memories = await self.memory.recall(
                query=event.summary or event.title or "",
                top_k=5
            )
            context_text = " | ".join([m.get("content_text", "")[:100] for m in memories])
            
            msg = f"📅 Meeting prep for: **{event.summary or event.title}**\n\n"
            if event.attendees:
                msg += f"Attendees: {event.attendees}\n"
            msg += f"Starts in: 5 minutes\n\n"
            
            if context_text.strip():
                msg += f"**Relevant context:**\n{context_text}\n\n"
            
            msg += "**Suggested materials:**\n"
            msg += "- 📊 Recent emails from attendees\n"
            msg += "- 📝 Talking points\n"
            msg += "- ❓ Open questions\n"
            msg += "- 📋 Agenda\n"
            
            payload = {
                "type": "meeting_prep",
                "trigger": ConversationTrigger.MEETING_PREP.value,
                "event_id": event_id,
                "event_title": event.summary or event.title,
                "attendees": event.attendees,
                "context_summary": context_text
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in meeting_prep handler: {e}", exc_info=True)
            return None
    
    async def _handle_pending_followup(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        days_pending: int = 3,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-nudge: Email waiting for response for N days."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return None
            
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            msg = f"⏰ {name}, this email from {email.sender} has been waiting {days_pending} days:\n\n"
            msg += f"**{email.subject}**\n"
            msg += f"{(email.snippet or '')[:200]}\n\n"
            msg += "**Options:**\n"
            msg += "- 📧 I'll draft a response\n"
            msg += "- ⏳ Snooze for 2 more days\n"
            msg += "- 🗑️ Mark as handled\n"
            msg += "- ⚡ Escalate\n"
            
            payload = {
                "type": "pending_followup",
                "trigger": ConversationTrigger.PENDING_FOLLOWUP.value,
                "email_id": email_id,
                "days_pending": days_pending,
                "sender": email.sender,
                "subject": email.subject
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in pending_followup handler: {e}", exc_info=True)
            return None
    
    async def _handle_afternoon_digest(
        self,
        db: Session,
        *,
        user_id: str,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-digest: 3 PM summary of inbox status."""
        try:
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            # Get counts
            high_priority = db.query(TriagedEmail).filter(
                TriagedEmail.priority.in_(["High", "Critical"]),
                TriagedEmail.status == "unread"
            ).count()
            
            pending_drafts = db.query(TriagedEmail).filter(
                TriagedEmail.status == "draft_ready"
            ).count()
            
            followups = db.query(TriagedEmail).filter(
                TriagedEmail.category == "FOLLOWUP",
                TriagedEmail.status == "pending"
            ).count()
            
            msg = f"📊 Afternoon digest for {name}:\n\n"
            msg += f"🔴 {high_priority} urgent emails needing action\n"
            msg += f"📝 {pending_drafts} drafts ready to review\n"
            msg += f"⏰ {followups} follow-ups pending\n\n"
            msg += "**What would help you most right now?**\n"
            msg += "- 📥 Review high-priority emails\n"
            msg += "- ✍️ Draft responses\n"
            msg += "- 📋 Check follow-ups\n"
            msg += "- ⚙️ Settings\n"
            
            payload = {
                "type": "afternoon_digest",
                "trigger": ConversationTrigger.AFTERNOON_DIGEST.value,
                "high_priority_count": high_priority,
                "pending_drafts_count": pending_drafts,
                "followups_count": followups,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in afternoon_digest handler: {e}", exc_info=True)
            return None
    
    async def _handle_calendar_conflict(
        self,
        db: Session,
        *,
        user_id: str,
        conflicts: List[Dict[str, str]],
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-detect and suggest resolution for calendar conflicts."""
        try:
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            msg = f"⚠️ {name}, I found calendar conflicts:\n\n"
            for conflict in conflicts:
                msg += f"- **{conflict['title1']}** overlaps with **{conflict['title2']}**\n"
            
            msg += "\n**Quick fix options:**\n"
            msg += "- 📅 Auto-reschedule one of them\n"
            msg += "- 🔔 Send apologies to attendees\n"
            msg += "- ✋ I'll skip\n"
            
            payload = {
                "type": "calendar_conflict",
                "trigger": ConversationTrigger.CALENDAR_CONFLICT.value,
                "conflicts": conflicts,
                "awaiting_action": True
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in calendar_conflict handler: {e}", exc_info=True)
            return None
    
    async def _handle_vip_response(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        vip_name: str,
        **context
    ) -> Optional[Dict[str, Any]]:
        """Auto-prioritize VIP response."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return None
            
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            msg = f"⭐ VIP Alert, {name}!\n\n"
            msg += f"{vip_name} just sent you an email:\n"
            msg += f"**{email.subject}**\n\n"
            msg += f"{(email.snippet or '')[:250]}\n\n"
            msg += "🎯 **Priority draft suggestions:**\n"
            msg += "1. Warm, professional tone\n"
            msg += "2. Address directly\n"
            msg += "3. Offer value\n"
            msg += "4. Call to action\n"
            
            payload = {
                "type": "vip_response",
                "trigger": ConversationTrigger.VIP_RESPONSE.value,
                "email_id": email_id,
                "vip_name": vip_name,
                "subject": email.subject,
                "priority_tips": ["warm_tone", "direct_address", "offer_value", "cta"]
            }
            
            await self._store_system_message(db, user_id, msg, payload)
            return payload
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in vip_response handler: {e}", exc_info=True)
            return None
    
    async def _auto_ask_questions(
        self,
        db: Session,
        user_id: str,
        email_id: str,
        questions: List[str]
    ) -> None:
        """Auto-ask clarification questions sequentially."""
        try:
            if not questions:
                return
            
            greeting_service = GreetingService(db, self.workspace_id, user_id)
            name = greeting_service._resolve_name()
            
            # Ask first question immediately
            msg = f"Before I draft that response, {name}, I need to clarify:\n\n"
            msg += f"**Q1: {questions[0]}**"
            
            payload = {
                "type": "auto_question",
                "email_id": email_id,
                "question_index": 0,
                "total_questions": len(questions),
                "question": questions[0],
                "remaining": questions[1:]
            }
            
            # Store message but don't wait for response
            await self._store_system_message(db, user_id, msg, payload)
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_ask_questions: {e}", exc_info=True)
    
    async def _store_system_message(
        self,
        db: Session,
        user_id: str,
        content: str,
        payload: Dict[str, Any]
    ) -> None:
        """Store auto-generated system message in chat history."""
        try:
            repo = ChatRepository(db, self.workspace_id)
            msg_id = f"auto_{uuid.uuid4().hex[:12]}"
            
            repo.add_message(
                id=msg_id,
                role="assistant",
                content=content,
                thread_id=None,  # Global auto-chat
                email_id=payload.get("email_id"),
                msg_type="system_action",
                payload=payload
            )
            db.commit()
            
        except Exception as e:
            logger.error(f"[AutoChat] Error storing message: {e}", exc_info=True)
            db.rollback()
    
    async def auto_execute_follow_through(
        self,
        db: Session,
        *,
        user_id: str,
        email_id: str,
        auto_action: str = "draft"
    ) -> bool:
        """
        Automatically execute follow-through actions (draft, schedule, etc.)
        without additional user input.
        """
        if auto_action == "draft":
            return await self._auto_draft_response(db, user_id, email_id)
        elif auto_action == "schedule":
            return await self._auto_schedule_followup(db, user_id, email_id)
        elif auto_action == "snooze":
            return await self._auto_snooze(db, user_id, email_id)
        
        return False
    
    async def _auto_draft_response(
        self,
        db: Session,
        user_id: str,
        email_id: str
    ) -> bool:
        """Automatically draft a response without user prompting."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return False
            
            # Retrieve context
            memories = await self.memory.recall(
                query=email.subject or email.body or "",
                top_k=3
            )
            
            # Generate draft
            prompt = f"""Draft a professional response to this email:

From: {email.sender}
Subject: {email.subject}

Body:
{email.body or email.snippet or '(No body available)'}

Relevant context:
{' | '.join([m.get('content_text', '')[:100] for m in memories])}

Return strict JSON: {{"subject": "...", "body": "..."}}"""
            
            response = await self.brain.think(
                prompt=prompt,
                system_prompt="You are Aaliyah, an executive assistant. Draft professional, warm, actionable emails.",
                model_override=ModelType.REASONING.value
            )
            
            # Parse and store draft
            try:
                draft_data = json.loads(response.content)
                email.metadata_json = {
                    **(email.metadata_json or {}),
                    "auto_draft": {
                        "subject": draft_data.get("subject", ""),
                        "body": draft_data.get("body", ""),
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                        "status": "ready_for_review"
                    }
                }
                db.commit()
                return True
            except:
                return False
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_draft: {e}", exc_info=True)
            return False
    
    async def _auto_schedule_followup(
        self,
        db: Session,
        user_id: str,
        email_id: str
    ) -> bool:
        """Automatically schedule a meeting or follow-up."""
        try:
            # Implementation would integrate with calendar service
            # For now, just mark it
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return False
            
            email.metadata_json = {
                **(email.metadata_json or {}),
                "auto_scheduled_followup": {
                    "scheduled_at": datetime.now(timezone.utc).isoformat(),
                    "reminder_in_days": 3
                }
            }
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_schedule: {e}", exc_info=True)
            return False
    
    async def _auto_snooze(
        self,
        db: Session,
        user_id: str,
        email_id: str,
        hours: int = 24
    ) -> bool:
        """Automatically snooze email."""
        try:
            email = db.query(TriagedEmail).filter(TriagedEmail.id == email_id).first()
            if not email:
                return False
            
            snooze_until = datetime.now(timezone.utc) + timedelta(hours=hours)
            email.metadata_json = {
                **(email.metadata_json or {}),
                "snoozed_until": snooze_until.isoformat()
            }
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"[AutoChat] Error in auto_snooze: {e}", exc_info=True)
            return False
