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
    ) -> Tuple[List[TriagedEmail], int]:
        """Return paginated triaged emails from the database."""
        q = self.db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == self.workspace_id
        )

        # Map queue names to category filters
        if queue:
            queue_to_category = {
                "priority": "Priority",
                "reply": "Needs Reply",
                "needs_reply": "Needs Reply",
                "approvals": "Approval",
                "followup": "Follow Up",
                "follow_up": "Follow Up",
                "fyi": "FYI",
                "newsletter": "Newsletter",
                "noise": "Noise",
            }
            category = queue_to_category.get(queue.lower(), queue)
            q = q.filter(TriagedEmail.category == category)

        total = q.count()
        rows = q.order_by(desc(TriagedEmail.received_at)).offset(offset).limit(limit).all()
        return rows, total
