
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from app.agents.aaliyah.core.scheduling.availability_engine import AvailabilityEngine, TimeSlot
from app.models.calendar_event_snapshot import CalendarEventSnapshot

class TestAvailabilityEngine(unittest.TestCase):
    def setUp(self):
        self.db = MagicMock()
        self.workspace_id = "ws_test"
        self.engine = AvailabilityEngine(self.db, self.workspace_id)
        # Mock default work hours: 9-17 UTC, Mon-Fri

    def test_find_slots_empty_day(self):
        # Setup: No events in DB for the day
        self.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        
        # Test: Monday 9am
        start = datetime(2026, 2, 9, 9, 0, tzinfo=timezone.utc) # Mon
        slots = self.engine.find_slots(start, days_ahead=1)
        
        # Expect 1 big slot 9-17 (480 mins)
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0].duration_minutes, 480) 
        self.assertEqual(slots[0].start, start)

    def test_find_slots_with_conflict(self):
        # Setup: Event 12:00-13:00
        evt = CalendarEventSnapshot(
            start_at=datetime(2026, 2, 9, 12, 0, tzinfo=timezone.utc),
            end_at=datetime(2026, 2, 9, 13, 0, tzinfo=timezone.utc),
            is_cancelled=False
        )
        self.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [evt]
        
        start = datetime(2026, 2, 9, 9, 0, tzinfo=timezone.utc)
        slots = self.engine.find_slots(start, days_ahead=1, buffer_minutes=15)
        
        # Expect:
        # 1. 09:00 -> 11:45 (Event start 12:00 - 15m buffer) = 165 mins
        # 2. 13:15 (Event end 13:00 + 15m buffer) -> 17:00 = 225 mins
        
        self.assertEqual(len(slots), 2)
        
        s1 = slots[0]
        self.assertEqual(s1.start.hour, 9)
        self.assertEqual(s1.end.hour, 11)
        self.assertEqual(s1.end.minute, 45)
        
        s2 = slots[1]
        self.assertEqual(s2.start.hour, 13)
        self.assertEqual(s2.start.minute, 15)
        self.assertEqual(s2.end.hour, 17)

    def test_skip_weekends(self):
        # Setup: Saturday
        start = datetime(2026, 2, 7, 9, 0, tzinfo=timezone.utc) # Sat
        slots = self.engine.find_slots(start, days_ahead=1)
        self.assertEqual(len(slots), 0)

if __name__ == "__main__":
    unittest.main()
