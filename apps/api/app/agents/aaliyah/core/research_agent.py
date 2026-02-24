"""ResearchAgent — specializes in deep-dive synthesis and cross-thread analysis."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.agents.aaliyah.core.search_agent import SearchAgent
from app.agents.aaliyah.core.tools.web_research import WebResearchTool

logger = logging.getLogger(__name__)

class ResearchAgent:
    """
    Agent responsible for 'Deep Research' tasks. 
    Unlike simple search, it synthesizes high-fidelity reports from multiple threads.
    """

    def __init__(self, db: Session, workspace_id: str, brain: Optional[Brain] = None):
        self.db = db
        self.workspace_id = workspace_id
        self.brain = brain or Brain()
        self.search_agent = SearchAgent(db, workspace_id, self.brain)
        self.web_tool = WebResearchTool(self.brain)

    async def summarize_topic(self, topic: str) -> Dict[str, Any]:
        """
        Gathers all relevant context for a topic and generates a research report.
        """
        # 1. Broad Search
        search_results = await self.search_agent.execute_search(topic)
        
        # 2. Extract evidence
        evidence = search_results.get("evidence", [])
        if not evidence:
            return {"answer": "I couldn't find enough information to build a research report on that topic.", "status": "no_data"}

        # 3. Deep Synthesis
        # We use a higher-reasoning model for research reports
        system_prompt = (
            "You are Aaliyah Research Sub-Agent. "
            "Your task is to produce a high-fidelity 'Executive Briefing' on a specific topic. "
            "Analyze the provided email/calendar snapshots and summarize: \n"
            "1. Current Status\n"
            "2. Key People Involved\n"
            "3. Next Actions\n"
            "4. Conflicts or Risks (if any)\n\n"
            "STRICT RULES:\n"
            "- Be concise but thorough.\n"
            "- Citations MUST be included.\n"
            "- No fluff or AI filler words."
        )
        
        # Prepare context for LLM (using evidence text)
        context_text = search_results.get("answer_text", "")
        
        # 2.5 External Fallback: If local data is weak, hit the web
        external_context = ""
        if "searched" in context_text.lower() and "couldn't find" in context_text.lower():
            logger.info(f"ResearchAgent: Local data insufficient. Fetching web context for '{topic}'")
            external_context = await self.web_tool.search(topic)
            context_text += f"\n\n[EXTERNAL WEB DATA]:\n{external_context}"
        
        report = await self.brain.think(
            prompt=f"Topic: {topic}\n\nExisting Data:\n{context_text}\n\nGenerate the Executive Briefing:",
            system_prompt=system_prompt,
            model_override=ModelType.REASONING.value,
            temperature_override=0.2
        )

        return {
            "answer": report.content,
            "status": "success",
            "evidence": evidence
        }
