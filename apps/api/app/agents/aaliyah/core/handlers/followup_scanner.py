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

        threshold = datetime.now(timezone.utc) - timedelta(days=3)
        threads_to_nudge = (
            db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.category == "OUTBOUND",
                TriagedEmail.received_at < threshold,
                TriagedEmail.followup_due_at == None,
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
