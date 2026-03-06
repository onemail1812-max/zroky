"""TriagedInboxRepository — queries the triaged_emails table for the inbox views."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, Tuple, List
import uuid

from app.models.triaged_email import TriagedEmail


class TriagedInboxRepository:
    """Repository for querying AI-triaged emails."""

    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def upsert(self, **kwargs) -> Optional[TriagedEmail]:
        """Upsert a triaged email record."""
        external_id = kwargs.get("external_message_id")
        if not external_id:
            return None
            
        row = self.db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id,
            TriagedEmail.external_message_id == external_id
        ).first()
        
        if not row:
            row = TriagedEmail(
                id=str(uuid.uuid4()),
                workspace_id=self.workspace_id,
                external_message_id=external_id,
            )
            self.db.add(row)
            
        for key, value in kwargs.items():
            if hasattr(row, key):
                setattr(row, key, value)
                
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_threads(
        self,
        *,
        queue: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        allowed_providers: Optional[List[str]] = None,
    ) -> Tuple[List[TriagedEmail], int]:
        """Return paginated triaged emails from the database."""
        q = self.db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id
        )

        # Map queue names to category/priority filters
        if queue:
            q_lower = queue.lower()
            if q_lower == "all":
                pass # No category filter
            elif q_lower == "priority":
                q = q.filter(TriagedEmail.priority == "High")
            else:
                queue_to_category = {
                    "reply": "Needs Reply",
                    "needs_reply": "Needs Reply",
                    "approvals": "Approvals",
                    "followup": "Follow-ups",
                    "follow_ups": "Follow-ups",
                    "follow_up": "Follow-ups",
                    "fyi": "Notifications",
                    "notifications": "Notifications",
                    "newsletter": "Newsletter",
                    "noise": "Cleaned",
                    "cleaned": "Cleaned",
                }
                category = queue_to_category.get(q_lower)
                if category:
                    q = q.filter(TriagedEmail.category == category)
                else:
                    # If legacy or unknown, try title case but log as a smell
                    # and default to skip filtering if it doesn't look like a real category
                    category = queue.title()
                    q = q.filter(TriagedEmail.category == category)

        if allowed_providers is not None:
             q = q.filter(TriagedEmail.provider.in_(allowed_providers))

        total = q.count()
        rows = q.order_by(desc(TriagedEmail.received_at)).offset(offset).limit(limit).all()
        return rows, total
