from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column, DateTime, String, Text, ForeignKey, Index
from sqlalchemy.orm import Session

from app.database import Base
from app.db_types import SafeJSON

class ChatMessageRow(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    workspace_id = Column(String, index=True, nullable=False)
    thread_id = Column(String, index=True, nullable=True) # If null, it's global chat
    email_id = Column(String, index=True, nullable=True) # If set, it's a chat for a specific email
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=True)
    msg_type = Column(String, default="text") # 'text' or 'email_action'
    payload = Column(SafeJSON(), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

class ChatRepository:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id

    def list_messages(self, thread_id: Optional[str] = None, email_id: Optional[str] = None, limit: int = 50) -> list[ChatMessageRow]:
        query = self.db.query(ChatMessageRow).filter(
            ChatMessageRow.workspace_id == self.workspace_id
        )
        if email_id:
            query = query.filter(ChatMessageRow.email_id == email_id)
        elif thread_id:
            query = query.filter(ChatMessageRow.thread_id == thread_id)
        else:
            query = query.filter(ChatMessageRow.thread_id.is_(None), ChatMessageRow.email_id.is_(None))
            
        return query.order_by(ChatMessageRow.created_at.asc()).limit(limit).all()

    def add_message(
        self, 
        *, 
        id: str,
        role: str, 
        content: Optional[str] = None, 
        thread_id: Optional[str] = None,
        email_id: Optional[str] = None,
        msg_type: str = "text",
        payload: Optional[dict[str, Any]] = None
    ) -> ChatMessageRow:
        row = ChatMessageRow(
            id=id,
            workspace_id=self.workspace_id,
            thread_id=thread_id,
            email_id=email_id,
            role=role,
            content=content,
            msg_type=msg_type,
            payload=payload
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        
        try:
            from app.services.cache import invalidate_cache
            invalidate_cache("assist_history", workspace_id=self.workspace_id)
            invalidate_cache("assist_messages", workspace_id=self.workspace_id)
        except Exception:
            pass
            
        return row
