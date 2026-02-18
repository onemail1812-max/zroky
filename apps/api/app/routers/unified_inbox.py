from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.schemas.inbox import (
    InboxThreadsListResponse,
    InboxThreadResponse,
    InboxCountsResponse,
    ProviderTotalsResponse,
)
# Reuse logic from the inbox router or orchestrator
from app.api.routes.inbox import (
    list_threads, 
    get_thread_details, 
    get_inbox_counts as get_counts, 
    get_provider_totals, 
    restore_thread_action
)

router = APIRouter(tags=["unified_inbox"])

@router.get("/threads", response_model=InboxThreadsListResponse)
async def top_level_list_threads(
    queue: Optional[str] = Query(None),
    provider: str = Query("all"),
    limit: int = Query(50),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    return await list_threads(queue, provider, limit, offset, db, context)

@router.get("/threads/{thread_id}", response_model=List[InboxThreadResponse])
async def top_level_get_thread_details(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    return await get_thread_details(thread_id, db, context)

@router.get("/counts", response_model=InboxCountsResponse)
async def top_level_get_counts(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    return await get_counts(db, context)

@router.get("/provider_totals", response_model=ProviderTotalsResponse)
async def top_level_get_provider_totals(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    return await get_provider_totals(db, context)

@router.post("/threads/{thread_id}/restore")
async def top_level_restore_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    return await restore_thread_action(thread_id, db, context)
