
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.triaged_email import TriagedEmail
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType

class MorningBriefingService:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = Brain()

    async def generate_briefing(self) -> str:
        """
        Generate a concise, actionable morning briefing.
        Includes:
        - Critical unread emails with counts by category
        - Today's schedule & first meeting
        - Pending drafts count
        - Any conflicts
        """
        # 1. Fetch High Priority Emails (unread/actionable)
        emails = self._get_priority_emails()
        
        # 1b. Get email stats for richer context
        total_unread = self._count_unread()
        pending_drafts = self._count_pending_drafts()

        # 2. Fetch Today's Schedule
        now = datetime.now(timezone.utc)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
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
        
        # 3. Construct Context for Brain
        if emails:
            email_lines = []
            for e in emails:
                sender = (e.sender or "Unknown").split("<")[0].strip().strip('"')
                email_lines.append(f"- [{e.priority or 'High'}] {e.subject} (From: {sender})")
            email_summary = "\n".join(email_lines)
        else:
            email_summary = "No urgent emails."
        
        stats_line = f"📊 Total unread: {total_unread} | Pending drafts: {pending_drafts}"
        
        schedule_summary = ""
        if not events:
            schedule_summary = "No meetings scheduled today."
        else:
            first_meeting = events[0]
            schedule_summary += f"First meeting is at {first_meeting.start_at.strftime('%H:%M')} ({first_meeting.title}).\n"
            schedule_summary += "**Full Schedule:**\n"
            for evt in events:
                schedule_summary += f"- {evt.start_at.strftime('%H:%M')} - {evt.end_at.strftime('%H:%M')}: {evt.title}\n"

        system_prompt = (
            "You are Aaliyah, an elite Executive Chief of Staff. "
            "Write a 'Morning Briefing' for your principal. "
            "Be concise, professional, and forward-looking. "
            "Start with 'Good morning' and the most critical item. "
            "Use bullet points for actionable items. "
            "End with a motivational note that references the day's workload."
        )
        
        user_prompt = f"""
Here is the data for today ({now.strftime('%A, %B %d, %Y')}):

**Urgent Inbox:**
{email_summary}

{stats_line}

**Calendar:**
{schedule_summary}

**Task:**
Draft a 4-6 sentence briefing. Highlight the first meeting time, any urgent emails needing attention, 
and the overall workload for today. If there are pending drafts, mention they are ready for review.
End with a confident, motivational closing.
"""
        
        response = await self.brain.think(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model_override=ModelType.BRIEFING.value,
            temperature_override=0.6
        )
        
        return response.content

    def _get_priority_emails(self) -> List[TriagedEmail]:
        return (
            self.db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.priority == "High",
                TriagedEmail.is_read == False
            )
            .order_by(TriagedEmail.received_at.desc())
            .limit(8)
            .all()
        )

    def _count_unread(self) -> int:
        return (
            self.db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.is_read == False
            )
            .count()
        )

    def _count_pending_drafts(self) -> int:
        """Count emails that have an unsent draft."""
        emails_with_meta = (
            self.db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.metadata_json.isnot(None)
            )
            .all()
        )
        count = 0
        for e in emails_with_meta:
            meta = e.metadata_json or {}
            draft = meta.get("draft")
            if isinstance(draft, dict) and draft.get("status") != "sent":
                count += 1
        return count
