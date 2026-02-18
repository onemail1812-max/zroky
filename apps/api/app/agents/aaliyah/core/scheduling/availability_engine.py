try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from typing import List, Optional
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from sqlalchemy.orm import Session
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.workspace import Workspace

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
        
        # Load settings
        workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        settings = (workspace.settings_json or {}).get("aaliyah", {}) if workspace else {}
        
        # Working Hours (Sprint 2 schema)
        self.work_start_hour = 9
        self.work_end_hour = 17
        
        start_str = settings.get("working_hours_start", "09:00")
        end_str = settings.get("working_hours_end", "17:00")
        
        try:
            self.work_start_hour = int(start_str.split(":")[0])
            self.work_end_hour = int(end_str.split(":")[0])
        except (ValueError, IndexError):
            pass

        # Use defaults for now as days aren't in the new UI toggle yet but might be in the JSON
        self.work_days = set(settings.get("working_hours_days", [0, 1, 2, 3, 4]))
        self.default_duration = settings.get("default_meeting_duration", 30)
        
        # Timezone
        self.user_tz_name = settings.get("timezone", "UTC")
        try:
            self.user_tz = ZoneInfo(self.user_tz_name)
        except Exception:
            # Fallback for systems with missing tzdata (common in some restricted environments)
            self.user_tz = timezone.utc
            self.user_tz_name = "UTC"

    def find_slots(
        self, 
        search_start_dt: datetime, 
        days_ahead: int = 5, 
        min_duration_minutes: int = 30,
        buffer_minutes: int = 15
    ) -> List[TimeSlot]:
        """
        Scan for free blocks of time in UTC.
        """
        free_slots: List[TimeSlot] = []
        
        # Ensure UTC context for DB query
        if not search_start_dt.tzinfo:
            search_start_dt = search_start_dt.replace(tzinfo=timezone.utc)
        else:
            search_start_dt = search_start_dt.astimezone(timezone.utc)
            
        # Iterate days in User's Timezone
        user_now = search_start_dt.astimezone(self.user_tz)
        
        for i in range(days_ahead):
            current_day = (user_now + timedelta(days=i)).date()
            
            if current_day.weekday() not in self.work_days:
                continue

            # Define work hours window for this day in User's Timezone
            day_work_start = datetime.combine(current_day, datetime.min.time()).replace(tzinfo=self.user_tz).replace(hour=self.work_start_hour)
            day_work_end = datetime.combine(current_day, datetime.min.time()).replace(tzinfo=self.user_tz).replace(hour=self.work_end_hour)
            
            # If "today", adjust start to now
            if i == 0 and user_now > day_work_start:
                day_work_start = user_now

            if day_work_start >= day_work_end:
                 continue

            # Convert to UTC for DB query
            utc_start = day_work_start.astimezone(timezone.utc)
            utc_end = day_work_end.astimezone(timezone.utc)

            # Fetch events overlapping this day's work window
            events = (
                self.db.query(CalendarEventSnapshot)
                .filter(
                    CalendarEventSnapshot.workspace_id == self.workspace_id,
                    CalendarEventSnapshot.end_at > utc_start,
                    CalendarEventSnapshot.start_at < utc_end,
                    CalendarEventSnapshot.is_cancelled == False
                )
                .order_by(CalendarEventSnapshot.start_at)
                .all()
            )

            # Subtract busy ranges
            cursor = day_work_start
            
            for event in events:
                # Event start/end (DB stores UTC, we convert to User TZ for logic)
                evt_start = event.start_at.replace(tzinfo=timezone.utc).astimezone(self.user_tz)
                evt_end = event.end_at.replace(tzinfo=timezone.utc).astimezone(self.user_tz)

                # Check gap between cursor and event start
                gap_end = evt_start - timedelta(minutes=buffer_minutes)
                
                if gap_end > cursor:
                    duration_mins = (gap_end - cursor).total_seconds() / 60
                    if duration_mins >= min_duration_minutes:
                        free_slots.append(TimeSlot(start=cursor, end=gap_end, duration_minutes=int(duration_mins)))
                
                # Advance cursor
                next_cursor = evt_end + timedelta(minutes=buffer_minutes)
                if next_cursor > cursor:
                    cursor = next_cursor
            
            # Check remaining time after last event
            if cursor < day_work_end:
                duration_mins = (day_work_end - cursor).total_seconds() / 60
                if duration_mins >= min_duration_minutes:
                    free_slots.append(TimeSlot(start=cursor, end=day_work_end, duration_minutes=int(duration_mins)))

        return free_slots

    def propose_n_slots(
        self,
        search_start_dt: datetime,
        n: int = 3,
        duration_minutes: Optional[int] = None,
        days_ahead: int = 7
    ) -> List[datetime]:
        """
        Discrete slot generator.
        Finds exactly N starting times, prioritizing variety across days/times.
        """
        dur = duration_minutes or self.default_duration
        blocks = self.find_slots(search_start_dt, days_ahead=days_ahead, min_duration_minutes=dur)
        
        proposed: List[datetime] = []
        
        # Strategy: round-robin or fill-up?
        # Let's try to get at least one from each distinct block first (variety across days)
        # Then verify we have N. If not, go back and pick more from the large blocks.
        
        # 1. Collect all potential slots from all blocks
        all_potential_slots = []
        for block in blocks:
            # Discretize block into slots
            # Step by 30 mins (or duration)
            # If duration is 30, step 30. If duration 60, step 30 provides more options?
            # Let's step by 'dur' for simplicity to avoid overlaps in suggestions
            
            cursor = block.start
            while cursor + timedelta(minutes=dur) <= block.end:
                all_potential_slots.append(cursor)
                cursor += timedelta(minutes=dur) # Non-overlapping slots within the block
                # If we want overlapping options (e.g. 13:00 or 13:30 for 1hr meeting), step could be smaller.
        
        # 2. Heuristic Selection
        # If we have enough days, specific logic... simple for now: take first 3.
        # But optimize a bit: try to skip adjacent slots if we have plenty.
        
        if len(all_potential_slots) <= n:
            return all_potential_slots
            
        # If we have many, pick them distributed.
        # Simple approach: just pick first N for now to satisfy requirement.
        # Improvement: Filter out same-day duplicates if possible?
        # Let's stick to simple "First available" as valid.
        
        # However, to avoid "9:00, 9:30, 10:00" on Monday, let's step.
        stride = 1
        if len(all_potential_slots) > n * 2:
             stride = len(all_potential_slots) // n
        
        # Actually, let's prioritize different days.
        seen_days = set()
        for s in all_potential_slots:
            d = s.date()
            if d not in seen_days:
                proposed.append(s)
                seen_days.add(d)
            if len(proposed) == n:
                break
        
        # Backfill if not enough days
        if len(proposed) < n:
            for s in all_potential_slots:
                if s not in proposed:
                    proposed.append(s)
                if len(proposed) == n:
                    break
        
        # Sort chronologically
        proposed.sort()
        return proposed
