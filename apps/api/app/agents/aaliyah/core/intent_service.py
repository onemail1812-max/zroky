"""Decoupled Intent Service for v2.1 Scale Hardening."""
from typing import Optional
from app.services.brain.core import Brain

class IntentService:
    """
    Handles tiered intent classification:
    1. Fast Heuristics (Regex/Keywords)
    2. Fast LLM (7B or Gemini-Flash) for ambiguous cases.
    """
    
    def __init__(self, brain: Optional[Brain] = None):
        self.brain = brain or Brain()

    def classify_fast(self, message: str) -> Optional[str]:
        """Weighted intent classification with scoring to prevent false positives."""
        text = (message or "").lower().strip()
        if not text:
            return "SUMMARY"

        scores: dict[str, float] = {
            "DRAFT": 0.0,
            "ARCHIVE": 0.0,
            "LABEL": 0.0,
            "CREATE_TASK": 0.0,
            "UPDATE_PREFERENCE": 0.0,
            "MEETING_PREP": 0.0,
            "BRIEFING": 0.0,
            "STATUS": 0.0,
            "SEARCH": 0.0,
            "HEALTH_CHECK": 0.0,
            "RESEARCH": 0.0,
            "CONFLICT": 0.0,
            "COMPOSE_NEW": 0.0,
        }

        # Research intent
        if any(w in text for w in ("summarize the project", "deep dive", "research", "briefing on", "project update")):
            scores["RESEARCH"] += 2.0
        
        # Conflict
        if any(w in text for w in ("conflict", "overlap", "reschedule", "double booked")):
            scores["CONFLICT"] += 2.0

        # Compose New Intent
        if any(w in text for w in ("draft a new email", "compose an email", "write an email", "new email", "send an email to", "send a new email", "draft an email", "mail likh", "ko email", "email likh do", "mail kar do")):
            scores["COMPOSE_NEW"] += 2.5

        # Draft intent (Reply to existing thread)
        if any(neg in text for neg in ("don't", "don't", "not", "no need to")):
            if "draft" in text:
                scores["DRAFT"] -= 1.5
        if any(w in text for w in ("draft a reply", "write a reply", "compose", "draft an email", "write an email")):
            scores["DRAFT"] += 2.0
        if any(w in text for w in ("reply to", "respond to")):
            scores["DRAFT"] += 1.5
        if "draft" in text:
            scores["DRAFT"] += 0.8

        # Archive
        if "archive" in text and not any(neg in text for neg in ("don't archive", "do not archive", "never archive", "not archive")):
            scores["ARCHIVE"] += 2.0

        # Label
        if any(w in text for w in ("label", "tag", "categorize")) and not any(neg in text for neg in ("don't label", "no need to label", "stop labeling", "don't tag")):
            scores["LABEL"] += 2.0

        # Task
        if any(w in text for w in ("create task", "add task", "todo", "to-do", "reminder")) and not any(neg in text for neg in ("don't create", "no need to add", "not a task")):
            scores["CREATE_TASK"] += 2.0

        # Preference update
        if any(w in text for w in ("rule", "preference", "don't label", "always label", "stop labeling", "start labeling", "internal domain")):
            scores["UPDATE_PREFERENCE"] += 2.0
        if any(w in text for w in (" vip", "vips", "mark as vip", "add to vip")):
            scores["UPDATE_PREFERENCE"] += 1.5

        if any(w in text for w in ("meeting prep", "prepare for meeting", "cheat sheet", "brief me on the meeting", "meeting briefing")) and not any(neg in text for neg in ("don't prepare", "no meeting prep", "stop preparing")):
            scores["MEETING_PREP"] += 2.0
            
        if "?" in text:
            scores["SEARCH"] += 0.5
        if any(w in text for w in ("search", "find", "show me", "look for", "where is", "when is", "did", "has", "what is")) and not any(neg in text for neg in ("don't search", "stop searching", "no need to find")):
            scores["SEARCH"] += 1.5
        if any(w in text for w in ("email from", "sent by", "calendar", "meeting with")):
            scores["SEARCH"] += 1.0

        # Briefing
        if any(w in text for w in ("morning briefing", "daily briefing", "what's my day", "today's agenda", "give me a briefing")) and not any(neg in text for neg in ("stop briefing", "no briefing", "don't brief")):
            scores["BRIEFING"] += 2.0

        # Status
        if any(w in text for w in ("status", "what's happening", "inbox status", "how many emails", "how many unread")):
            scores["STATUS"] += 2.0

        # Health / Connection
        if any(w in text for w in ("mail connected", "email connected", "connection status", "is my email working", "check connection", "health")):
            scores["HEALTH_CHECK"] += 2.5

        # Pick highest scoring intent
        best_intent = max(scores, key=scores.get)
        if scores[best_intent] < 0.5:
            return None # Ambiguous
        return best_intent

    async def get_intent(self, message: str) -> str:
        """Entry point for intent classification."""
        fast_intent = self.classify_fast(message)
        if fast_intent:
            return fast_intent

        # If fast classification fails or is ambiguous, use LLM
        prompt = f"Identify the user intent for this message: '{message}'. Return one keyword: DRAFT, ARCHIVE, LABEL, SEARCH, BRIEFING, STATUS, MEETING_PREP, CREATE_TASK, CONFLICT, RESEARCH, COMPOSE_NEW, or SUMMARY."
        try:
            from app.services.brain.core import ModelType
            res = await self.brain.think(
                prompt=prompt, 
                system_prompt="You are an intent classifier.", 
                model_override=ModelType.FAST.value
            )
            intent = res.content.strip().upper()
            return intent if intent in {"DRAFT", "ARCHIVE", "LABEL", "SEARCH", "BRIEFING", "STATUS", "MEETING_PREP", "CREATE_TASK", "CONFLICT", "RESEARCH", "COMPOSE_NEW"} else "SUMMARY"
        except Exception:
            return "SUMMARY"
