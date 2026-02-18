"""Persistence helper for triaged inbox items."""

from __future__ import annotations

from datetime import datetime
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.triaged_email import TriagedEmail
from app.models.triaged_thread import TriagedThread


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
        previous_category: Optional[str] = None,
        deadline_at: Optional[datetime] = None,
        requires_approval: bool = False,
        approval_reason: Optional[str] = None,
        awaiting_reply: bool = False,
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
                previous_category=previous_category,
                deadline_at=deadline_at,
                requires_approval=requires_approval,
                approval_reason=approval_reason,
                awaiting_reply=awaiting_reply,
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
            row.deadline_at = deadline_at
            row.requires_approval = requires_approval
            row.approval_reason = approval_reason
            row.awaiting_reply = awaiting_reply
            
            if previous_category:
                row.previous_category = previous_category
            merged_meta = dict(row.metadata_json or {})
            merged_meta.update(metadata)
            row.metadata_json = merged_meta

        self.db.commit()
        self.db.refresh(row)

        # Update aggregated thread view
        if thread_id:
            self._upsert_thread(
                provider=provider,
                external_thread_id=thread_id,
                sender=sender,
                subject=subject,
                snippet=snippet,
                received_at=received_at,
                category=category,
                priority=priority,
                is_noise=is_noise,
                is_read=is_read,
                requires_approval=requires_approval,
                approval_reason=approval_reason,
                awaiting_reply=awaiting_reply,
                last_sent_at=received_at if awaiting_reply else None, 
                confidence=confidence_str,
                reasoning=reasoning,
                has_draft=bool(metadata.get("draft")) if metadata else False,
                draft_json=metadata.get("draft") if metadata else None
            )

        return row

    def _upsert_thread(
        self,
        *,
        provider: str,
        external_thread_id: str,
        sender: Optional[str],
        subject: Optional[str],
        snippet: str,
        received_at: Optional[datetime],
        category: str,
        priority: str,
        is_noise: bool,
        is_read: bool,
        requires_approval: bool,
        approval_reason: Optional[str] = None,
        awaiting_reply: bool,
        last_sent_at: Optional[datetime] = None,
        confidence: Optional[str] = None,
        reasoning: Optional[str] = None,
        has_draft: bool = False,
        draft_json: Optional[dict] = None,
    ) -> TriagedThread:
        thread = (
            self.db.query(TriagedThread)
            .filter(
                TriagedThread.workspace_id == self.workspace_id,
                TriagedThread.provider == provider,
                TriagedThread.external_thread_id == external_thread_id,
            )
            .first()
        )

        if thread is None:
            thread = TriagedThread(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                provider=provider,
                external_thread_id=external_thread_id,
                sender=sender,
                subject=subject,
                snippet=snippet,
                last_received_at=received_at,
                category=category,
                priority=priority,
                is_noise=is_noise,
                is_read=is_read,
                requires_approval=requires_approval,
                approval_reason=approval_reason,
                awaiting_reply=awaiting_reply,
                has_draft=has_draft,
                draft_json=draft_json,
                confidence=confidence,
                reasoning=reasoning,
                message_count=1,
            )
            self.db.add(thread)
        else:
            # Update thread with latest message info if it's newer
            if received_at and (not thread.last_received_at or received_at > thread.last_received_at):
                thread.sender = sender
                thread.subject = subject
                thread.snippet = snippet
                thread.last_received_at = received_at
                
                # Update aggregated flags - latest message often defines the thread state in the inbox
                thread.category = category
                thread.priority = priority
                thread.is_noise = is_noise
                thread.is_read = is_read
                thread.requires_approval = requires_approval
                thread.approval_reason = approval_reason
                thread.awaiting_reply = awaiting_reply
                if last_sent_at:
                    thread.last_sent_at = last_sent_at
                
                thread.has_draft = has_draft
                thread.draft_json = draft_json
                thread.confidence = confidence
                thread.reasoning = reasoning

            # Increment count
            thread.message_count = (
                self.db.query(TriagedEmail)
                .filter(
                    TriagedEmail.workspace_id == self.workspace_id,
                    TriagedEmail.thread_id == external_thread_id,
                )
                .count()
            )

        self.db.commit()
        self.db.refresh(thread)
        return thread

    def list_threads(
        self,
        *,
        queue: Optional[str] = None,
        provider: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[TriagedThread], int]:
        query = self.db.query(TriagedThread).filter(TriagedThread.workspace_id == self.workspace_id)
        
        if provider and provider != "all":
            query = query.filter(TriagedThread.provider == provider)
            
        if queue:
            if queue == "priority":
                query = query.filter(TriagedThread.priority == "High")
            elif queue == "approvals":
                query = query.filter(TriagedThread.requires_approval == True)
            elif queue == "needs_reply":
                query = query.filter(TriagedThread.awaiting_reply == True)
            elif queue == "follow-ups":
                query = query.filter(TriagedThread.category == "followups")
            elif queue == "fyi":
                query = query.filter(TriagedThread.category == "fyi")
            elif queue == "cleaned":
                query = query.filter(TriagedThread.is_noise == True)
            elif queue == "drafts":
                query = query.filter(TriagedThread.has_draft == True)
            else:
                query = query.filter(TriagedThread.category == queue)

        total = query.count()
        items = (
            query.order_by(TriagedThread.last_received_at.desc().nullslast(), TriagedThread.updated_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total
