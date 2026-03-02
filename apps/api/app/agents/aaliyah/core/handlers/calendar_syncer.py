from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session

from app.models.calendar_event_snapshot import CalendarConflict
from app.services.audit_log_service import AuditAction
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync
from app.agents.aaliyah.core.meeting_prep import MeetingPrepAgent

from .base import BaseHandler

if TYPE_CHECKING:
    pass

class CalendarSyncer(BaseHandler):
    """Handles calendar synchronization and conflict detection."""

    def list_calendar_conflicts(self, db: Session, limit: int = 50) -> dict[str, Any]:
        rows = (
            db.query(CalendarConflict)
            .filter(CalendarConflict.workspace_id == self.workspace_id)
            .order_by(CalendarConflict.updated_at.desc())
            .limit(max(1, min(limit, 200)))
            .all()
        )
        return {
            "conflicts": [
                {
                    "id": row.id,
                    "event_a_id": row.event_a_id,
                    "event_b_id": row.event_b_id,
                    "conflict_type": row.conflict_type,
                    "conflict_minutes": int(row.conflict_minutes) if row.conflict_minutes else None,
                    "explain": row.explain,
                    "briefing": (row.metadata_json or {}).get("briefing"),
                }
                for row in rows
            ],
            "count": len(rows),
        }

    async def sync_calendar(
        self,
        db: Session,
        *,
        user_id: str,
        provider: str = "auto",
        window_days: int = 7,
        buffer_minutes: int = 15,
    ) -> dict[str, Any]:
        self._patch_state(status="thinking", active_task="Syncing calendar")
        await self._emit("calendar_sync_started", "Syncing calendar events")

        calendar_sync = CalendarSync(self.workspace_id, db)
        result = await calendar_sync.sync_and_detect(
            provider=provider,
            window_days=window_days,
            max_results=100,
            buffer_minutes=buffer_minutes,
        )

        state = self._get_state()
        self._patch_state(
            status="idle",
            active_task=None,
            calendar_events=int(result.get("event_count", 0)),
            calendar_conflicts=int(result.get("conflict_count", 0)),
            escalations=state.escalations + int(result.get("conflict_count", 0)),
            last_sync={"gmail": state.last_sync.get("gmail"), "calendar": datetime.now(timezone.utc).isoformat()},
        )
        await self._emit(
            "calendar_sync_complete",
            f"Synced {result.get('event_count', 0)} events, detected {result.get('conflict_count', 0)} conflicts",
            {"conflicts": result.get("conflict_count", 0)},
        )

        # Proactive Notification: Alert user about calendar conflicts
        conflict_count = int(result.get("conflict_count", 0))
        if conflict_count > 0:
            await self._emit(
                "calendar_conflict_detected",
                f"I noticed {conflict_count} overlapping meeting{'s' if conflict_count > 1 else ''} on your calendar.",
                {"count": conflict_count},
            )

        # Meeting Prep: generate cheat sheets for upcoming meetings and conflict resolutions
        if int(result.get("event_count", 0)) > 0 or conflict_count > 0:
            try:
                prep_agent = MeetingPrepAgent(db=db, workspace_id=self.workspace_id, brain=self.brain)
                conflict_briefs = await prep_agent.scan_and_brief()
                meeting_briefs = await prep_agent.scan_upcoming_meetings()
                
                if conflict_briefs > 0 or meeting_briefs > 0:
                    await self._emit(
                        "briefing_ready",
                        f"Prepared {conflict_briefs} conflict solutions & {meeting_briefs} meeting cheat sheets",
                        {
                            "conflict_briefs": conflict_briefs, 
                            "meeting_briefs": meeting_briefs
                        }
                    )
            except Exception as e:
                self.logger.error(f"MeetingPrepAgent failed: {e}")

        await self._audit(
            db,
            user_id=user_id,
            action=AuditAction.UPDATE,
            entity_id=f"sync_calendar:{datetime.now(timezone.utc).timestamp()}",
            metadata={"provider": provider, "result": result},
            explain="Calendar sync and conflict detection completed",
        )
        return result
