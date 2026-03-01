from __future__ import annotations

import logging
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy.orm import Session

from .base import BaseHandler

if TYPE_CHECKING:
    pass

class WebhookHandler(BaseHandler):
    """Handles incoming webhooks from external providers (Gmail, Outlook)."""

    async def handle_webhook(self, db: Session, *, provider: str, payload: dict[str, Any]) -> dict[str, Any]:
        self.logger.info(f"Received webhook from {provider}")
        
        # This usually triggers an incremental sync
        return await self.orchestrator.sync_inbox(db, user_id="system", provider=provider, incremental=True)
