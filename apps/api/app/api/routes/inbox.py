from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
import io
import base64

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.triaged_email import TriagedEmail
from app.models.triaged_thread import TriagedThread
from app.agents.aaliyah.core.inbox_repository import TriagedInboxRepository
from app.services.security.file_security import FileSecurityService
from app.services.integrations.email_connector import EmailConnectorFactory
from app.schemas.inbox import (
    InboxThreadsListResponse,
    InboxThreadResponse,
    InboxCountsResponse,
    ProviderTotalsResponse,
    SnoozeRequest,
    MoveRequest,
)
from app.services.llm.service import llm_service
from app.models.email import EmailMessage

router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])


@router.get("/threads", response_model=InboxThreadsListResponse)
async def list_threads(
    queue: Optional[str] = Query(None, description="priority | newsletter | etc"),
    provider: str = Query("all", description="all | google | microsoft"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    List triaged email threads by queue and provider.
    """
    repo = TriagedInboxRepository(db, context.workspace_id)
    p = "google" if provider in ["google", "gmail"] else ("microsoft" if provider in ["microsoft", "outlook"] else "all")
    
    threads, total = repo.list_threads(
        queue=queue,
        provider=p,
        limit=limit,
        offset=offset
    )

    return {
        "items": [
            InboxThreadResponse(
                id=item.id,
                thread_id=item.external_thread_id or "",
                provider=item.provider,
                sender=item.sender or "Unknown",
                subject=item.subject or "(No Subject)",
                snippet=item.snippet or "",
                received_at=item.last_received_at,
                category=item.category,
                priority=item.priority,
                is_noise=item.is_noise,
                is_read=item.is_read,
                confidence=item.confidence,
                reasoning=item.reasoning,
                requires_approval=item.requires_approval,
                deadline_at=None,
                awaiting_reply=item.awaiting_reply,
                draft_preview="\n".join((item.draft_json or {}).get("body", "").splitlines()[:2]),
                draft=item.draft_json,
            )
            for item in threads
        ],
        "count": total,
    }


@router.get("/threads/{thread_id}", response_model=List[InboxThreadResponse])
async def get_thread_details(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get full details for a single thread.
    """
    items = (
        db.query(TriagedEmail)
        .filter(
            TriagedEmail.thread_id == thread_id,
            TriagedEmail.workspace_id == context.workspace_id,
        )
        .order_by(TriagedEmail.received_at.asc())
        .all()
    )

    if not items:
        raise HTTPException(status_code=404, detail="Thread not found")

    return [
        InboxThreadResponse(
            id=item.id,
            thread_id=item.thread_id or "",
            provider=item.provider,
            sender=item.sender or "Unknown",
            subject=item.subject or "(No Subject)",
            snippet=item.snippet,
            received_at=item.received_at,
            category=item.category,
            priority=item.priority,
            is_noise=item.is_noise,
            is_read=item.is_read,
            confidence=item.confidence,
            reasoning=item.reasoning,
            requires_approval=item.requires_approval,
            approval_reason=item.approval_reason,
            deadline_at=item.deadline_at,
            awaiting_reply=item.awaiting_reply,
            draft_preview="\n".join((item.metadata_json or {}).get("draft", {}).get("body", "").splitlines()[:2]),
            draft=(item.metadata_json or {}).get("draft"),
        )
        for item in items
    ]


@router.get("/counts", response_model=InboxCountsResponse)
async def get_inbox_counts(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get aggregated counts for the inbox.
    """
    base_query = db.query(TriagedThread).filter(TriagedThread.workspace_id == context.workspace_id)

    # Categories
    categories = db.query(
        TriagedThread.category, func.count(TriagedThread.id)
    ).filter(TriagedThread.workspace_id == context.workspace_id).group_by(TriagedThread.category).all()
    
    # Priority
    priorities = db.query(
        TriagedThread.priority, func.count(TriagedThread.id)
    ).filter(TriagedThread.workspace_id == context.workspace_id).group_by(TriagedThread.priority).all()

    # Unread
    unread_count = base_query.filter(TriagedThread.is_read == False).count()

    return {
        "by_category": {cat: count for cat, count in categories},
        "by_priority": {pri: count for pri, count in priorities},
        "total_unread": unread_count,
    }


@router.get("/stats/providers", response_model=ProviderTotalsResponse)
async def get_provider_totals(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get breakdown of emails by provider.
    """
    google = db.query(TriagedThread).filter(
        TriagedThread.workspace_id == context.workspace_id,
        TriagedThread.provider == "google"
    ).count()

    microsoft = db.query(TriagedThread).filter(
        TriagedThread.workspace_id == context.workspace_id,
        TriagedThread.provider == "microsoft"
    ).count()

    return {
        "google": google,
        "microsoft": microsoft,
        "total": google + microsoft
    }


@router.post("/{message_id}/snooze")
async def snooze_email(
    message_id: str,
    payload: SnoozeRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Snooze an email message until a later time.
    """
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Email not found")

    until = datetime.utcnow() + timedelta(days=payload.days, hours=payload.hours)
    row.followup_snoozed_until = until
    db.commit()

    return {"status": "snoozed", "until": until}


@router.post("/{message_id}/move")
async def move_email(
    message_id: str,
    payload: MoveRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Move an email to a different category.
    """
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Email not found")

    row.previous_category = row.category
    row.category = payload.category
    db.commit()

    return {"status": "moved", "category": payload.category}


@router.post("/archived/{message_id}")
async def archive_email(
    message_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Archive an email message (move to 'archived' category).
    """
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Email not found")

    row.previous_category = row.category
    row.category = "archived"
    db.commit()

    return {"status": "archived"}


@router.post("/threads/{thread_id}/restore")
async def restore_thread_action(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Restore a thread from Cleaned/Noise to Inbox.
    """
    from app.agents.aaliyah.core.action_executor import ActionExecutor
    executor = ActionExecutor(db)
    result = await executor.restore_thread(
        user_id=context.user_id,
        workspace_id=context.workspace_id,
        thread_id=thread_id
    )
    return result


@router.post("/sync")
async def sync_inbox_all(
    force: bool = Query(False, description="Force sync even if health check fails (admin only)"),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Trigger a global sync for all enabled connectors.
    Enforces 'Sync Gatekeeper' rules: Inbox sync runs ONLY IF email status is OK.
    """
    from app.services.integrations.health_service import ConnectorHealthService
    
    # 1. Gatekeeper Check
    health_service = ConnectorHealthService(db, context.workspace_id)
    health = health_service.get_detailed_health()
    
    email_status = health.get("email", {}).get("status")
    
    if email_status != "OK" and not force:
        error_code = health.get("email", {}).get("error_code", "UNKNOWN_ERROR")
        logger.warning(f"Sync Gatekeeper Blocked: Email status is {email_status} ({error_code})")
        
        # Don't fail 500, return a status indicating skip
        return {
            "status": "skipped",
            "reason": f"Gatekeeper blocked: {error_code}",
            "health": health.get("email")
        }

    # 2. Proceed with Sync
    # This would typically enqueue background jobs for each provider
    logger.info(f"Manual sync triggered for workspace {context.workspace_id}")
    
    # In a real system, we'd enqueue here. For now, we just acknowledge.
    return {
        "status": "queued", 
        "workspace_id": context.workspace_id,
        "mode": "forced" if force else "normal"
    }


@router.get("/{message_id}/attachment/{attachment_id}")
async def get_attachment_proxy(
    message_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Proxy an attachment download from the provider.
    """
    # 1. Verification
    row = db.query(TriagedEmail).filter(
        TriagedEmail.id == message_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Context not found")

    # 2. Get Connector
    connector = await EmailConnectorFactory(db, context.workspace_id).get_connector(
        context.user_id, row.provider
    )

    # 3. Fetch
    try:
        raw_bytes, filename, mime_type = await connector.get_attachment(
            message_id=row.external_message_id,
            attachment_id=attachment_id
        )
    except Exception as e:
        logger.error(f"Attachment fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch attachment from provider")

    # 4. Stream Response
    file_io = io.BytesIO(raw_bytes)
    return StreamingResponse(
        file_io,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff", # Enterprise security header
        }
    )


@router.post("/threads/{thread_id}/snooze")
async def snooze_thread(
    thread_id: str,
    payload: SnoozeRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Snooze a thread's follow-up due date efficiently.
    """
    thread = db.query(TriagedThread).filter(
        TriagedThread.id == thread_id,
        TriagedThread.workspace_id == context.workspace_id
    ).first()

    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    until = datetime.utcnow() + timedelta(days=payload.days, hours=payload.hours)
    # Thread doesn't have a dedicated snooze column in schema yet, 
    # but we agreed to use followup_due_at as the effective trigger.
    # If we set followup_due_at to the future, it is effectively snoozed from the "Due" view.
    thread.followup_due_at = until
    
    # Also snooze the latest message to keep data consistent if used there
    latest_msg = db.query(TriagedEmail).filter(
        TriagedEmail.thread_id == thread.external_thread_id,
        TriagedEmail.workspace_id == context.workspace_id
    ).order_by(TriagedEmail.received_at.desc()).first()
    
    if latest_msg:
        latest_msg.followup_snoozed_until = until
        
    db.commit()
    return {"status": "snoozed", "until": until}


@router.post("/threads/{thread_id}/stop-tracking")
async def stop_tracking_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Stop tracking follow-ups for a thread.
    """
    thread = db.query(TriagedThread).filter(
        TriagedThread.id == thread_id,
        TriagedThread.workspace_id == context.workspace_id
    ).first()

    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread.awaiting_reply = False
    thread.followup_due_at = None
    
    # Also update category if it was in followups
    if thread.category == "followups":
        thread.category = "inbox" # Return to inbox or done? Usually if we stop tracking it might be 'inbox' or we just leave it. 
        # User said "Stop tracking removes it", likely from the followups queue.
    
    db.commit()
    return {"status": "tracking_stopped"}
