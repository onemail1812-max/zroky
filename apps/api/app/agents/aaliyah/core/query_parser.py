from __future__ import annotations

import re
import json
import logging
from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta

from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType

logger = logging.getLogger(__name__)

class QueryParser:
    """
    Converts natural language queries into structured search parameters.
    Uses deterministic rules first, then falls back to LLM for ambiguity.
    """

    def __init__(self, brain: Brain):
        self.brain = brain

    async def parse(self, query: str) -> Dict[str, Any]:
        """
        Main entry point for parsing.
        """
        # 1. Deterministic Extract
        params = self._deterministic_extract(query)
        
        # 2. LLM Refinement (fill in gaps, map intent)
        llm_params = await self._llm_refine(query, params)
        
        # Merge logic: LLM provides the brain, rules provide the guardrails
        final = {**params, **llm_params}
        
        # Ensure default intent
        if not final.get("intent"):
            final["intent"] = "email_search"
            
        return final

    def _deterministic_extract(self, query: str) -> Dict[str, Any]:
        q = query.lower()
        extracted = {
            "intent": None,
            "scope": "all",
            "keywords": None,
            "sender": None,
            "time_range": None,
            "queue": None
        }

        # Date windows
        if "today" in q:
            extracted["time_range"] = "today"
        elif "yesterday" in q:
            extracted["time_range"] = "yesterday"
        elif "last week" in q:
            extracted["time_range"] = "last week"
        elif "last month" in q:
            extracted["time_range"] = "last month"

        # Special keywords for intents
        if any(w in q for w in ["reply", "respond", "receive", "get back"]):
            extracted["intent"] = "email_status"
        elif any(w in q for w in ["summary", "summarize", "recap"]):
            extracted["intent"] = "thread_summary"
        elif any(w in q for w in ["promise", "commit", "action item", "todo"]):
            extracted["intent"] = "commitments"
        elif any(w in q for w in ["meeting", "calendar", "event", "when is"]):
            extracted["intent"] = "meeting_lookup"
            extracted["scope"] = "calendar"
        elif any(w in q for w in ["availability", "free time", "slot"]):
            extracted["intent"] = "availability"
            extracted["scope"] = "calendar"

        # Queue mappings
        if "important" in q or "priority" in q:
            extracted["queue"] = "priority"
        if "approval" in q or "pending" in q:
            extracted["queue"] = "approvals"

        return extracted

    async def _llm_refine(self, query: str, base_params: Dict[str, Any]) -> Dict[str, Any]:
        system = (
            "You are a search query parser. Extract structured parameters from the user's request. "
            "Intent types: email_search, email_status, thread_summary, commitments, meeting_lookup, availability. "
            "Return JSON with keys: intent (str), scope (all|email|calendar), keywords (str|null), sender (str|null), "
            "time_range (str|null), queue (str|null). "
            "If the user asks 'Did X reply?', intent='email_status' and sender='X'."
        )
        
        # Provide base_params as context to help LLM stay grounded
        context = f"Base Rules extracted: {json.dumps(base_params)}"
        
        try:
            resp = await self.brain.think(
                prompt=f"Query: {query}\n{context}\nJSON:",
                system_prompt=system,
                model_override=ModelType.FAST.value,
                temperature_override=0.0
            )
            text = resp.content
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "{" not in text: 
                return {}
            
            text = text.strip()
            if text.startswith("```"): text = text[3:-3]
            
            return json.loads(text)
        except Exception as e:
            logger.warning(f"LLM refine failed: {e}")
            return {}

    def get_clarification_question(self, query: str, results_count: int, params: Dict[str, Any]) -> Optional[str]:
        """
        Returns a clarification question if criteria met.
        Trigger clarify if:
        1. 0 results AND query missing sender/keyword
        2. 200 results AND query too generic
        """
        q = query.lower()
        has_specifics = params.get("sender") or params.get("keywords")
        
        # Rule 1: No results and no specifics
        if results_count == 0 and not has_specifics:
            return "I don't have enough context. Tell me the sender or a keyword."

        # Rule 2: Too many results and generic
        generic_terms = ["meeting", "invoice", "email", "search", "show"]
        words = [w for w in q.split() if len(w) > 3]
        is_generic = all(w in generic_terms for w in words) or results_count >= 200
        
        if results_count >= 200 and is_generic:
            return "I found too many results. I don't have enough context. Tell me the sender or a keyword."

        return None
