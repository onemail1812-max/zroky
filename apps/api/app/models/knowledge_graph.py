"""Knowledge Graph models: entities and relationships.

Provides structured fact storage so Aaliyah can track things like:
  - "Steve Johnson works at Acme Corp" (Person -> worksAt -> Organization)
  - "User prefers morning meetings" (User -> prefers -> Pattern)
  - "Project Alpha deadline is March 15" (Project -> deadline -> Date)
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text, Index

from app.database import Base
from app.db_types import SafeJSON


class KnowledgeEntity(Base):
    """A named entity extracted from conversations, emails, or calendars."""

    __tablename__ = "knowledge_entities"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    name = Column(String(512), nullable=False, index=True)
    entity_type = Column(String(64), nullable=False, index=True)  # person, org, project, preference, pattern
    properties = Column(SafeJSON(), nullable=True)  # free-form key/value pairs
    source_type = Column(String(64), nullable=True)  # email, chat, calendar
    source_id = Column(String(256), nullable=True)
    confidence = Column(String, default="1.0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_kg_entity_ws_name", "workspace_id", "name"),
        Index("ix_kg_entity_ws_type", "workspace_id", "entity_type"),
    )


class KnowledgeRelationship(Base):
    """A directed edge between two entities."""

    __tablename__ = "knowledge_relationships"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    source_entity_id = Column(String, nullable=False, index=True)
    target_entity_id = Column(String, nullable=False, index=True)
    relation_type = Column(String(128), nullable=False, index=True)  # worksAt, prefers, attendedWith, etc.
    properties = Column(SafeJSON(), nullable=True)
    confidence = Column(String, default="1.0", nullable=False)
    source_type = Column(String(64), nullable=True)
    source_id = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_kg_rel_ws_source", "workspace_id", "source_entity_id"),
        Index("ix_kg_rel_ws_target", "workspace_id", "target_entity_id"),
        Index("ix_kg_rel_ws_type", "workspace_id", "relation_type"),
    )
