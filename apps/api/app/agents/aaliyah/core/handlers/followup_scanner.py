from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.services.brain.schemas.models import ModelType

from .base import BaseHandler

if TYPE_CHECKING:
    pass

class FollowupScanner(BaseHandler):
    """Scans for outgoing emails that haven't received a reply."""

    async def run_followup_scan(self, db: Session, *, user_id: str) -> dict[str, Any]:
        self._patch_state(status="thinking", active_task="Scanning follow-ups")
        await self._emit("followup_scan_started", "Scanning for unanswered threads")

        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == self.workspace_id).first()
        if not workspace:
            self._patch_state(status="idle", active_task=None)
            return {"count": 0}
        settings = workspace.settings_json or {}
        aaliyah_settings = settings.get("aaliyah", {})
        followup_days = float(aaliyah_settings.get("follow_up_days", 3))

        threshold = datetime.now(timezone.utc) - timedelta(days=followup_days)
        threads_to_nudge = (
            db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.category == "Needs Reply",
                TriagedEmail.received_at.is_not(None),
                TriagedEmail.received_at < threshold,
                TriagedEmail.followup_due_at.is_(None),
            )
            .all()
        )

        count = 0
        for thread in threads_to_nudge:
            thread.followup_due_at = datetime.now(timezone.utc)
            count += 1

        db.commit()

        self._patch_state(status="idle", active_task=None)
        await self._emit("followup_scan_complete", f"Identified {count} threads needing follow-up", {"count": count})
        return {"count": count}
