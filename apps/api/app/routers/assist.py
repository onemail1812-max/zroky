from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, case
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.user import User
from app.models.search_index import EmailIndex, CalendarIndex
from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor
from app.agents.aaliyah.core.ingestion.calendar_sync import CalendarSync
from app.services.brain.core import Brain
from app.core.limiter import limiter

class SearchRequest(BaseModel):
    user_query: str
    provider_filter: str = "all"
    time_filter: str = "all" # today, yesterday, last week
    workspace_id: Optional[str] = None

class AnswerRequest(BaseModel):
    message: str
    workspace_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    workspace_id: Optional[str] = None

class ExecuteActionRequest(BaseModel):
    item_id: str
    action: Dict[str, Any]
    workspace_id: Optional[str] = None

router = APIRouter()

@router.post("/search")
@limiter.limit("30/minute")
async def search(
    request: Request,
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
@limiter.limit("10/minute")
async def answer(
    request: Request,
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

@router.post("/answer/stream")
@limiter.limit("10/minute")
async def answer_stream(
    request: Request,
    payload: AnswerRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Main chat entry point with Native SSE Streaming.
    """
    workspace_id = payload.workspace_id or context.workspace_id

    # Initialize Brain
    from app.services.brain.core import Brain
    brain = Brain()
    
    # Initialize Orchestrator
    orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
    
    async def event_generator():
        try:
            # We call a streaming generator on the orchestrator
            async for chunk in orchestrator.handle_chat_stream(
                db=db,
                user_id=context.user_id,
                message=payload.message
            ):
                # Yield SSE chunk
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Answer stream failed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            # Send done event
            yield f"data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.post("/chat")
@limiter.limit("20/minute")
async def chat(
    payload: ChatRequest,
    request: Request,
):
    """
    Clean SSE streaming chat endpoint.
    Auth is optional — falls back to demo context if no token.
    """
    from openai import AsyncOpenAI
    from app.config import settings
    import traceback
    import logging

    logger = logging.getLogger(__name__)

    # Get last user message
    user_messages = [m for m in payload.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message found")
    
    last_message = user_messages[-1].content

    # API key resolution (same fallback chain as Brain.__init__)
    api_key = settings.brain_api_key or settings.openrouter_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="No API key configured. Set BRAIN_API_KEY or OPENROUTER_API_KEY."
        )

    async def stream_generator():
        try:
            # Groq = fastest free inference (~0.5s response time)
            groq_key = settings.GROQ_API_KEY
            
            client = AsyncOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key or api_key,
            )

            system_prompt = (
                "You are Aaliyah, an elite AI Executive Assistant. "
                "Respond directly, sharply, and professionally. "
                "Use markdown formatting when helpful.\n\n"
                "RULES: "
                "Never say 'Great question', 'Certainly', 'Of course', 'I hope this helps'. "
                "No em dashes. No filler phrases. Be direct. Vary sentence length. "
                "Use active voice. Have personality. No emoji."
            )

            # Build messages array (include conversation history for context)
            llm_messages = [{"role": "system", "content": system_prompt}]
            for m in payload.messages[-10:]:  # Last 10 messages for context
                llm_messages.append({"role": m.role, "content": m.content})

            # Try Groq first (instant), then fall back to OpenRouter
            providers = [
                {"base_url": "https://api.groq.com/openai/v1", "key": groq_key, "model": "llama-3.3-70b-versatile"},
                {"base_url": settings.openrouter_base_url, "key": api_key, "model": "openrouter/free"},
            ]

            stream = None
            last_err = None
            for provider in providers:
                try:
                    c = AsyncOpenAI(base_url=provider["base_url"], api_key=provider["key"])
                    stream = await c.chat.completions.create(
                        model=provider["model"],
                        messages=llm_messages,
                        stream=True,
                        temperature=0.3,
                    )
                    break
                except Exception as e:
                    last_err = e
                    logger.warning(f"Provider {provider['base_url']} failed: {e}")
                    continue

            if stream is None:
                yield f"data: {json.dumps({'type': 'error', 'content': f'All providers failed: {last_err}'})}\n\n"
                return

            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield f"data: {json.dumps({'type': 'delta', 'content': delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            traceback.print_exc()
            logger.error(f"Chat stream failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
@router.post("/actions/execute")
@limiter.limit("60/minute")
async def execute_action(
    request: Request,
    payload: ExecuteActionRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Execute a callback action from a card.
    """
    workspace_id = payload.workspace_id or context.workspace_id
    item_id = payload.item_id
    action_data = payload.action
    
    action_type = action_data.get("type")
    action_label = action_data.get("label")
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Executing card action: {action_label} ({action_type}) for item {item_id}")
    
    # Placeholder for actual fulfillment logic
    # In a real scenario, this would call ActionExecutor or update the DB
    if action_label == "Archive":
        # Mock archive logic
        return {"message": f"Message {item_id} has been archived."}
    
    if action_label == "Draft Reply":
        # This could trigger a drafting job
        return {"message": f"I've started drafting a reply for you. It'll appear in your feed shortly."}

    return {"message": f"Action '{action_label}' received and processed."}
