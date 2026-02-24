from __future__ import annotations
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

@dataclass
class CommunicationState:
    last_message_at: float = 0.0
    pending_events: List[CommunicationEvent] = field(default_factory=list)

class CommunicationEngine:
    MIN_INTERVAL_SECONDS = 120  # 2 minutes
    MAX_BATCH_SIZE = 50

    def __init__(self):
        pass

    def add_event(self, state: CommunicationState, event_type: str, payload: Dict[str, Any]) -> None:
        """Queue an event for the next communication batch."""
        event = CommunicationEvent(
            type=event_type,
            payload=payload,
            timestamp=datetime.now(timezone.utc).timestamp()
        )
        state.pending_events.append(event)
        # Prevent indefinite growth if not flushed
        if len(state.pending_events) > self.MAX_BATCH_SIZE:
            state.pending_events.pop(0)

    def should_flush(self, state: CommunicationState) -> bool:
        """Check if enough time has passed to send a batch."""
        if not state.pending_events:
            return False
        
        now = datetime.now(timezone.utc).timestamp()
        time_since_last = now - state.last_message_at
        
        # If we haven't spoken in a while, speak now
        return time_since_last >= self.MIN_INTERVAL_SECONDS

    async def flush(self, state: CommunicationState, user_name: str, brain: Any, preferences: Dict[str, Any]) -> Optional[str]:
        """Aggregate events and generate a human-like message using LLM."""
        if not self.should_flush(state):
            return None

        # Snapshot events and clear queue
        events = list(state.pending_events)
        state.pending_events.clear()
        state.last_message_at = datetime.now(timezone.utc).timestamp()

        if not events:
            return None

        return await self._generate_llm_message(events, user_name, brain, preferences)

    async def _generate_llm_message(self, events: List[CommunicationEvent], user_name: str, brain: Any, preferences: Dict[str, Any]) -> str:
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
            elif e.type == "daily_6am_sync_complete":
                event_descriptions.append(f"- Morning sync complete. You have {e.payload.get('meeting_count', 0)} meetings today.")
            elif e.type == "cleaned_done":
                event_descriptions.append(f"- Archive/Cleaned {e.payload.get('count', 0)} less important emails.")

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
            "4. Match the user's preferred tone and directness."
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
        except Exception:
            # Fallback to simple logic if LLM fails
            return f"Boss, I've processed {len(events)} updates for you. Check the feed for details."


    def _format_name(self, sender: str) -> str:
        if "@" in sender:
            return sender.split("@")[0]
        return sender
