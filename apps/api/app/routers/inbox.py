from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.triaged_email import TriagedEmail
from app.schemas.inbox import (
    InboxThreadsListResponse,
    InboxThreadResponse,
    InboxCountsResponse,
    ProviderTotalsResponse,
)

router = APIRouter(tags=["inbox"])

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
    query = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == context.workspace_id)

    if queue:
        if queue == "priority":
            query = query.filter(TriagedEmail.priority == "High")
        elif queue == "triaged":
            # Just return everything that is triaged
            pass
        else:
            query = query.filter(TriagedEmail.category == queue)

    if provider != "all":
        p = "google" if provider in ["google", "gmail"] else "microsoft"
        query = query.filter(TriagedEmail.provider == p)

    total = query.count()
    items = (
        query.order_by(TriagedEmail.received_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": [
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
                awaiting_reply=item.awaiting_reply,
            )
            for item in items
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
    Get all messages in a specific thread.
    """
    items = (
        db.query(TriagedEmail)
        .filter(
            TriagedEmail.workspace_id == context.workspace_id,
            TriagedEmail.thread_id == thread_id,
        )
        .order_by(TriagedEmail.received_at.asc())
        .all()
    )
    
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
            awaiting_reply=item.awaiting_reply,
        )
        for item in items
    ]


@router.get("/counts", response_model=InboxCountsResponse)
async def get_counts(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get message counts by category and priority.
    """
    base_query = db.query(TriagedEmail).filter(TriagedEmail.workspace_id == context.workspace_id)
    
    cat_counts = (
        db.query(TriagedEmail.category, func.count(TriagedEmail.id))
        .filter(TriagedEmail.workspace_id == context.workspace_id)
        .group_by(TriagedEmail.category)
        .all()
    )
    
    pri_counts = (
        db.query(TriagedEmail.priority, func.count(TriagedEmail.id))
        .filter(TriagedEmail.workspace_id == context.workspace_id)
        .group_by(TriagedEmail.priority)
        .all()
    )
    
    unread_count = base_query.filter(TriagedEmail.is_read == False).count()
    
    return {
        "by_category": {cat: count for cat, count in cat_counts},
        "by_priority": {pri: count for pri, count in pri_counts},
        "total_unread": unread_count,
    }


@router.get("/provider_totals", response_model=ProviderTotalsResponse)
async def get_provider_totals(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Get total message counts per provider.
    """
    totals = (
        db.query(TriagedEmail.provider, func.count(TriagedEmail.id))
        .filter(TriagedEmail.workspace_id == context.workspace_id)
        .group_by(TriagedEmail.provider)
        .all()
    )
    
    res = {"google": 0, "microsoft": 0, "total": 0}
    for provider, count in totals:
        if provider == "google":
            res["google"] = count
        elif provider == "microsoft":
            res["microsoft"] = count
        res["total"] += count
        
    return res
