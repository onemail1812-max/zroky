"""DualStateMemory: the unified memory facade.

Combines:
  - Hot State   (Redis) — user's current context (location, mood, project, deadlines)
  - Cold State  (Vector DB + Knowledge Graph) — historical context (relationships, preferences, facts)

All memory operations go through this class so the orchestrator never
has to think about which store to use.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.services.brain.hot_state import HotStateManager
from app.services.brain.vector_store import PostgresVectorStore
from app.services.brain.knowledge_graph import KnowledgeGraphService

logger = logging.getLogger(__name__)


class DualStateMemory:
    """Unified gateway to Aaliyah's complete memory system."""

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.hot = HotStateManager(workspace_id)
        self.cold = PostgresVectorStore(db, workspace_id)
        self.graph = KnowledgeGraphService(db, workspace_id)

    # -------------------------------------------------------------------
    # Context retrieval (RAG + Hot + Graph)
    # -------------------------------------------------------------------

    def recall(self, query: str, top_k: int = 3) -> dict[str, Any]:
        """
        Full context recall for a given query.

        Returns a merged dict with:
          - hot_state:       The user's real-time context
          - memories:        Relevant vector store results
          - knowledge_graph: Structured facts/entities
          - prompt_context:  A pre-formatted string ready for LLM injection
        """
        # 1. Hot state
        hot_state = self.hot.get()
        hot_summary = self.hot.summarize_for_prompt()

        # 2. Cold state — vector search
        memories = self.cold.similarity_search(query, top_k=top_k)

        # 3. Knowledge graph context
        graph_summary = self.graph.summarize_for_prompt(query=query)

        # 4. Build combined prompt context
        prompt_parts: list[str] = []
        if hot_summary:
            prompt_parts.append(hot_summary)
        if graph_summary:
            prompt_parts.append(graph_summary)
        if memories:
            # Sort by relevance (highest similarity first)
            sorted_mems = sorted(memories[:top_k * 2], key=lambda m: m.get("similarity", 0), reverse=True)
            mem_lines = []
            for m in sorted_mems[:5]:
                sim = m.get("similarity", 0)
                if sim > 0.25:  # Only include meaningfully relevant memories
                    snippet = (m.get("content_text") or "")[:200]
                    source = m.get("source_type", "?")
                    mem_lines.append(f"  - [{source}] {snippet}")
            if mem_lines:
                prompt_parts.append("**Relevant Past Context:**\n" + "\n".join(mem_lines))

        prompt_context = "\n\n".join(prompt_parts) if prompt_parts else ""

        return {
            "hot_state": hot_state,
            "memories": memories,
            "knowledge_graph": graph_summary,
            "prompt_context": prompt_context,
        }

    # -------------------------------------------------------------------
    # Storage: save context from interactions
    # -------------------------------------------------------------------

    def save_interaction(
        self,
        *,
        source_type: str,
        source_id: str,
        content_text: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> None:
        """Save a piece of content to vector store and update hot state."""
        # 1. Vector store
        self.cold.upsert_text(
            source_type=source_type,
            source_id=source_id,
            content_text=content_text,
            metadata=metadata,
        )

        # 2. Touch hot state
        self.hot.touch()

    def learn_fact(
        self,
        *,
        subject_name: str,
        subject_type: str,
        relation: str,
        object_name: str,
        object_type: str,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        confidence: float = 0.8,
    ) -> dict[str, Any]:
        """Store a structured triple in the knowledge graph."""
        return self.graph.store_fact(
            subject_name=subject_name,
            subject_type=subject_type,
            relation=relation,
            object_name=object_name,
            object_type=object_type,
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )

    def learn_preference(
        self,
        preference: str,
        category: str = "general",
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
    ) -> None:
        """Store a user preference."""
        self.graph.store_preference(
            preference=preference,
            category=category,
            source_type=source_type,
            source_id=source_id,
        )

    # -------------------------------------------------------------------
    # Extraction: auto-learn from content
    # -------------------------------------------------------------------

    def extract_and_learn_from_email(
        self,
        *,
        sender: str,
        subject: str,
        body: str,
        email_id: str,
    ) -> list[dict[str, Any]]:
        """
        Extract structured facts from an email and store them.

        This is a lightweight rule-based extractor. For production,
        you'd want an LLM-based NER step here.
        """
        facts: list[dict[str, Any]] = []

        # Extract sender as a person entity
        sender_name = _extract_name_from_email(sender)
        if sender_name:
            sender_entity = self.graph.upsert_entity(
                name=sender_name,
                entity_type="person",
                properties={"email": sender},
                source_type="email",
                source_id=email_id,
            )
            facts.append({
                "type": "entity",
                "name": sender_name,
                "entity_type": "person",
            })

        # Also save to vector store for semantic search
        content = f"Email from {sender} | Subject: {subject} | {body[:500]}"
        self.cold.upsert_text(
            source_type="email",
            source_id=email_id,
            content_text=content,
            metadata={"sender": sender, "subject": subject},
        )

        return facts

    def extract_and_learn_from_calendar(
        self,
        *,
        event_title: str,
        attendees: list[str],
        event_id: str,
        start_time: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Extract entities from a calendar event."""
        facts: list[dict[str, Any]] = []

        # Event as entity
        self.graph.upsert_entity(
            name=event_title,
            entity_type="meeting",
            properties={"start_time": start_time, "attendees": attendees},
            source_type="calendar",
            source_id=event_id,
        )

        # Attendees as people
        for att in attendees:
            att_name = _extract_name_from_email(att)
            if att_name:
                person = self.graph.upsert_entity(
                    name=att_name,
                    entity_type="person",
                    properties={"email": att},
                    source_type="calendar",
                    source_id=event_id,
                )
                # Relationship: person attended meeting
                event_ent = self.graph.find_entity(event_title, "meeting")
                if event_ent:
                    self.graph.upsert_relationship(
                        source_entity_id=person.id,
                        target_entity_id=event_ent.id,
                        relation_type="attends",
                        source_type="calendar",
                        source_id=event_id,
                    )
                facts.append({"type": "attendee", "name": att_name})

        return facts

    # -------------------------------------------------------------------
    # Hot state convenience pass-through
    # -------------------------------------------------------------------

    def set_location(self, location: str) -> None:
        self.hot.set_location(location)

    def set_mood(self, mood: str) -> None:
        self.hot.set_mood(mood)

    def set_active_project(self, project: str | None) -> None:
        self.hot.set_active_project(project)

    def add_deadline(self, label: str, due_at: str | datetime) -> None:
        self.hot.add_deadline(label, due_at)

    def remove_deadline(self, label: str) -> None:
        self.hot.remove_deadline(label)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_name_from_email(email_or_name: str) -> Optional[str]:
    """Try to extract a human name from 'Name <email>' or plain email."""
    if not email_or_name:
        return None

    # Handle "John Doe <john@example.com>" format
    match = re.match(r'^(.+?)\s*<[^>]+>$', email_or_name.strip())
    if match:
        name = match.group(1).strip().strip('"').strip("'")
        if name:
            return name

    # Handle plain email — derive from local part
    email_match = re.match(r'^([a-zA-Z0-9_.+-]+)@', email_or_name.strip())
    if email_match:
        local = email_match.group(1)
        # Convert john.doe to John Doe
        parts = re.split(r'[._]', local)
        if parts:
            name = " ".join(p.capitalize() for p in parts if len(p) > 1)
            if name:
                return name

    # Already a name?
    clean = email_or_name.strip()
    if clean and "@" not in clean:
        return clean

    return None
