from __future__ import annotations
from typing import TYPE_CHECKING, Any, Optional, Dict
import logging

if TYPE_CHECKING:
    from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
    from sqlalchemy.orm import Session
    from app.services.brain.core import Brain

class BaseHandler:
    """Base class for all orchestrator sub-handlers."""
    
    def __init__(self, orchestrator: "AaliyahOrchestrator"):
        self.orchestrator = orchestrator
        self.logger = logging.getLogger(f"app.orchestrator.{self.__class__.__name__.lower()}")

    @property
    def workspace_id(self) -> str:
        return self.orchestrator.workspace_id

    @property
    def brain(self) -> "Brain":
        return self.orchestrator.brain

    @property
    def intent_service(self):
        return self.orchestrator.intent_service

    @property
    def dispatcher(self):
        return self.orchestrator.dispatcher

    @property
    def comm_engine(self):
        return self.orchestrator.comm_engine

    @property
    def triage_classifier(self):
        return self.orchestrator.triage_classifier

    def _get_state(self):
        return self.orchestrator._get_state()

    def _patch_state(self, **kwargs: Any):
        return self.orchestrator._patch_state(**kwargs)

    async def _emit(self, event_type: str, message: str, payload: Optional[Dict[str, Any]] = None):
        return await self.orchestrator._emit(event_type, message, payload)

    async def _audit(self, db: "Session", **kwargs: Any):
        return await self.orchestrator._audit(db, **kwargs)

    async def broadcast_updates(self, db: "Session"):
        return await self.orchestrator.broadcast_updates(db)

    def _sender_display(self, sender: Optional[str]) -> str:
        """Helper to format sender name consistently."""
        from email.utils import parseaddr
        raw = str(sender or "").strip()
        if not raw:
            return "Unknown Sender"
        name, email_addr = parseaddr(raw)
        if name:
            return name
        if email_addr:
            return email_addr.split("@", 1)[0] or email_addr
        return raw[:60]
