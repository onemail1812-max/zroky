

import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import text # For direct updates

from app.models.triaged_email import TriagedEmail
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.workspace import Workspace
from app.services.brain.core import Brain
from app.services.brain.memory import DualStateMemory
from app.services.brain.schemas.models import ModelType
from app.services.integrations.health_service import ConnectorHealthService

logger = logging.getLogger(__name__)

class MorningBriefingService:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = Brain()

    async def get_briefing(self) -> str:
        """
        FAST PATH: Retrieve cached briefing or return deterministic state message.
        Does NOT call LLM. Returns < 50ms.
        """
        # 1. Fetch Workspace Settings
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        if not workspace:
            return "Error: Workspace not found."

        settings = workspace.settings_json or {}
        aaliyah_settings = settings.get("aaliyah", {})
        
        # 2. Check Cache (Expiry: 18 hours - effectively "today's briefing")
        last_briefing = aaliyah_settings.get("last_briefing")
        if last_briefing:
            try:
                gen_time = datetime.fromisoformat(last_briefing.get("generated_at"))
                valid_until = gen_time + timedelta(hours=18)
                if datetime.now(timezone.utc) < valid_until:
                    # Cache Hit
                    return last_briefing.get("content", "")
            except Exception:
                pass # Invalid cache

        # 3. Cache Miss - Deterministic Fallback based on Health
        health_svc = ConnectorHealthService(self.db, self.workspace_id)
        health = health_svc.get_detailed_health()
        
        email_status = health.get("email", {}).get("status")
        calendar_status = health.get("calendar", {}).get("status")
        
        # Case A: Not Connected
        if email_status == "NOT_CONNECTED":
            return "I'm Aaliyah. Connect your email to get started with your Morning Briefing."

        # Case B: Sync Needed
        # Check if we actually have data
        has_emails = self._count_unread() > 0 or self._count_total_emails() > 0
        has_events = self._count_todays_events() > 0
        
        if not has_emails and not has_events:
            return "I'm connected, but I haven't synced your data yet. Click 'Sync' to generate your first briefing."

        # Case C: Data Exists but No Briefing (Trigger Generation?)
        # For now, return a placeholder and let the UI/Worker trigger generation
        # We return a specific string that UI can handle or just a polite wait message
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"
        return f"I'm analyzing your latest emails and calendar, {user_name}. Check back in a moment for your full Morning Briefing."

    async def generate_fresh_briefing(self) -> str:
        """
        SLOW PATH: Generate a fresh briefing using LLM.
        MUST run in background worker.
        Includes HARD GUARDRAILS against hallucination.
        """
        logger.info(f"Generating fresh briefing for {self.workspace_id}")
        
        # 1. TRUTH GUARD: Check Health & Data Availability
        health_svc = ConnectorHealthService(self.db, self.workspace_id)
        health = health_svc.get_detailed_health()
        
        if health.get("email", {}).get("status") != "OK":
            logger.warning(f"Aborting briefing generation: Email not OK ({health.get('email')})")
            return "Sync Pending: Please check your email connection."

        # 2. Fetch Data
        emails = self._get_priority_emails()
        total_unread = self._count_unread()
        pending_drafts = self._count_pending_drafts()
        memory = DualStateMemory(self.db, self.workspace_id)
        
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        try:
            events = (
                self.db.query(CalendarEventSnapshot)
                .filter(
                    CalendarEventSnapshot.workspace_id == self.workspace_id,
                    CalendarEventSnapshot.start_at >= day_start,
                    CalendarEventSnapshot.start_at < day_end,
                    CalendarEventSnapshot.is_cancelled == False
                )
                .order_by(CalendarEventSnapshot.start_at)
                .all()
            )
        except Exception:
            events = []

        # 3. GENERATE DATA FINGERPRINT (Semantic Caching)
        fingerprint = self._generate_data_fingerprint(emails, events, total_unread, pending_drafts)
        
        # Check if we can reuse the cached briefing even if it's "freshness" TTL has expired, 
        # as long as the data is identical.
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        if not workspace:
             logger.error(f"Workspace {self.workspace_id} not found during briefing generation.")
             return "Configuration Error: Workspace missing."
             
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        last_briefing = aaliyah_settings.get("last_briefing", {})
        if last_briefing.get("fingerprint") == fingerprint:
            logger.info("Semantic Cache Hit: Data hasn't changed. Reusing cached briefing.")
            return last_briefing.get("content", "")

        # 4. EMPTY STATE GUARD (Deterministic)
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"
        if not emails and not events and total_unread == 0:
            content = (
                f"Good morning, {user_name}. Your workspace is clear today. "
                "No urgent emails, pending drafts, or meetings require your attention. "
                "I'll stand by for new tasks."
            )
            self._cache_briefing(content=content, fingerprint=fingerprint)
            return content

        # 4. Construct Prompt
        email_summary = "No urgent emails."
        if emails:
            lines = []
            for e in emails:
                sender = (e.sender or "Unknown").split("<")[0].strip().strip('"')
                lines.append(f"- [High] {e.subject} (From: {sender})")
            email_summary = "\n".join(lines)
        
        schedule_summary = "No meetings scheduled today."
        meeting_contexts = []
        if events:
            lines = []
            for evt in events:
                time_str = evt.start_at.strftime('%H:%M')
                lines.append(f"- {time_str}: {evt.title}")
                
                # Cognitive Recall for this meeting
                attendees = getattr(evt, 'attendees', []) or []
                meeting_query = f"Meeting about {evt.title} with {', '.join(attendees)}"
                recall_data = memory.recall(meeting_query, top_k=2)
                context_snippet = recall_data.get("prompt_context", "")
                if context_snippet:
                    meeting_contexts.append(f"Meeting: {evt.title}\n{context_snippet}")
            
            schedule_summary = "\n".join(lines)

        meeting_intel_block = "\n\n".join(meeting_contexts) if meeting_contexts else "No specific past context found for today's meetings."

        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}. "
            f"Write a 'Morning Briefing' for {user_name} based ONLY on the provided data. "
            "STRICT RULES:\n"
            "1. DO NOT invent, hallucinate, or assume any information not present in the data.\n"
            "2. PROACTIVE PREP: For each meeting, use the 'Meeting Intelligence' context to provide a one-line 'Cheat Sheet' or 'Talking Point'.\n"
            "3. BE CONCISE (max 5-6 sentences total).\n"
            "4. Structure: Greeting -> Today's Schedule (with Cheat Sheets) -> Urgent Email Summary -> Motivational Closing."
        )
        
        user_prompt = f"""
        Data for {now.strftime('%A, %B %d')}:
        
        [INBOX]
        Unread: {total_unread}
        Drafts Ready: {pending_drafts}
        Top Items:
        {email_summary}
        
        [CALENDAR]
        {schedule_summary}
        
        [MEETING INTELLIGENCE (Past Context)]
        {meeting_intel_block}
        
        Task: Write the briefing.
        """
        
        # 5. Call LLM
        response = await self.brain.think(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model_override=ModelType.BRIEFING.value,
            temperature_override=0.0 # Force determinism
        )
        content = response.content

        # 6. HALLUCINATION POST-CHECK
        # If we had NO meetings, ensure the LLM didn't invent a time like "10:00 AM"
        if not events and (" AM" in content or " PM" in content or ":" in content):
            # Suspicious time found when no events exist
            logger.warning("Potential hallucination detected (time in empty schedule). Reverting to safe fallback.")
            content = "Good morning. I've checked your calendar and you have no meetings scheduled today. " \
                      f"You have {total_unread} unread emails to review."

        # 7. Cache Result
        self._cache_briefing(content=content, fingerprint=fingerprint)
        return content

    def _generate_data_fingerprint(self, emails: list, events: list, unread: int, drafts: int) -> str:
        """Create a unique hash of the data context to prevent redundant LLM calls."""
        email_ids = sorted([e.id for e in emails])
        event_ids = sorted([str(evt.id) for evt in events])
        raw_string = f"unread:{unread}|drafts:{drafts}|emails:{','.join(email_ids)}|events:{','.join(event_ids)}"
        return hashlib.sha256(raw_string.encode()).hexdigest()

    def _cache_briefing(self, content: str, fingerprint: str):
        """Persist to Workspace settings using raw SQL to allow easy JSON partial updates if needed, 
        but ORM is safer for full object update."""
        try:
            workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
            if workspace:
                settings = dict(workspace.settings_json or {})
                if "aaliyah" not in settings:
                    settings["aaliyah"] = {}
                
                settings["aaliyah"]["last_briefing"] = {
                    "content": content,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "fingerprint": fingerprint
                }
                
                workspace.settings_json = settings
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(workspace, "settings_json")
                self.db.commit()
                logger.info("Briefing cached successfully.")
        except Exception as e:
            logger.error(f"Failed to cache briefing: {e}")

    def _get_priority_emails(self) -> list:
        try:
            return (
                self.db.query(TriagedEmail)
                .filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.priority == "High",
                    TriagedEmail.is_read == False
                )
                .order_by(TriagedEmail.received_at.desc())
                .limit(5)
                .all()
            )
        except Exception:
            return []

    def _count_unread(self) -> int:
        try:
            return (
                self.db.query(TriagedEmail)
                .filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.is_read == False
                )
                .count()
            )
        except Exception:
            return 0
        
    def _count_total_emails(self) -> int:
        try:
            return (
                self.db.query(TriagedEmail)
                .filter(TriagedEmail.workspace_id == self.workspace_id)
                .count()
            )
        except Exception:
            return 0

    def _count_pending_drafts(self) -> int:
        from sqlalchemy import cast, Text
        try:
            # [Bug 3.7] Pre-filter at the database level to prevent loading ALL emails into memory
            emails_with_drafts = (
                self.db.query(TriagedEmail)
                .filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    cast(TriagedEmail.metadata_json, Text).like('%"draft":%')
                )
                .all()
            )
            count = 0
            for e in emails_with_drafts:
                meta = e.metadata_json or {}
                draft = meta.get("draft")
                if isinstance(draft, dict) and draft.get("status") != "sent":
                    count += 1
            return count
        except Exception:
            return 0
    
    def _count_todays_events(self) -> int:
        try:
            now = datetime.now(timezone.utc)
            day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            return (
                self.db.query(CalendarEventSnapshot)
                .filter(
                    CalendarEventSnapshot.workspace_id == self.workspace_id,
                    CalendarEventSnapshot.start_at >= day_start,
                    CalendarEventSnapshot.start_at < day_end
                )
                .count()
            )
        except Exception:
            return 0

