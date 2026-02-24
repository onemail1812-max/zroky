"""ConflictAgent — specializes in calendar conflict detection and resolution."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.models.calendar_event_snapshot import CalendarConflict

logger = logging.getLogger(__name__)

class ConflictAgent:
    """
    Agent responsible for identifies and proposing solutions for calendar conflicts.
    """

    def __init__(self, db: Session, workspace_id: str, brain: Optional[Brain] = None):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = brain or Brain()

    async def analyze_conflicts(self) -> List[Dict[str, Any]]:
        """
        Scans for existing conflicts in the DB and generates resolution proposals.
        """
        conflicts = self.db.query(CalendarConflict).filter(
            CalendarConflict.workspace_id == self.workspace_id
        ).all()
        
        if not conflicts:
            return []

        results = []
        for conflict in conflicts:
            # Generate a resolution proposal using LLM
            proposal = await self._propose_resolution(conflict)
            results.append({
                "conflict_id": conflict.id,
                "type": conflict.conflict_type,
                "proposal": proposal,
                "details": conflict.explain
            })
            
        return results

    async def _propose_resolution(self, conflict: CalendarConflict) -> str:
        """Uses LLM to think of the best way to resolve a specific conflict."""
        system_prompt = (
            "You are Aaliyah Conflict Sub-Agent. "
            "Your goal is to resolve calendar overlaps for your principal. "
            "Propose a tactful, executive solution (e.g., reschedule, delegate, or skip). "
            "STRICT RULES:\n"
            "- Favor buffer times.\n"
            "- Be decisive but polite."
        )
        
        prompt = f"Conflict: {conflict.conflict_type}\nDetails: {conflict.explain}\n\nWhat is the best way to handle this?"
        
        response = await self.brain.think(
            prompt=prompt,
            system_prompt=system_prompt,
            model_override=ModelType.FAST.value,
            temperature_override=0.1
        )
        
        return response.content
