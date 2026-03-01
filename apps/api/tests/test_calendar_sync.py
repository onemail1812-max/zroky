import os
import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("SECRET_KEY", "test-secret-must-be-min-16-chars")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")

from app.database import Base
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync, NormalizedCalendarEvent


class CalendarSyncTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    def test_detect_conflicts_overlap_and_tight_buffer(self):
        db = self.SessionLocal()
        sync = CalendarSync("w1", db)

        events = [
            NormalizedCalendarEvent(
                id="a",
                workspace_id="w1",
                provider="google",
                title="Meeting A",
                start_at=datetime(2026, 2, 11, 10, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 2, 11, 11, 0, tzinfo=timezone.utc),
            ),
            NormalizedCalendarEvent(
                id="b",
                workspace_id="w1",
                provider="google",
                title="Meeting B",
                start_at=datetime(2026, 2, 11, 10, 45, tzinfo=timezone.utc),
                end_at=datetime(2026, 2, 11, 11, 30, tzinfo=timezone.utc),
            ),
            NormalizedCalendarEvent(
                id="c",
                workspace_id="w1",
                provider="google",
                title="Meeting C",
                start_at=datetime(2026, 2, 11, 11, 40, tzinfo=timezone.utc),
                end_at=datetime(2026, 2, 11, 12, 0, tzinfo=timezone.utc),
            ),
        ]
        conflicts = sync.detect_conflicts(events, buffer_minutes=15)
        types = [item.conflict_type for item in conflicts]

        self.assertIn("overlap", types)
        self.assertIn("tight_buffer", types)
        db.close()

    def test_detect_conflicts_ignores_cancelled_events(self):
        db = self.SessionLocal()
        sync = CalendarSync("w1", db)
        events = [
            NormalizedCalendarEvent(
                id="a",
                workspace_id="w1",
                provider="google",
                title="Meeting A",
                start_at=datetime(2026, 2, 11, 10, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 2, 11, 11, 0, tzinfo=timezone.utc),
                is_cancelled=True,
            ),
            NormalizedCalendarEvent(
                id="b",
                workspace_id="w1",
                provider="google",
                title="Meeting B",
                start_at=datetime(2026, 2, 11, 10, 30, tzinfo=timezone.utc),
                end_at=datetime(2026, 2, 11, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        conflicts = sync.detect_conflicts(events, buffer_minutes=15)
        self.assertEqual(len(conflicts), 0)
        db.close()


if __name__ == "__main__":
    unittest.main()
