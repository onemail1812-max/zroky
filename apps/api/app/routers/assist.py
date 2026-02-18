from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, case

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.user import User
from app.models.search_index import EmailIndex, CalendarIndex
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync
from app.services.brain.core import Brain
from app.services.email.parsing.reply_parser import parse_email_body

router = APIRouter()

class SearchRequest(BaseModel):
    user_query: str
    provider_filter: str = "all"
    time_filter: str = "all" # today, yesterday, last week
    workspace_id: Optional[str] = None

class AnswerRequest(BaseModel):
    message: str
    workspace_id: Optional[str] = None

@router.post("/search")
async def search(
    payload: SearchRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Search connected accounts using fast index.
    """
    workspace_id = payload.workspace_id or context.workspace_id
    query = payload.user_query.strip()
    
    if len(query) < 3:
        return {
            "top_threads": [],
            "top_events": [],
            "total_found": 0,
            "need_clarification": True
        }
        
    now = datetime.utcnow()
    min_date = None
    tf = payload.time_filter.lower()
    if tf == "today":
        min_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif tf == "yesterday":
        min_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif tf == "last week":
        min_date = now - timedelta(days=7)
    elif tf == "last month":
        min_date = now - timedelta(days=30)

    # Email
    results_email = []
    pf = payload.provider_filter.lower()
    
    if pf in ["all", "gmail", "outlook", "email"]:
        q = db.query(EmailIndex).filter(EmailIndex.workspace_id == workspace_id)
        q = q.filter(EmailIndex.searchable_text.ilike(f"%{query}%"))
        
        if pf in ["gmail", "outlook"]:
             q = q.filter(EmailIndex.provider == pf)
        
        if min_date:
             q = q.filter(EmailIndex.last_message_at >= min_date)
             
        # Ranking
        q = q.order_by(
            desc(case((EmailIndex.subject.ilike(f"%{query}%"), 1), else_=0)), # Subject match boost
            desc(EmailIndex.last_message_at)
        )
        results_email = q.limit(25).all()

    # Calendar
    results_cal = []
    if pf in ["all", "calendar"]:
        q = db.query(CalendarIndex).filter(CalendarIndex.workspace_id == workspace_id)
        q = q.filter(CalendarIndex.searchable_text.ilike(f"%{query}%"))
        
        if min_date:
             q = q.filter(CalendarIndex.start_at >= min_date)
             
        q = q.order_by(
            desc(case((CalendarIndex.title.ilike(f"%{query}%"), 1), else_=0)), # Title boost
            CalendarIndex.start_at.asc()
        )
        results_cal = q.limit(25).all()

    total = len(results_email) + len(results_cal)
    
    return {
        "top_threads": [
            {
                "thread_id": e.thread_id,
                "subject": e.subject,
                "snippet": e.snippet,
                "last_message_at": e.last_message_at,
                "provider": e.provider,
                "sender": e.sender
            } for e in results_email
        ],
        "top_events": [
            {
                "event_id": e.event_id,
                "title": e.title,
                "start_at": e.start_at,
                "provider": e.provider,
                "location": e.location
            } for e in results_cal
        ],
        "total_found": total,
        "need_clarification": total >= 40
    }

@router.get("/thread/{thread_id}")
async def get_thread(
    thread_id: str,
    provider: str = "google",
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Get full thread details from provider.
    """
    workspace_id = context.workspace_id
    ingestor = EmailIngestor(workspace_id, db)
    
    thread = await ingestor.fetch_thread(thread_id, provider)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    messages = thread.get("messages", [])
    # participants = unique senders
    senders = list(set([m.get("sender") for m in messages if m.get("sender")]))
    
    # Extract latest reply text
    latest_reply = ""
    if messages:
        # Sort messages by date to be sure (they should be asc from provider)
        last_msg = messages[-1]
        raw_body = last_msg.get("body") or last_msg.get("snippet") or ""
        latest_reply = parse_email_body(raw_body)

    return {
        "provider": provider,
        "subject": (messages[0].get("subject") if messages else "No Subject"),
        "participants": senders,
        "messages": messages,
        "latest_reply_text": latest_reply,
        "metadata": {
            "last_message_at": (messages[-1].get("received_at") if messages else None)
        }
    }

@router.get("/event/{event_id}")
async def get_event(
    event_id: str,
    provider: str = "google",
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Get full event details from provider.
    """
    workspace_id = context.workspace_id
    sync = CalendarSync(workspace_id, db)
    
    event = await sync.fetch_event(event_id, provider)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    return {
        "title": event.get("title"),
        "attendees": event.get("attendees"),
        "start_at": event.get("start_at"),
        "end_at": event.get("end_at"),
        "location": event.get("location"),
        "description": event.get("description"),
        "provider": provider
    }

@router.post("/answer")
async def answer(
    payload: AnswerRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Main chat entry point.
    Connected to AaliyahOrchestrator to provide real responses using available agents.
    """
    workspace_id = payload.workspace_id or context.workspace_id

    # Initialize Brain
    brain = Brain() # Assuming default init works or uses env vars
    
    # Initialize Orchestrator
    # Note: orchestrator expects workspace_id.
    # If payload.workspace_id is None, we might fail.
    # Frontend sends workspaceId.
    
    orchestrator = AaliyahOrchestrator(workspace_id, brain)
    
    # Execute
    try:
        response = await orchestrator.handle_chat(
            db=db,
            user_id=context.user_id,
            message=payload.message
        )
        return response
    except Exception as e:
        import logging
        import traceback
        traceback.print_exc()
        logging.getLogger(__name__).error(f"Answer failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="I'm having trouble connecting to my brain right now."
        )
