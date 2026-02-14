
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync

@dataclass
class TimeSlot:
    start: datetime
    end: datetime
    duration_minutes: int

class AvailabilityEngine:
    """
    Finds free time slots in the user's calendar, respecting working hours and existing events.
    """
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        # Default working hours (could be moved to workspace settings)
        self.work_start_hour = 9
        self.work_end_hour = 17
        self.work_days = {0, 1, 2, 3, 4} # Mon-Fri

    def _get_events_in_range(self, start_dt: datetime, end_dt: datetime) -> List[CalendarEventSnapshot]:
        """Fetch normalized events from DB for the given range."""
        return (
            self.db.query(CalendarEventSnapshot)
            .filter(
                CalendarEventSnapshot.workspace_id == self.workspace_id,
                CalendarEventSnapshot.start_at >= start_dt,
                CalendarEventSnapshot.start_at <= end_dt,
                CalendarEventSnapshot.is_cancelled == False
            )
            .order_by(CalendarEventSnapshot.start_at)
            .all()
        )

    def find_slots(
        self, 
        search_start_dt: datetime, 
        days_ahead: int = 5, 
        min_duration_minutes: int = 30,
        buffer_minutes: int = 15
    ) -> List[TimeSlot]:
        """
        Scan for free blocks of time.
        1. Iterate day by day from search_start_dt.
        2. Define 'work day' window (e.g. 9am - 5pm UTC) for simplicity in Sprint 5.
        3. Subtract existing events retrieved from DB.
        4. Return remaining chunks >= min_duration.
        """
        free_slots: List[TimeSlot] = []
        
        # Ensure UTC
        if not search_start_dt.tzinfo:
            search_start_dt = search_start_dt.replace(tzinfo=timezone.utc)
        else:
            search_start_dt = search_start_dt.astimezone(timezone.utc)
            
        # Iterate days
        for i in range(days_ahead):
            current_date_base = search_start_dt + timedelta(days=i)
            
            # Simple assumption: Mon=0, Sun=6. Skip weekends.
            if current_date_base.weekday() > 4: 
                continue

            # Define work hours window for this day (UTC 9-17)
            day_work_start = current_date_base.replace(hour=self.work_start_hour, minute=0, second=0, microsecond=0)
            day_work_end = current_date_base.replace(hour=self.work_end_hour, minute=0, second=0, microsecond=0)
            
            # If "today" and time is passed, adjust start to now
            if i == 0 and search_start_dt > day_work_start:
                day_work_start = search_start_dt

            if day_work_start >= day_work_end:
                 continue

            # Fetch events overlapping this day's work window
            events = (
                self.db.query(CalendarEventSnapshot)
                .filter(
                    CalendarEventSnapshot.workspace_id == self.workspace_id,
                    CalendarEventSnapshot.end_at > day_work_start,
                    CalendarEventSnapshot.start_at < day_work_end,
                    CalendarEventSnapshot.is_cancelled == False
                )
                .order_by(CalendarEventSnapshot.start_at)
                .all()
            )

            # Subtract busy ranges
            cursor = day_work_start
            
            for event in events:
                # Event start/end in UTC
                evt_start = event.start_at.replace(tzinfo=timezone.utc)
                evt_end = event.end_at.replace(tzinfo=timezone.utc)

                # Gap between cursor and next event?
                # Gap = (Event Start - Buffer) - Cursor
                gap_end = evt_start - timedelta(minutes=buffer_minutes)
                
                if gap_end > cursor:
                    duration_mins = (gap_end - cursor).total_seconds() / 60
                    if duration_mins >= min_duration_minutes:
                        free_slots.append(TimeSlot(start=cursor, end=gap_end, duration_minutes=int(duration_mins)))
                
                # Advance cursor to Event End + Buffer
                next_cursor = evt_end + timedelta(minutes=buffer_minutes)
                if next_cursor > cursor:
                    cursor = next_cursor
            
            # Check remaining time after last event until EOD
            if cursor < day_work_end:
                duration_mins = (day_work_end - cursor).total_seconds() / 60
                if duration_mins >= min_duration_minutes:
                    free_slots.append(TimeSlot(start=cursor, end=day_work_end, duration_minutes=int(duration_mins)))

        return free_slots
