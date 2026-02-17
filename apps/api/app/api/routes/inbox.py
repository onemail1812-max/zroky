from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import CurrentContext, get_current_context
from app.models.email import EmailMessage
from app.models.integration import Integration, IntegrationProvider
from app.models.workspace import Workspace
from app.services.email.ingest import sync_all_inboxes
from app.models.draft import Draft, DraftStatus
import json
from app.services.llm.service import llm_service

router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])

@router.get("/")
def list_inbox_messages(
    filter: Optional[str] = Query("all", regex="^(all|unread|priority|needs_reply|newsletter|approvals|drafts|cleaned)$"),
    provider: Optional[str] = Query("all", regex="^(all|google|microsoft)$"),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    List messages from the unified inbox.
    """
    query = db.query(EmailMessage).filter(EmailMessage.workspace_id == context.workspace_id)
    
    # Provider Filter
    if provider != "all":
        query = query.filter(EmailMessage.provider == provider)
        
    
    # Status Filters (Using new labels)
    # We must implement partial JSON contains or python-side filtering if SQLite JSON support is limited.
    # For MVP sqlite (json_each is available in modern sqlite but lets do simpler LIKE for compatibility or python filter)
    
    if filter == "unread":
        query = query.filter(EmailMessage.is_read == False)
    elif filter == "priority":
        query = query.filter(EmailMessage.labels.like(f'%"priority"%'))
    elif filter == "needs_reply":
        query = query.filter(EmailMessage.labels.like(f'%"needs_reply"%'))
    elif filter == "cleaned":
        query = query.filter(EmailMessage.labels.like(f'%"newsletter"%'))
    elif filter == "approvals":
        query = query.join(Draft).filter(Draft.status == DraftStatus.PENDING_APPROVAL)
    elif filter == "drafts":
        query = query.join(Draft).filter(Draft.status == DraftStatus.READY)
        
    # Order by received_at desc
    query = query.order_by(EmailMessage.received_at.desc())
    
    total = query.count()
    messages = query.offset(skip).limit(limit).all()
    
    # Enhance with "Primary" badge info
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    primary_provider = (workspace.settings_json or {}).get("aaliyah", {}).get("primary_email_provider")
    
    results = []
    for msg in messages:
        # Check if this messages comes from the primary provider account
        is_primary = False
        if primary_provider:
            # Need to check integration provider type
            # Naive check: provider string match
            if msg.provider == primary_provider:
                is_primary = True

        # Attach draft if exists
        draft_payload = None
        if "needs_reply" in (msg.labels or []):
            draft = db.query(Draft).filter(Draft.email_message_id == msg.id).first()
            if draft:
                draft_payload = {
                    "id": draft.id,
                    "subject": draft.subject,
                    "body": draft.body,
                    "status": draft.status,
                    "reasoning": draft.ai_generated_reasoning,
                    "updatedAt": draft.updated_at.isoformat() if draft.updated_at else None
                }

        results.append({
            "id": msg.id,
            "threadId": msg.thread_id,
            "provider": msg.provider, # google | microsoft
            "subject": msg.subject,
            "snippet": msg.snippet,
            "bodyCleaned": msg.body_cleaned, # Full body for reading
            "sender": msg.sender,
            "receivedAt": msg.received_at.isoformat(),
            "isRead": msg.is_read,
            "labels": msg.labels,
            "isPrimaryAccount": is_primary,
            "draft": draft_payload
        })
        
    return {
        "data": results,
        "meta": {
            "total": total,
            "skip": skip,
            "limit": limit
        }
    }

@router.get("/counts")
def get_inbox_counts(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get live counts for sidebar badges.
    """
    base_query = db.query(EmailMessage).filter(EmailMessage.workspace_id == context.workspace_id)
    
    needs_reply = base_query.filter(EmailMessage.labels.like('%"needs_reply"%')).count()
    priority = base_query.filter(EmailMessage.labels.like('%"priority"%')).count()
    cleaned = base_query.filter(EmailMessage.labels.like('%"newsletter"%')).count()
    
    # Approvals (Pending Approval Drafts)
    approvals = db.query(EmailMessage).join(Draft).filter(
        EmailMessage.workspace_id == context.workspace_id,
        Draft.status == DraftStatus.PENDING_APPROVAL
    ).count()

    # Drafts (Ready Drafts)
    drafts = db.query(EmailMessage).join(Draft).filter(
        EmailMessage.workspace_id == context.workspace_id,
        Draft.status == DraftStatus.READY
    ).count()
    
    return {
        "needs_reply": needs_reply,
        "priority": priority,
        "approvals": approvals,
        "drafts": drafts,
        "cleaned": cleaned,
        "follow_ups": 0,
        "fyi": 0
    }

@router.post("/sync")
def trigger_inbox_sync(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Manually trigger sync for all connected inboxes.
    """
    # In prod, this should likely be a background task (Celery/RQ)
    # For MVP, we run it inline but beware of timeouts if many emails.
    try:
        sync_all_inboxes(db, context.workspace_id)
        return {"status": "synced"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{message_id}/summary")
async def get_message_summary(
    message_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Generate a 3-bullet summary of the thread using reasoning model.
    """
    msg = db.query(EmailMessage).filter(EmailMessage.id == message_id, EmailMessage.workspace_id == context.workspace_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    summary_bullets = await llm_service.summarize_thread(msg)
    return {"summary": summary_bullets}
