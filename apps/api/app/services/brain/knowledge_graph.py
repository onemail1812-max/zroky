"""Knowledge Graph service: CRUD + query for entities and relationships.

This replaces the dead Node.js LightRAG code with a real, working Python
implementation backed by SQLAlchemy tables.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.knowledge_graph import KnowledgeEntity, KnowledgeRelationship
from app.services.cache import RedisCache

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """Structured fact store for Aaliyah's long-term understanding."""

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.cache = RedisCache("kg")

    def _invalidate_summary(self) -> None:
        self.cache.delete(f"summary:{self.workspace_id}")

    # -------------------------------------------------------------------
    # Entity CRUD
    # -------------------------------------------------------------------

    def upsert_entity(
        self,
        *,
        name: str,
        entity_type: str,
        properties: Optional[dict[str, Any]] = None,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        confidence: float = 1.0,
    ) -> KnowledgeEntity:
        """Create or update an entity by (workspace, name, entity_type)."""
        normalized_name = name.strip()
        normalized_type = entity_type.strip().lower()

        existing = (
            self.db.query(KnowledgeEntity)
            .filter(
                KnowledgeEntity.workspace_id == self.workspace_id,
                KnowledgeEntity.name == normalized_name,
                KnowledgeEntity.entity_type == normalized_type,
            )
            .first()
        )

        if existing:
            # Merge properties
            old_props = existing.properties or {}
            if isinstance(old_props, str):
                import json
                try:
                    old_props = json.loads(old_props)
                except Exception:
                    old_props = {}
            merged = {**old_props, **(properties or {})}
            existing.properties = merged
            existing.confidence = max(existing.confidence or 0, confidence)
            if source_type:
                existing.source_type = source_type
            if source_id:
                existing.source_id = source_id
            self.db.commit()
            self.db.refresh(existing)
            self._invalidate_summary()
            return existing

        entity = KnowledgeEntity(
            id=str(uuid.uuid4()),
            workspace_id=self.workspace_id,
            name=normalized_name,
            entity_type=normalized_type,
            properties=properties or {},
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        self._invalidate_summary()
        return entity

    def find_entity(self, name: str, entity_type: Optional[str] = None) -> Optional[KnowledgeEntity]:
        """Lookup an entity by name (and optionally type)."""
        query = self.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.workspace_id == self.workspace_id,
            KnowledgeEntity.name == name.strip(),
        )
        if entity_type:
            query = query.filter(KnowledgeEntity.entity_type == entity_type.strip().lower())
        return query.first()

    def find_entities_by_type(self, entity_type: str, limit: int = 50) -> list[KnowledgeEntity]:
        return (
            self.db.query(KnowledgeEntity)
            .filter(
                KnowledgeEntity.workspace_id == self.workspace_id,
                KnowledgeEntity.entity_type == entity_type.strip().lower(),
            )
            .order_by(KnowledgeEntity.updated_at.desc())
            .limit(limit)
            .all()
        )

    def search_entities(self, query: str, limit: int = 20) -> list[KnowledgeEntity]:
        """Simple LIKE search on entity names."""
        pattern = f"%{query.strip()}%"
        return (
            self.db.query(KnowledgeEntity)
            .filter(
                KnowledgeEntity.workspace_id == self.workspace_id,
                KnowledgeEntity.name.ilike(pattern),
            )
            .order_by(KnowledgeEntity.confidence.desc())
            .limit(limit)
            .all()
        )

    # -------------------------------------------------------------------
    # Relationship CRUD
    # -------------------------------------------------------------------

    def upsert_relationship(
        self,
        *,
        source_entity_id: str,
        target_entity_id: str,
        relation_type: str,
        properties: Optional[dict[str, Any]] = None,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        confidence: float = 1.0,
    ) -> KnowledgeRelationship:
        """Create or update a relationship edge."""
        normalized_rel = relation_type.strip().lower()

        existing = (
            self.db.query(KnowledgeRelationship)
            .filter(
                KnowledgeRelationship.workspace_id == self.workspace_id,
                KnowledgeRelationship.source_entity_id == source_entity_id,
                KnowledgeRelationship.target_entity_id == target_entity_id,
                KnowledgeRelationship.relation_type == normalized_rel,
            )
            .first()
        )

        if existing:
            old_props = existing.properties or {}
            if isinstance(old_props, str):
                import json
                try:
                    old_props = json.loads(old_props)
                except Exception:
                    old_props = {}
            existing.properties = {**old_props, **(properties or {})}
            existing.confidence = max(existing.confidence or 0, confidence)
            self.db.commit()
            self.db.refresh(existing)
            # Relationships change context less often but let's be safe
            self._invalidate_summary() 
            return existing

        rel = KnowledgeRelationship(
            id=str(uuid.uuid4()),
            workspace_id=self.workspace_id,
            source_entity_id=source_entity_id,
            target_entity_id=target_entity_id,
            relation_type=normalized_rel,
            properties=properties or {},
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        self._invalidate_summary() 
        return rel

    def get_relationships_for(self, entity_id: str, direction: str = "both", limit: int = 50) -> list[dict[str, Any]]:
        """
        Return relationships involving an entity.
        direction: 'outgoing', 'incoming', or 'both'.
        """
        results: list[KnowledgeRelationship] = []

        if direction in ("outgoing", "both"):
            results.extend(
                self.db.query(KnowledgeRelationship)
                .filter(
                    KnowledgeRelationship.workspace_id == self.workspace_id,
                    KnowledgeRelationship.source_entity_id == entity_id,
                )
                .limit(limit)
                .all()
            )

        if direction in ("incoming", "both"):
            results.extend(
                self.db.query(KnowledgeRelationship)
                .filter(
                    KnowledgeRelationship.workspace_id == self.workspace_id,
                    KnowledgeRelationship.target_entity_id == entity_id,
                )
                .limit(limit)
                .all()
            )

        return [
            {
                "id": r.id,
                "source_entity_id": r.source_entity_id,
                "target_entity_id": r.target_entity_id,
                "relation_type": r.relation_type,
                "properties": r.properties or {},
                "confidence": r.confidence,
            }
            for r in results[:limit]
        ]

    # -------------------------------------------------------------------
    # High-level: Store a structured fact
    # -------------------------------------------------------------------

    def store_fact(
        self,
        *,
        subject_name: str,
        subject_type: str,
        relation: str,
        object_name: str,
        object_type: str,
        properties: Optional[dict[str, Any]] = None,
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        confidence: float = 0.8,
    ) -> dict[str, Any]:
        """
        Convenience: store a triple (Subject -[relation]-> Object).

        Example:
            store_fact(
                subject_name="Steve Johnson", subject_type="person",
                relation="works_at",
                object_name="Acme Corp", object_type="organization",
            )
        """
        subject = self.upsert_entity(
            name=subject_name,
            entity_type=subject_type,
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )
        obj = self.upsert_entity(
            name=object_name,
            entity_type=object_type,
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )
        rel = self.upsert_relationship(
            source_entity_id=subject.id,
            target_entity_id=obj.id,
            relation_type=relation,
            properties=properties,
            source_type=source_type,
            source_id=source_id,
            confidence=confidence,
        )
        self._invalidate_summary()
        return {
            "subject": {"id": subject.id, "name": subject.name, "type": subject.entity_type},
            "relation": {"id": rel.id, "type": rel.relation_type},
            "object": {"id": obj.id, "name": obj.name, "type": obj.entity_type},
        }

    def store_preference(
        self,
        *,
        preference: str,
        category: str = "general",
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
    ) -> KnowledgeEntity:
        """Store a user preference as an entity."""
        # Upsert already invalidates
        return self.upsert_entity(
            name=preference,
            entity_type="preference",
            properties={"category": category},
            source_type=source_type,
            source_id=source_id,
            confidence=0.7,
        )

    # -------------------------------------------------------------------
    # Query: context summary for prompts
    # -------------------------------------------------------------------

    def summarize_for_prompt(self, query: str = "", max_entities: int = 10) -> str:
        """Build a context block Aaliyah can use in her system prompt."""
        
        # Only cache the generic "no query" context
        use_cache = not query.strip()
        cache_key = f"summary:{self.workspace_id}"
        
        if use_cache:
            cached = self.cache.get_json(cache_key)
            if cached and isinstance(cached, str):
                return cached
        
        parts: list[str] = []

        # Preferences
        prefs = self.find_entities_by_type("preference", limit=10)
        if prefs:
            pref_lines = [f"  - {p.name}" for p in prefs]
            parts.append("**User Preferences:**\n" + "\n".join(pref_lines))

        # Key people
        people = self.find_entities_by_type("person", limit=8)
        if people:
            people_lines: list[str] = []
            for p in people:
                rels = self.get_relationships_for(p.id, direction="outgoing", limit=3)
                rel_strs = [r["relation_type"] for r in rels]
                props = p.properties or {}
                desc = p.name
                if rel_strs:
                    desc += f" ({', '.join(rel_strs)})"
                if isinstance(props, dict) and props.get("role"):
                    desc += f" — {props['role']}"
                people_lines.append(f"  - {desc}")
            parts.append("**Known Contacts:**\n" + "\n".join(people_lines))

        # Matched entities by query
        if query.strip():
            matched = self.search_entities(query, limit=5)
            matched = [e for e in matched if e.entity_type not in ("preference", "person")]
            if matched:
                match_lines = [f"  - [{e.entity_type}] {e.name}" for e in matched]
                parts.append("**Related Knowledge:**\n" + "\n".join(match_lines))

        result = "\n".join(parts) if parts else ""
        
        if use_cache:
            self.cache.set_json(cache_key, result, ttl_seconds=600)
            
        return result
