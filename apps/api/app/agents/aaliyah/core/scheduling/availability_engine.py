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
    is_focus_clash: bool = False
    score: float = 100.0

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
            self.user_tz = timezone.utc
            self.user_tz_name = "UTC"

        # Peak Productivity: Focus Blocks & Buffer
        self.buffer_minutes = settings.get("buffer_time_mins", 15)
        self.focus_blocks_raw = settings.get("focus_blocks", [])
        self.focus_periods = self._parse_focus_blocks(self.focus_blocks_raw)

    def _parse_focus_blocks(self, blocks: List[str]) -> List[tuple]:
        """Parses ["09:00-11:00"] into (hour_start, hour_end) tuples."""
        parsed = []
        for b in blocks:
            try:
                if "-" in b:
                    start, end = b.split("-")
                    parsed.append((int(start.split(":")[0]), int(end.split(":")[0])))
            except Exception:
                continue
        return parsed

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

        # POST-PROCESS: Scoring & Focus Block Detection
        for slot in free_slots:
            # Check if this slot overlaps with ANY focus period
            slot_hour = slot.start.astimezone(self.user_tz).hour
            for f_start, f_end in self.focus_periods:
                if f_start <= slot_hour < f_end:
                    slot.is_focus_clash = True
                    slot.score -= 50.0  # Heavy penalty for clashing with focus blocks
            
            # Additional heuristics:
            # - Morning slots might be better or worse depending on chronotype (Sprint 3)
            # - Friday afternoons penalized
            if slot.start.astimezone(self.user_tz).weekday() == 4 and slot_hour >= 15:
                slot.score -= 20.0

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
            cursor = block.start
            while cursor + timedelta(minutes=dur) <= block.end:
                all_potential_slots.append({
                    "start": cursor,
                    "score": block.score,
                    "is_focus_clash": block.is_focus_clash
                })
                cursor += timedelta(minutes=dur)
        
        if not all_potential_slots:
            return []

        # 2. Heuristic Selection: Rank by score first, then time
        # We want to prioritize high-score days even if they are later
        all_potential_slots.sort(key=lambda x: (x["score"], -x["start"].timestamp()), reverse=True)
        
        proposed: List[datetime] = []
        seen_days = set()

        # Step 1: Pick the best slot from each unique day that has "good" slots
        for s in all_potential_slots:
            d = s["start"].date()
            if d not in seen_days and s["score"] >= 80:
                proposed.append(s["start"])
                seen_days.add(d)
            if len(proposed) == n:
                break
        
        # Step 2: If we still need more, pick any remaining top-scoring slots
        if len(proposed) < n:
            for s in all_potential_slots:
                if s["start"] not in proposed:
                    proposed.append(s["start"])
                if len(proposed) == n:
                    break
        
        # Sort chronologically for output
        proposed.sort()
        return proposed
