import asyncio
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
import random
from typing import List, Dict, Optional, Any
from app.models.user import User

@dataclass
class CommunicationEvent:
    type: str
    payload: Dict[str, Any]
    timestamp: float
    urgent: bool = False

@dataclass
class CommunicationState:
    last_message_at: float = 0.0
    pending_events: List[CommunicationEvent] = field(default_factory=list)

class CommunicationEngine:
    MIN_INTERVAL_SECONDS = 60  # Reduced to 1 minute for standard batches
    MAX_BATCH_SIZE = 50

    def __init__(self):
        self._flush_lock = asyncio.Lock()
        self._data_lock = threading.Lock()

    def add_event(self, state: CommunicationState, event_type: str, payload: Dict[str, Any], urgent: bool = False) -> None:
        """Queue an event for the next communication batch with thread-safety."""
        event = CommunicationEvent(
            type=event_type,
            payload=payload,
            timestamp=datetime.now(timezone.utc).timestamp(),
            urgent=urgent
        )
        with self._data_lock:
            state.pending_events.append(event)
            # Prevent indefinite growth if not flushed
            if len(state.pending_events) > self.MAX_BATCH_SIZE:
                state.pending_events.pop(0)

    def should_flush(self, state: CommunicationState) -> bool:
        """Check if enough time has passed to send a batch (thread-safe check)."""
        with self._data_lock:
            # If there's an urgent event, speak NOW
            if any(e.urgent for e in state.pending_events):
                return True

            now = datetime.now(timezone.utc).timestamp()
            time_since_last = now - state.last_message_at
            
            # If we haven't spoken in a while, speak now
            return time_since_last >= self.MIN_INTERVAL_SECONDS

    async def flush(self, state: CommunicationState, user_name: str, brain: Any, preferences: Dict[str, Any]) -> Optional[str]:
        """Aggregate events and generate a message (Atomic snapshot+clear)."""
        # [Bug 3.2 / 5.4] Atomic snapshot+clear under lock to prevent race conditions.
        async with self._flush_lock:
            if not self.should_flush(state):
                return None
                
            with self._data_lock:
                events = list(state.pending_events)
                if not events:
                    return None

                state.pending_events.clear()
                state.last_message_at = datetime.now(timezone.utc).timestamp()

        return await self._generate_llm_message(events, user_name, brain, preferences)

    async def _generate_llm_message(self, events: List[CommunicationEvent], user_name: str, brain: Any, preferences: Dict[str, Any]) -> str:
        import logging
        logger = logging.getLogger(__name__)

        # Prepare context from events
        event_descriptions = []
        for e in events:
            if e.type == "draft_ready":
                event_descriptions.append(f"- Drafted a reply to {e.payload.get('sender')} about '{e.payload.get('subject')}'")
            elif e.type == "priority_added":
                event_descriptions.append(f"- Flagged a high-priority email from {e.payload.get('sender')}")
            elif e.type == "approval_required":
                event_descriptions.append(f"- I need your approval for: {e.payload.get('subject')}")
            elif e.type == "followup_due":
                event_descriptions.append(f"- {e.payload.get('count', 0)} follow-ups are now due")
            elif e.type == "calendar_conflict_detected":
                event_descriptions.append(f"- I noticed {e.payload.get('count', 1)} overlapping meeting(s) on your calendar. Want me to suggest a reschedule?")
            elif e.type == "daily_6am_sync_complete":
                event_descriptions.append(f"- Morning sync complete. You have {e.payload.get('meeting_count', 0)} meetings today.")
            elif e.type == "cleaned_done":
                event_descriptions.append(f"- Archive/Cleaned {e.payload.get('count', 0)} less important emails.")
            elif e.type == "sync_failed":
                event_descriptions.append("- I encountered an issue syncing your emails. It might be an expired connection or service issue.")
            elif e.type in ("greeting", "session_started", "welcome"):
                event_descriptions.append(f"- User just opened the app. Generate a short, warm greeting for {user_name}.")
            elif e.type == "sync_complete":
                count = e.payload.get("count", 0)
                cleaned = e.payload.get("cleaned_count", 0)
                if count > 0:
                    event_descriptions.append(f"- Synced and triaged {count} new emails ({cleaned} auto-cleaned).")

        if not event_descriptions:
            return f"Hey {user_name}, I'm up to date. Nothing new to report right now."

        joined_events = "\n".join(event_descriptions)
        
        tone = preferences.get("draft_tone", "Professional")
        directness = preferences.get("directness", 3)
        
        system_prompt = (
            f"You are Aaliyah, an elite Executive Assistant for {user_name}.\n"
            "Your job is to provide a concise, high-fidelity conversational update based on recent events.\n"
            f"TONE: {tone}. DIRECTNESS: {directness}/5.\n"
            "RULES:\n"
            "1. Be conversational and human. Don't sound like a log.\n"
            "2. Group multiple events into a cohesive narrative.\n"
            "3. No generic fluff like 'I hope you are well'.\n"
            "4. Match the user's preferred tone and directness.\n"
            "5. ALWAYS respond in professional English, even if context or user preferences suggest otherwise."
        )
        
        prompt = (
            f"Recent background events:\n{joined_events}\n\n"
            f"Generate a short update for {user_name}:"
        )
        
        try:
            from app.services.brain.schemas.models import ModelType
            response = await brain.think(
                prompt=prompt,
                system_prompt=system_prompt,
                model_override=ModelType.FAST.value,
                temperature_override=0.7
            )
            return response.content.strip()
        except Exception as e:
            # Fallback to simple logic if LLM fails — log with traceback for debugging
            logger.warning(f"CommunicationEngine LLM generation failed: {e}", exc_info=True)
            return f"{user_name}, I've processed {len(events)} updates for you. Check the feed for details."


    def _format_name(self, sender: str) -> str:
        if "@" in sender:
            return sender.split("@")[0]
        return sender
