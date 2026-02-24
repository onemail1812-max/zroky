"""ToolDispatcher — The central hub for routing agent intents to specialized sub-agents."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.services.brain.core import Brain
from app.agents.aaliyah.core.research_agent import ResearchAgent
from app.agents.aaliyah.core.conflict_agent import ConflictAgent

logger = logging.getLogger(__name__)

class ToolDispatcher:
    """
    Decentralizes the AaliyahOrchestrator by routing specific intents
    to specialized sub-agents or tools.
    """

    def __init__(self, db: Session, workspace_id: str, brain: Optional[Brain] = None):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = brain or Brain()
        
        # Initialize sub-agents
        self.research_agent = ResearchAgent(db, workspace_id, self.brain)
        self.conflict_agent = ConflictAgent(db, workspace_id, self.brain)

    async def dispatch(self, intent: str, message: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Routes the intent to the correct specialized agent.
        """
        intent = intent.upper()
        logger.info(f"ToolDispatcher: Dispatching intent {intent}")

        if intent == "RESEARCH" or (intent == "SEARCH" and "summarize" in message.lower()):
            return await self.research_agent.summarize_topic(message)

        if intent == "MEETING_PREP" or intent == "CONFLICT":
            # ConflictAgent handles resolving existing overlaps
            # ResearchAgent can also be used for meeting briefs
            return await self.research_agent.summarize_topic(f"Upcoming meeting: {message}")

        # Default fallback to search if no specific specialization matches
        from app.agents.aaliyah.core.search_agent import SearchAgent
        search_agent = SearchAgent(self.db, self.workspace_id, self.brain)
        return await search_agent.execute_search(message)
