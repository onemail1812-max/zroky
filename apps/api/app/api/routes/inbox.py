"""Inbox API — serves AI-triaged emails from the database.

Primary source: triaged_emails table (populated by background sync).
Fallback: live fetch from Gmail/Outlook if no triaged data exists.
"""
from __future__ import annotations
import base64
import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.integration import Integration, IntegrationProvider
from app.models.triaged_email import TriagedEmail
from app.schemas.inbox_actions import MarkReadRequest
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

logger = logging.getLogger(__name__)

from app.services.integrations.token_store import get_valid_token

from app.core.limiter import limiter
router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])


@router.get("/threads")
@limiter.limit("60/minute")
async def list_threads(
    request: Request,
    queue: Optional[str] = Query(None, description="Filter by category"),
    provider: str = Query("all", description="all | google | microsoft"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Inbox endpoint — serves pre-triaged emails from the database.
    Background sync + AI triage populates the data automatically.
    Falls back to live fetch if no triaged data exists yet.
    """
    # Build query from triaged_emails table
    query = db.query(TriagedEmail).filter(
        TriagedEmail.workspace_id == context.workspace_id
    )

    # Filter by provider if specified
    if provider != "all":
        query = query.filter(TriagedEmail.provider == provider)

    # Filter by category if specified
    if queue:
        if queue.lower() == "cleaned":
            # "Cleaned" is a special virtual queue for noise/archived items
            query = query.filter(TriagedEmail.is_noise == True)
        else:
            parsed_queue = queue.replace("_", " ").lower()
            query = query.filter(func.lower(TriagedEmail.category) == parsed_queue)
            # When filtering by a specific actionable category, we usually want non-noise
            # unless explicitly looking for noise in that category (rare).
            query = query.filter(TriagedEmail.is_noise == False)
    else:
        # DEFAULT: Hide noise from the master / all view
        query = query.filter(TriagedEmail.is_noise == False)

    # Get total count before pagination
    total_count = query.count()

    # If we have triaged emails, serve from DB
    if total_count > 0:
        rows = query.order_by(desc(TriagedEmail.received_at)).offset(offset).limit(limit).all()
        items = []
        for row in rows:
            meta = row.metadata_json or {}
            if isinstance(meta, str):
                try:
                    import json
                    meta = json.loads(meta)
                except:
                    meta = {}
            items.append({
                "id": row.external_message_id or row.id,
                "thread_id": row.thread_id,
                "provider": row.provider or "google",
                "sender": row.sender,
                "subject": row.subject,
                "snippet": row.snippet or "",
                "received_at": row.received_at.isoformat() if hasattr(row.received_at, 'isoformat') else str(row.received_at) if row.received_at else None,
                "category": row.category or "inbox",
                "priority": row.priority or "normal",
                "is_noise": row.is_noise or False,
                "is_read": row.is_read or False,
                "confidence": row.confidence,
                "reasoning": row.reasoning,
                "needs_clarity": row.needs_clarity or False,
                "can_draft": row.can_draft or False,
                "requires_approval": False,
                "deadline_at": None,
                "awaiting_reply": False,
                "draft_preview": meta.get("draft", {}).get("body") if meta.get("draft") else None,
                "draft": meta.get("draft"),
            })
        return {"items": items, "count": total_count}

    # No triaged emails yet — return empty list.
    # Zero-History Design: Only emails arriving AFTER onboarding
    # are synced, triaged, and stored in the database.
    # No historical/live fallback fetch is performed.
    return {"items": [], "count": 0}


@router.get("/{message_id}/body")
async def get_email_body(
    message_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    On-demand full body fetch for a single email.
    Called when user opens an email in the thread view.
    Fetches directly from Gmail/Outlook API with full format.
    """
    # Try Google first
    token = get_valid_token(db, context.workspace_id, "google")
    if token:
        try:
            from app.integrations.gmail_client import GmailClient
            client = GmailClient(token)
            msg = await client.get_message(message_id, format="full")
            body = _extract_body_from_gmail_message(msg)
            return {"body": body, "format": "plain", "provider": "google"}
        except Exception as e:
            logger.warning(f"Gmail body fetch failed for {message_id}: {e}")

    # Try Microsoft
    ms_token = get_valid_token(db, context.workspace_id, "microsoft")
    if ms_token:
        try:
            from app.integrations.outlook_client import OutlookClient
            client = OutlookClient(ms_token)
            body = await client.get_message_body(message_id)
            return {"body": body, "format": "plain", "provider": "microsoft"}
        except Exception as e:
            logger.warning(f"Outlook body fetch failed for {message_id}: {e}")

    raise HTTPException(status_code=404, detail="Could not fetch email body. Check email integration.")


@router.post("/{message_id}/archive")
@limiter.limit("30/minute")
async def archive_email(
    request: Request,
    message_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Archive a single email via the provider API and remove it from the local queue."""
    # Find the email in DB to get the provider
    email_record = db.query(TriagedEmail).filter(
        (TriagedEmail.id == message_id) | (TriagedEmail.external_message_id == message_id),
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    provider = email_record.provider if email_record else None
    
    if not provider:
        # If not in DB, try to guess or return error
        raise HTTPException(status_code=404, detail="Email record not found in local database")
        
    token = get_valid_token(db, context.workspace_id, provider)
    if not token:
        raise HTTPException(status_code=401, detail=f"No valid token for {provider}")

    try:
        if provider == "google":
            from app.integrations.gmail_client import GmailClient
            client = GmailClient(token)
            await client.archive_message(email_record.external_message_id or message_id)
        elif provider == "microsoft":
            from app.integrations.outlook_client import OutlookClient
            client = OutlookClient(token)
            await client.archive_message(email_record.external_message_id or message_id)
            
        # If successful, remove from our local DB queue
        db.delete(email_record)
        db.commit()

        # INSTANT COUNTS: Broadcast updated counts after archiving
        from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
        orchestrator = AaliyahOrchestrator(context.workspace_id)
        await orchestrator.broadcast_updates(db)

        return {"status": "success", "action": "archived"}
    except Exception as e:
        logger.error(f"Failed to archive email {message_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to archive email on the provider")


@router.post("/{message_id}/trash")
async def trash_email(
    message_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Move a single email to trash via the provider API and remove it from the local queue."""
    email_record = db.query(TriagedEmail).filter(
        (TriagedEmail.id == message_id) | (TriagedEmail.external_message_id == message_id),
        TriagedEmail.workspace_id == context.workspace_id
    ).first()

    provider = email_record.provider if email_record else None
    
    if not provider:
        raise HTTPException(status_code=404, detail="Email record not found in local database")
        
    token = get_valid_token(db, context.workspace_id, provider)
    if not token:
        raise HTTPException(status_code=401, detail=f"No valid token for {provider}")

    try:
        if provider == "google":
            from app.integrations.gmail_client import GmailClient
            client = GmailClient(token)
            await client.trash_message(email_record.external_message_id or message_id)
        elif provider == "microsoft":
            from app.integrations.outlook_client import OutlookClient
            client = OutlookClient(token)
            await client.trash_message(email_record.external_message_id or message_id)
            
        # If successful, remove from our local DB queue
        db.delete(email_record)
        db.commit()

        # INSTANT COUNTS: Broadcast updated counts after trashing
        from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
        orchestrator = AaliyahOrchestrator(context.workspace_id)
        await orchestrator.broadcast_updates(db)

        return {"status": "success", "action": "trashed"}
    except Exception as e:
        logger.error(f"Failed to trash email {message_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to trash email on the provider")


@router.post("/mark-read")
async def mark_emails_read(
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Mark multiple threads/emails as read/unread in local DB and broadcast update."""
    workspace_id = context.workspace_id
    
    # Update local DB
    db.query(TriagedEmail).filter(
        TriagedEmail.workspace_id == workspace_id,
        (TriagedEmail.thread_id.in_(payload.thread_ids)) | (TriagedEmail.external_message_id.in_(payload.thread_ids))
    ).update({"is_read": payload.is_read}, synchronize_session=False)
    
    db.commit()

    # Broadcast updated counts to UI
    orchestrator = AaliyahOrchestrator(workspace_id)
    await orchestrator.broadcast_updates(db)
    
    return {"status": "success", "count": len(payload.thread_ids)}


def _extract_body_from_gmail_message(msg: dict) -> str:
    """Extract and decode plain-text body from a Gmail message (format=full)."""
    import html as html_module
    payload = msg.get("payload", {})

    # 1. Prefer text/plain — no stripping needed
    text = _find_part(payload, "text/plain")

    # 2. Fallback to text/html — strip tags
    if not text:
        raw_html = _find_part(payload, "text/html")
        if raw_html:
            text = re.sub(r"<[^>]+>", "", raw_html)

    # 3. Last resort: snippet
    if not text:
        text = msg.get("snippet", "")

    if text:
        # Decode all HTML entities (&amp; &#39; &nbsp; etc.)
        text = html_module.unescape(text)
        # Remove raw angle-bracket URLs like <https://example.com>
        text = re.sub(r"<(https?://[^>]+)>", r"\1", text)
        # Remove other leftover angle-bracket artifacts
        text = re.sub(r"<[^>]{0,200}>", "", text)
        # Normalize excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text).strip()

    return text or ""



def _find_part(payload: dict, mime_type: str) -> str:
    """Recursively search message parts for a given MIME type and decode base64."""
    if payload.get("mimeType") == mime_type:
        data = (payload.get("body") or {}).get("data")
        if data:
            try:
                return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
            except Exception:
                return ""

    for part in payload.get("parts", []):
        result = _find_part(part, mime_type)
        if result:
            return result

    return ""


@router.get("/counts")
async def get_inbox_counts(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Returns real counts from the triaged_emails table.
    """
    workspace_id = context.workspace_id

    # Get category counts (only unread)
    category_counts = db.query(
        TriagedEmail.category, func.count(TriagedEmail.id)
    ).filter(
        TriagedEmail.workspace_id == workspace_id,
        TriagedEmail.is_read == False,
        TriagedEmail.is_noise == False
    ).group_by(TriagedEmail.category).all()

    counts = {cat: cnt for cat, cnt in category_counts}

    # "Cleaned" count: Aggregate all unread items marked as noise
    cleaned_count = db.query(func.count(TriagedEmail.id)).filter(
        TriagedEmail.workspace_id == workspace_id,
        TriagedEmail.is_read == False,
        TriagedEmail.is_noise == True
    ).scalar() or 0

    # Check if any email integration is connected
    integrations = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
    ).all()
    has_email = any(
        i.provider in (IntegrationProvider.GOOGLE_GMAIL, IntegrationProvider.OUTLOOK, "GOOGLE_GMAIL", "OUTLOOK") and i.token_encrypted
        for i in integrations
    )

    return {
        "priority": counts.get("priority", 0),
        "fyi": counts.get("fyi", 0),
        "needs_reply": counts.get("needs_reply", 0),
        "approvals": counts.get("approvals", 0),
        "follow_ups": counts.get("follow_ups", 0) or counts.get("follow_up", 0), # handle plural/singular
        "newsletter": counts.get("newsletter", 0),
        "noise": counts.get("noise", 0),
        "cleaned": cleaned_count,
        "drafts": 0,
        "total": sum(counts.values()),
        "connected": has_email,
    }


@router.post("/sync")
@limiter.limit("10/minute")
async def sync_inbox(
    request: Request,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Event-Driven Sync: Dispatches a background JobQueue task.
    Returns instantly so the UI never hangs or times out.
    """
    from app.core.queue import queue, JobType

    job_id = await queue.enqueue(
        JobType.SYNC_PROVIDER.value,
        payload={
             "workspace_id": context.workspace_id,
             "provider": "all"
        },
        dedupe_id=f"sync:{context.workspace_id}:all"
    )

    return {
        "status": "queued",
        "job_id": job_id or "duplicate_skipped",
        "message": "Sync queued. Listening for SSE events for real-time updates.",
    }
