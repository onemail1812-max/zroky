"""Agent for preparing meeting briefings and conflict resolution strategies."""

from __future__ import annotations

import asyncio
import json
from dataclasses import asdict, dataclass
from typing import Any, List, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.calendar_event_snapshot import CalendarConflict, CalendarEventSnapshot
from app.models.triaged_email import TriagedEmail
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType


from starlette.concurrency import run_in_threadpool

@dataclass
class BriefingNote:
    summary: str
    people_involved: List[str]
    recommendation: str
    talking_points: List[str]
    relevant_links: List[dict[str, str]]


class MeetingPrepAgent:
    """Watch calendar conflicts and generate strategic briefing notes."""

    def __init__(self, db: Session, workspace_id: str, brain: Optional[Brain] = None):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = brain or Brain()

    def _get_event(self, identifier: str) -> Optional[CalendarEventSnapshot]:
        # 1. Try Primary Key (Internal ID)
        evt = (
            self.db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == self.workspace_id,
                CalendarEventSnapshot.id == identifier,
            )
            .first()
        )
        if evt:
            return evt

        # 2. Fallback to External ID
        return (
            self.db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == self.workspace_id,
                CalendarEventSnapshot.external_event_id == identifier,
            )
            .first()
        )

    def _find_related_emails(self, email_addresses: List[str]) -> List[TriagedEmail]:
        """Find recent emails from the organizers to provide context."""
        if not email_addresses:
            return []
        
        # Simple match for now: sender contains the email address
        # In a generic way using OR
        filters = [TriagedEmail.sender.like(f"%{addr}%") for addr in email_addresses if addr]
        if not filters:
            return []

        return (
            self.db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                or_(*filters)
            )
            .order_by(TriagedEmail.received_at.desc())
            .limit(5)
            .all()
        )

    def _fetch_conflicts(self):
        return (
            self.db.query(CalendarConflict)
            .filter(CalendarConflict.workspace_id == self.workspace_id)
            .all()
        )

    async def generate_conflict_briefing(self, conflict: CalendarConflict) -> Optional[BriefingNote]:
        event_a, event_b = await asyncio.gather(
            run_in_threadpool(self._get_event, conflict.event_a_id),
            run_in_threadpool(self._get_event, conflict.event_b_id),
        )

        if not event_a or not event_b:
            return None

        # Gather context
        organizers = []
        if event_a.organizer and "@" in event_a.organizer:
            organizers.append(str(event_a.organizer))
        if event_b.organizer and "@" in event_b.organizer:
            organizers.append(str(event_b.organizer))
            
        recent_emails = await run_in_threadpool(self._find_related_emails, organizers)
        
        email_context = ""
        if recent_emails:
            email_context = "Recent Email Context:\n"
            for email in recent_emails:
                email_context += f"- From {email.sender}: {email.subject} (Snippet: {email.snippet[:100]})\n"
        else:
            email_context = "No recent emails found from organizers."

        # Build Context
        context = (
            f"Conflict Type: {conflict.conflict_type}\n"
            f"Explanation: {conflict.explain}\n\n"
            f"Event A: {event_a.title}\n"
            f" - Time: {event_a.start_at} to {event_a.end_at}\n"
            f" - Organizer: {event_a.organizer}\n\n"
            f"Event B: {event_b.title}\n"
            f" - Time: {event_b.start_at} to {event_b.end_at}\n"
            f" - Organizer: {event_b.organizer}\n\n"
            f"{email_context}"
        )

        # Fetch User Profile
        from app.models.workspace import Workspace
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}. "
            f"Analyze the calendar conflict for {user_name} and provide a briefing note. "
            "Return valid JSON with keys: summary, people_involved (list[str]), recommendation, talking_points (list[str]), relevant_links (list[dict{title, url}])."
        )
        
        prompt = (
            f"{context}\n\n"
            "Analyze this conflict. identifying key people involved and recommending a resolution strategy "
            "(e.g. which to reschedule based on seniority or flexibility).\n"
            "If email context provided suggests urgency or importance, factor that in.\n"
            "Provide 2-3 talking points to handle the situation diplomatically."
        )

        try:
            response = await self.brain.think(
                prompt=prompt,
                system_prompt=system_prompt,
                model_override=ModelType.BRIEFING.value,
                temperature_override=0.2,
            )
            
            raw_content = response.content.strip()
            if "```json" in raw_content:
                raw_content = raw_content.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in raw_content:
                 raw_content = raw_content.split("```", 1)[1].split("```", 1)[0].strip()
            
            data = json.loads(raw_content)
            
            return BriefingNote(
                summary=data.get("summary", "Conflict detected."),
                people_involved=data.get("people_involved", []),
                recommendation=data.get("recommendation", "Review manually."),
                talking_points=data.get("talking_points", []),
                relevant_links=data.get("relevant_links", [])
            )
        except Exception:
            return BriefingNote(
                summary=f"Conflict between {event_a.title} and {event_b.title}",
                people_involved=[str(event_a.organizer), str(event_b.organizer)],
                recommendation="Please review calendar.",
                talking_points=[],
                relevant_links=[]
            )

    async def scan_and_brief(self) -> int:
        """Find unbriefed conflicts and generate notes."""
        conflicts = await run_in_threadpool(self._fetch_conflicts)
        
        count = 0
        for conflict in conflicts:
            meta = conflict.metadata_json or {}
            # Skip if already briefed
            if meta.get("briefing"):
                continue

            briefing = await self.generate_conflict_briefing(conflict)
            if briefing_note := briefing:
                # We need to save this carefully.
                # Since conflict is attached to session in threadpool?
                # Using run_in_threadpool for saving is safer.
                await run_in_threadpool(self._save_conflict_briefing, conflict.id, briefing_note)
                count += 1
            
        return count
    
    def _save_conflict_briefing(self, conflict_id: str, briefing: BriefingNote):
        conflict = (
            self.db.query(CalendarConflict)
            .filter(CalendarConflict.id == conflict_id)
            .first()
        )
        if conflict:
            meta = conflict.metadata_json or {}
            meta["briefing"] = asdict(briefing)
            conflict.metadata_json = dict(meta)
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(conflict, "metadata_json")
            self.db.commit()

    async def generate_meeting_briefing(self, event_id: str) -> Optional[BriefingNote]:
        """Generate a detailed cheat sheet for a specific meeting."""
        event = await run_in_threadpool(self._get_event, event_id)
        if not event:
            return None

        # Gather context
        people = []
        if event.organizer and "@" in event.organizer:
            people.append(str(event.organizer))
        
        # Try to find attendees in metadata if available
        meta = event.metadata_json or {}
        if meta.get("attendees"):
            for att in meta.get("attendees", []): # type: ignore
                if isinstance(att, dict) and att.get("email"):
                     people.append(att["email"])
                elif isinstance(att, str) and "@" in att:
                     people.append(att)
        
        people = list(set(people)) # dedupe
        recent_emails = await run_in_threadpool(self._find_related_emails, people)
        
        email_context = ""
        if recent_emails:
            email_context = "Recent Email Context (from attendees):\n"
            for email in recent_emails:
                email_context += f"- From {email.sender}: {email.subject} (Snippet: {email.snippet[:150]}...)\n"
        else:
            email_context = "No recent emails found from attendees."

        context = (
            f"Meeting: {event.title}\n"
            f"Time: {event.start_at} to {event.end_at}\n"
            f"Organizer: {event.organizer}\n"
            f"Attendees: {', '.join(people)}\n"
            f"Description/Agenda: {meta.get('description', 'No description provided.')}\n\n"
            f"{email_context}"
        )

        # Fetch User Profile (already have access to workspace settings potentially, but let's be safe)
        from app.models.workspace import Workspace
        workspace = self.db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        aaliyah_settings = (workspace.settings_json or {}).get("aaliyah", {})
        user_name = aaliyah_settings.get("user_name") or aaliyah_settings.get("first_name") or "there"

        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}. "
            "Analyze the meeting details and recent email history to provide a strategic summary. "
            "Return valid JSON with keys: summary, people_involved (list[str]), recommendation (strategic advice), talking_points (list[str]), relevant_links (list[dict{title, url}])."
        )

        prompt = (
            f"{context}\n\n"
            "Prepare a briefing for this meeting. \n"
            "1. Summarize the goal based on title/agenda.\n"
            "2. Identify any tension or open loops from recent emails.\n"
            "3. Provide 3 strategic talking points or questions to drive the meeting forward.\n"
            "4. If no agenda is clear, suggest one."
        )

        try:
            response = await self.brain.think(
                prompt=prompt,
                system_prompt=system_prompt,
                model_override=ModelType.BRIEFING.value,
                temperature_override=0.3, # Slightly more creative for strategy
            )
            
            raw_content = response.content.strip()
            if "```json" in raw_content:
                raw_content = raw_content.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in raw_content:
                 raw_content = raw_content.split("```", 1)[1].split("```", 1)[0].strip()
            
            data = json.loads(raw_content)
            
            return BriefingNote(
                summary=data.get("summary", f"Meeting with {event.organizer}"),
                people_involved=data.get("people_involved", people),
                recommendation=data.get("recommendation", "Prepare standard agenda."),
                talking_points=data.get("talking_points", []),
                relevant_links=data.get("relevant_links", [])
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to generate meeting briefing: {e}")
            return BriefingNote(
                summary=f"Meeting: {event.title}",
                people_involved=people,
                recommendation="Standard preparation recommended.",
                talking_points=["Confirm agenda", "Review recent emails manually"],
                relevant_links=[]
            )

    def _fetch_upcoming_events(self, lookahead_hours: int):
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        future = now + timedelta(hours=lookahead_hours)
        return (
            self.db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == self.workspace_id,
                CalendarEventSnapshot.start_at >= now,
                CalendarEventSnapshot.start_at <= future,
                CalendarEventSnapshot.is_cancelled == False
            )
            .all()
        )
    
    def _save_meeting_briefing(self, event_id: str, briefing: BriefingNote):
        # We need to re-fetch to attach to session if passed across threads?
        # Or just use ID.
        event = self._get_event(event_id)
        if event:
             meta = event.metadata_json or {}
             meta["meeting_prep"] = asdict(briefing)
             event.metadata_json = dict(meta)
             from sqlalchemy.orm.attributes import flag_modified
             flag_modified(event, "metadata_json")
             self.db.commit()

    async def scan_upcoming_meetings(self, lookahead_hours: int = 24) -> int:
        """Find upcoming meetings and generate cheat sheets."""
        events = await run_in_threadpool(self._fetch_upcoming_events, lookahead_hours)

        count = 0
        for event in events:
            # Skip if it's a conflict-only event or all-day placeholder (heuristic)
            if event.title.lower() in ["out of office", "busy"]:
                continue
            
            # Use event.id which is string, safe to pass
            meta = event.metadata_json or {}
            if meta.get("meeting_prep"):
                continue
                
            briefing = await self.generate_meeting_briefing(event.id)
            if briefing_note := briefing:
               await run_in_threadpool(self._save_meeting_briefing, event.id, briefing_note)
               count += 1
            
        return count
