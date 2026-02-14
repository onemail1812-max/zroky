import os
import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")

from app.database import Base
from app.models.calendar_event_snapshot import CalendarEventSnapshot
from app.models.triaged_email import TriagedEmail
from app.services.aaliyah.ingestion.email_ingestor import EmailMetadata, NormalizedEmailMessage
from app.services.aaliyah.labeling_rules import LabelingRulesEngine
from app.services.aaliyah.triage_service import TriageResult


class LabelingRulesTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(engine)
        self.SessionLocal = sessionmaker(bind=engine)

    def test_default_preferences_and_decision(self):
        db = self.SessionLocal()
        engine = LabelingRulesEngine(db, "w1")
        prefs = engine.get_preferences_payload()
        self.assertIn("Urgent", prefs["enabled_labels"])

        db.add(
            CalendarEventSnapshot(
                id="e1",
                workspace_id="w1",
                provider="google",
                external_event_id="external-1",
                title="Project X Meeting",
                organizer="steve@company.com",
                start_at=datetime.utcnow() + timedelta(hours=2),
                end_at=datetime.utcnow() + timedelta(hours=3),
                is_all_day=False,
                is_cancelled=False,
                metadata_json={},
            )
        )
        db.commit()

        message = NormalizedEmailMessage(
            id="m1",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="steve@company.com", subject="Urgent: Project X meeting", thread_id="t1"),
            content="Please respond ASAP before deadline.",
            is_read=False,
        )
        triage = TriageResult(
            category="Meeting",
            priority="High",
            is_noise=False,
            confidence=0.98,
            reasoning="Scheduling and urgency markers.",
        )

        decision = engine.decide_labels(
            message=message,
            triage=triage,
            history=[],
            upcoming_events=engine.list_upcoming_calendar_events(),
        )
        self.assertIn("Meeting", decision.labels)
        self.assertIn("Urgent", decision.labels)
        self.assertIn("Awaiting Reply", decision.labels)
        self.assertIn("High Priority", decision.labels)
        db.close()

    def test_override_can_disable_auto_labels(self):
        db = self.SessionLocal()
        engine = LabelingRulesEngine(db, "w1")
        engine.set_override(scope="thread", target_id="thread-9", disable_auto=True, labels=[], mode="replace")

        message = NormalizedEmailMessage(
            id="m2",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="ceo@company.com", subject="Need response", thread_id="thread-9"),
            content="Please reply today.",
            is_read=False,
        )
        triage = TriageResult(
            category="Urgent",
            priority="High",
            is_noise=False,
            confidence=0.91,
            reasoning="Urgency markers.",
        )

        decision = engine.decide_labels(message=message, triage=triage, history=[], upcoming_events=[])
        self.assertTrue(decision.override_applied)
        self.assertTrue(decision.skip_auto)
        self.assertEqual(decision.labels, [])
        db.close()

    def test_history_escalates_high_priority(self):
        db = self.SessionLocal()
        engine = LabelingRulesEngine(db, "w1")

        for idx in range(3):
            db.add(
                TriagedEmail(
                    id=f"t{idx}",
                    workspace_id="w1",
                    provider="google",
                    external_message_id=f"msg-{idx}",
                    thread_id="thread-history",
                    sender="client@external.com",
                    subject="Follow-up",
                    snippet="Awaiting response",
                    category="FYI",
                    priority="Low",
                    is_noise=False,
                    is_read=False,
                    confidence="0.8",
                    reasoning="Test row",
                    metadata_json={},
                )
            )
        db.commit()
        history = engine.list_recent_thread_history(thread_id="thread-history", sender=None)

        message = NormalizedEmailMessage(
            id="m3",
            workspace_id="w1",
            provider="google",
            metadata=EmailMetadata(sender="client@external.com", subject="Follow-up #4", thread_id="thread-history"),
            content="Checking if you had time.",
            is_read=False,
        )
        triage = TriageResult(
            category="FYI",
            priority="Low",
            is_noise=False,
            confidence=0.7,
            reasoning="No urgency terms.",
        )
        decision = engine.decide_labels(message=message, triage=triage, history=history, upcoming_events=[])
        self.assertIn("High Priority", decision.labels)
        db.close()


if __name__ == "__main__":
    unittest.main()
