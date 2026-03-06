"""WebResearchTool — Allows Aaliyah to fetch external context via search/browsing."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from app.services.brain.core import Brain

logger = logging.getLogger(__name__)

class WebResearchTool:
    """
    Tool specialized in external web search. 
    In the real app, this would use Tavily/Serper/Browser subagent.
    """

    def __init__(self, brain: Optional[Brain] = None):
        self.brain = brain or Brain()

    async def search(self, query: str) -> str:
        """
        Mock search implementation. Returns external context for a topic.
        """
        import asyncio
        logger.info(f"WebResearchTool: Searching web for '{query}'")
        
        try:
            from ddgs import DDGS
            # [Audit Fix] DDGS().text() is synchronous; wrap in to_thread to prevent blocking event loop
            # Note: DDGS().text() returns a generator, so we listify it in the thread
            results = await asyncio.to_thread(lambda: list(DDGS().text(query, max_results=3)))
            if not results:
                return "No results found."
            
            # Format results into a readable string
            formatted = []
            for r in results:
                formatted.append(f"Title: {r.get('title')}\nSnippet: {r.get('body')}\nURL: {r.get('href')}")
                
            return "\n\n".join(formatted)
        except Exception as e:
            logger.error(f"WebSearch failed: {e}")
            return f"Search failed: {str(e)}"
