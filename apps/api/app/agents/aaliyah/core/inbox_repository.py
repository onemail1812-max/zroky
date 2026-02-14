"""Persistence helper for triaged inbox items."""

from __future__ import annotations

from datetime import datetime
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail


class TriagedInboxRepository:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def upsert(
        self,
        *,
        provider: str,
        external_message_id: str,
        thread_id: Optional[str],
        sender: Optional[str],
        subject: Optional[str],
        snippet: str,
        received_at: Optional[datetime],
        category: str,
        priority: str,
        is_noise: bool,
        is_read: bool,
        confidence: float,
        reasoning: str,
        metadata: dict,
    ) -> TriagedEmail:
        row = (
            self.db.query(TriagedEmail)
            .filter(
                TriagedEmail.workspace_id == self.workspace_id,
                TriagedEmail.provider == provider,
                TriagedEmail.external_message_id == external_message_id,
            )
            .first()
        )
        confidence_str = f"{confidence:.3f}"
        if row is None:
            row = TriagedEmail(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                provider=provider,
                external_message_id=external_message_id,
                thread_id=thread_id,
                sender=sender,
                subject=subject,
                snippet=snippet,
                received_at=received_at,
                category=category,
                priority=priority,
                is_noise=is_noise,
                is_read=is_read,
                confidence=confidence_str,
                reasoning=reasoning,
                metadata_json=metadata,
            )
            self.db.add(row)
        else:
            row.thread_id = thread_id
            row.sender = sender
            row.subject = subject
            row.snippet = snippet
            row.received_at = received_at
            row.category = category
            row.priority = priority
            row.is_noise = is_noise
            row.is_read = is_read
            row.confidence = confidence_str
            row.reasoning = reasoning
            merged_meta = dict(row.metadata_json or {})
            merged_meta.update(metadata)
            row.metadata_json = merged_meta

        self.db.commit()
        self.db.refresh(row)
        return row

    def list_recent(
        self,
        *,
        limit: int = 50,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        include_noise: bool = False,
    ) -> list[TriagedEmail]:
        query = self.db.query(TriagedEmail).filter(TriagedEmail.workspace_id == self.workspace_id)
        if category:
            query = query.filter(TriagedEmail.category == category)
        if priority:
            query = query.filter(TriagedEmail.priority == priority)
        if not include_noise:
            query = query.filter(TriagedEmail.is_noise.is_(False))
        return (
            query.order_by(TriagedEmail.received_at.desc().nullslast(), TriagedEmail.updated_at.desc())
            .limit(max(1, min(limit, 200)))
            .all()
        )
