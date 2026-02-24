import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from app.models.knowledge_graph import KnowledgeEntity, KnowledgeRelationship

logger = logging.getLogger(__name__)

class RelationshipManager:
    """Manages professional relationships and stakeholder intelligence in the KG."""

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def upsert_stakeholder(self, email: str, name: Optional[str] = None) -> KnowledgeEntity:
        """Create or update a stakeholder entity by email."""
        entity = self.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.workspace_id == self.workspace_id,
            KnowledgeEntity.entity_type == "person",
            KnowledgeEntity.name == email # Using email as name for unique lookups
        ).first()

        now = datetime.utcnow()
        if not entity:
            entity = KnowledgeEntity(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                name=email,
                entity_type="person",
                properties={
                    "display_name": name or email.split("@")[0],
                    "email": email,
                    "interaction_count": 0,
                    "first_seen": now.isoformat(),
                    "last_seen": now.isoformat(),
                    "importance_score": 0.5
                },
                confidence=1.0
            )
            self.db.add(entity)
            logger.info(f"New stakeholder created: {email}")
        else:
            props = dict(entity.properties or {})
            if name and (not props.get("display_name") or props["display_name"] == email.split("@")[0]):
                props["display_name"] = name
            entity.properties = props
            
        self.db.commit()
        return entity

    def record_interaction(self, email: str, message_id: str, direction: str = "incoming") -> None:
        """Record an interaction (email sent or received) with a stakeholder."""
        entity = self.upsert_stakeholder(email)
        
        props = dict(entity.properties or {})
        props["interaction_count"] = props.get("interaction_count", 0) + 1
        props["last_seen"] = datetime.utcnow().isoformat()
        
        # Heuristic: Increase importance score slightly with frequent interactions
        current_score = props.get("importance_score", 0.5)
        props["importance_score"] = min(1.0, current_score + 0.01)
        
        entity.properties = props
        self.db.commit()
        
        logger.debug(f"Interaction recorded for {email} (count={props['interaction_count']})")

    def get_relationship_summary(self, email: str) -> str:
        """Return a human-readable summary of the relationship for AI context."""
        entity = self.db.query(KnowledgeEntity).filter(
            KnowledgeEntity.workspace_id == self.workspace_id,
            KnowledgeEntity.entity_type == "person",
            KnowledgeEntity.name == email
        ).first()

        if not entity:
            return "This is a new contact. No prior history."

        props = entity.properties or {}
        count = props.get("interaction_count", 0)
        last_seen = props.get("last_seen", "Unknown")
        name = props.get("display_name", email)
        
        if count == 0:
            return f"{name} is a known contact but we have no recorded interactions yet."
            
        return f"You have interacted with {name} {count} times. Last seen: {last_seen}."

    def link_entities(self, source_id: str, target_id: str, relation_type: str) -> None:
        """Create a relationship edge (e.g., Person -> worksAt -> Company)."""
        rel = self.db.query(KnowledgeRelationship).filter(
            KnowledgeRelationship.workspace_id == self.workspace_id,
            KnowledgeRelationship.source_entity_id == source_id,
            KnowledgeRelationship.target_entity_id == target_id,
            KnowledgeRelationship.relation_type == relation_type
        ).first()

        if not rel:
            rel = KnowledgeRelationship(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                source_entity_id=source_id,
                target_entity_id=target_id,
                relation_type=relation_type,
                confidence=1.0
            )
            self.db.add(rel)
            self.db.commit()
            logger.info(f"KG Edge created: {source_id} --{relation_type}--> {target_id}")
