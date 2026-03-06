"""ToolDispatcher — The central hub for routing agent intents to specialized sub-agents."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.services.brain.core import Brain
from app.agents.aaliyah.core.search_agent import SearchAgent
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

    async def dispatch(self, db: Session, intent: str, message: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Routes the intent to the correct specialized agent.
        """
        intent = intent.upper()
        logger.info(f"ToolDispatcher: Dispatching intent {intent}")

        # Ensure sub-agents use the current session
        self.research_agent.db = db
        self.conflict_agent.db = db

        if intent == "RESEARCH" or (intent == "SEARCH" and "summarize" in message.lower()):
            return await self.research_agent.summarize_topic(db, message)

        if intent == "CONFLICT":
            conflicts = await self.conflict_agent.analyze_conflicts(db)
            if not conflicts:
                return {
                    "answer": "Checked your calendar. Everything looks clear—no active conflicts detected.",
                    "status": "success"
                }
            
            # Synthesize conflict results into a readable report
            report = "I've detected a few calendar overlaps that need attention:\n\n"
            for c in conflicts:
                report += f"### {c['type']}\n"
                report += f"**Details**: {c['details']}\n"
                report += f"**Aaliyah's Recommendation**: {c['proposal']}\n\n"
            
            return {
                "answer": report,
                "status": "success",
                "evidence": conflicts # Passing raw data as evidence for UI/Audit
            }

        if intent == "MEETING_PREP":
            # For specific meeting prep, we use ResearchAgent for a deep brief
            return await self.research_agent.summarize_topic(db, f"Upcoming meeting: {message}")

        # Default fallback to search if no specific specialization matches
        search_agent = SearchAgent(db, self.workspace_id, self.brain)
        return await search_agent.execute_search(message)
