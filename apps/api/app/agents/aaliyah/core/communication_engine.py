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

    def flush(self, state: CommunicationState, user_name: str) -> Optional[str]:
        """Aggregate events and generate a human-like message."""
        if not self.should_flush(state):
            return None

        # Snapshot events and clear queue
        events = list(state.pending_events)
        state.pending_events.clear()
        state.last_message_at = datetime.now(timezone.utc).timestamp()

        if not events:
            return None

        return self._generate_message(events, user_name)

    def _generate_message(self, events: List[CommunicationEvent], user_name: str) -> str:
        # 1. Provide a greeting
        greeting = f"{user_name},"
        
        # 2. Aggregate events
        groups: Dict[str, List[CommunicationEvent]] = {}
        for e in events:
            groups.setdefault(e.type, []).append(e)

        segments = []
        cta = "Standing by for instructions."

        # cleaned_done (Priority Low)
        if "cleaned_done" in groups:
            # Maybe sum counts if available, generally just "Cleaned inbox."
            # Assuming payload might have 'count'
            total_cleaned = sum(e.payload.get("count", 0) for e in groups["cleaned_done"])
            if total_cleaned > 0:
                segments.append(f"I've cleaned {total_cleaned} emails")
            else:
                segments.append("Inbox is clean")

        # priority_added
        if "priority_added" in groups:
            count = len(groups["priority_added"])
            segments.append(f"flagged {count} high-priority items")

        # draft_ready
        if "draft_ready" in groups:
            drafts = groups["draft_ready"]
            count = len(drafts)
            if count == 1:
                # payload might have sender/subject
                sender = drafts[0].payload.get("sender", "someone")
                segments.append(f"drafted a reply to {self._format_name(sender)}")
            else:
                segments.append(f"drafted {count} replies")
            cta = "Review drafts."

        # approval_required
        if "approval_required" in groups:
            approvals = groups["approval_required"]
            count = len(approvals)
            if count == 1:
                subject = approvals[0].payload.get("subject", "a request")
                segments.append(f"I need your approval for '{subject}'")
            else:
                segments.append(f"I need approval for {count} items")
            cta = "Review approvals."

        # followup_due
        if "followup_due" in groups:
            # Usually payload has "count"
            total = sum(e.payload.get("count", 0) for e in groups["followup_due"])
            if total > 0:
                segments.append(f"{total} follow-ups are due")
                # CTA logic: higher priority than drafts?
                if cta == "Standing by for instructions." or cta == "Review drafts.":
                     cta = "Check follow-ups."

        # daily_6am_sync_complete
        if "daily_6am_sync_complete" in groups:
            # Special distinct message usually? Or combined?
            # "Good morning {Name}. Synced calendar. You have 3 meetings."
            # If this event exists, it overrides standard flow or prepends it?
            # Let's treat it as a segment but maybe it sets the tone.
            summary = groups["daily_6am_sync_complete"][-1] # Take latest
            meeting_count = summary.payload.get("meeting_count", 0)
            segments.insert(0, f"I've synced your calendar (you have {meeting_count} meetings today)")
            greeting = f"Good morning {user_name}." # Override greeting for morning sync

        # 3. Combine segments
        if not segments:
            body = "Just checking in."
        else:
            # "I've cleaned 5 emails, flagged 2 items, and drafted 1 reply."
            # Join with commas and 'and'
            if len(segments) == 1:
                body = segments[0] + "."
            elif len(segments) == 2:
                body = f"{segments[0]} and {segments[1]}."
            else:
                body = ", ".join(segments[:-1]) + f", and {segments[-1]}."
            
            # Capitalize first letter of body if not already
            body = body[0].upper() + body[1:]

        return f"{greeting} {body} {cta}"

    def _format_name(self, sender: str) -> str:
        if "@" in sender:
            return sender.split("@")[0]
        return sender
