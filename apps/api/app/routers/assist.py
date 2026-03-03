from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta, timezone
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
from app.services.email.parsing.reply_parser import parse_email_body

class SearchRequest(BaseModel):
    user_query: str
    provider_filter: str = "all"
    time_filter: str = "all" # today, yesterday, last week
    workspace_id: Optional[str] = None

class AnswerRequest(BaseModel):
    message: str
    workspace_id: Optional[str] = None
    email_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class AttachmentRequest(BaseModel):
    name: str
    type: str # mime type
    data: str # base64

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    workspace_id: Optional[str] = None
    thread_id: Optional[str] = None
    email_id: Optional[str] = None
    attachments: Optional[List[AttachmentRequest]] = []

class ComposeRequest(BaseModel):
    to: List[str]
    cc: Optional[List[str]] = []
    bcc: Optional[List[str]] = []
    subject: str
    body: str
    workspace_id: Optional[str] = None
    attachments: Optional[List[AttachmentRequest]] = []

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
        
    now = datetime.now(timezone.utc)
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
        "event": event,
        "description": event.get("description"),
        "provider": provider
    }

@router.get("/messages")
async def get_messages(
    thread_id: Optional[str] = None,
    email_id: Optional[str] = None,
    limit: int = 50,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Get chat history for a specific thread or global chat.
    """
    from app.models.chat_message import ChatRepository
    repo = ChatRepository(db, context.workspace_id)
    messages = repo.list_messages(thread_id=thread_id, email_id=email_id, limit=limit)
    
    # Format for frontend
    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "type": msg.msg_type,
            "payload": msg.payload,
            "created_at": msg.created_at.isoformat()
        }
        for msg in messages
    ]

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
    
    # Generate Response (Note: this is simplified, Orchestrator stream handling is better)
    # We need a proper orchestrator stream method, or we use the async generator if implemented
    # For now, we will call brain stream manually here as a shim until Orchestrator supports it
    
    # 1. Update memory
    from app.models.triaged_email import TriagedEmail
    context_str = ""
    if payload.email_id:
         email = db.query(TriagedEmail).filter(TriagedEmail.id == payload.email_id).first()
         if email:
             context_str = f"Context (Specific Email):\nSubject: {email.subject}\nSender: {email.sender}\nBody: {email.snippet}\n\n"
    
    orchestrator = AaliyahOrchestrator(workspace_id, brain)
    memory = orchestrator._intent_from_message(payload.message) # Just to initialize something
    
    prompt = f"{context_str}User: {payload.message}"
    
    # Execute
    try:
        response = await orchestrator.handle_chat(
            db=db,
            user_id=context.user_id,
            message=payload.message,
            email_id=payload.email_id
        )
        return response
    except Exception as e:
        logger.error(f"Answer failed: {e}", exc_info=True)
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
    request: Request,
    payload: ChatRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Enterprise Chat Endpoint: SSE Streaming + Orchestration + Persistence.
    """
    workspace_id = payload.workspace_id or context.workspace_id
    user_id = context.user_id
    thread_id = payload.thread_id

    # Get last user message
    user_messages = [m for m in payload.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message found")
    
    last_message = user_messages[-1].content

    # Initialize Orchestrator
    orchestrator = AaliyahOrchestrator(workspace_id=workspace_id)
    
    # PERSISTENCE: Save User Message
    from app.models.chat_message import ChatRepository
    import uuid
    import json
    
    repo = ChatRepository(db, workspace_id)
    
    # 1. Save user message first if there's a new one
    # Note: frontend sends full history, we only want to process the LAST message if it's from user
    if payload.messages and payload.messages[-1].role == "user":
        user_msg = payload.messages[-1]
        repo.add_message(
            id=f"user_{uuid.uuid4().hex[:12]}",
            role="user",
            content=user_msg.content,
            thread_id=payload.thread_id,
            email_id=payload.email_id
        )

    async def stream_generator():
        current_db = db  # Reuse the injected session
        try:
            full_content = ""
            async for chunk in orchestrator.handle_chat_stream(
                db=current_db,
                user_id=user_id,
                message=last_message,
                thread_id=thread_id,
                attachments=payload.attachments
            ):
                if chunk.get("type") in ("delta", "chunk"):
                    full_content += chunk.get("content", "")
                
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # PERSISTENCE: Save Assistant Message
            if full_content:
                repo = ChatRepository(current_db, workspace_id)
                repo.add_message(
                    id=f"asst_{uuid.uuid4().hex[:12]}",
                    role="assistant",
                    content=full_content,
                    thread_id=payload.thread_id,
                    email_id=payload.email_id,
                    msg_type="text"
                )
            
            yield f"data: [DONE]\n\n"

        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Chat stream failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        finally:
            pass  # Session managed by FastAPI Depends(get_db)

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
    
    if action_label in ["Draft Reply", "Draft Nudge"]:
        # Trigger a drafting job via queue
        from app.core.queue import queue, JobType
        import asyncio
        asyncio.create_task(
            queue.enqueue(
                job_type=JobType.PROCESS_DRAFT.value,
                payload={"workspace_id": workspace_id, "triaged_id": item_id},
                dedupe_id=f"draft:{item_id}"
            )
        )
        msg = "I've started drafting a reply for you." if action_label == "Draft Reply" else "I'll prepare a follow-up nudge for you right away."
        return {"message": msg}

    return {"message": f"Action '{action_label}' received and processed."}


@router.post("/historical-sync")
async def start_historical_sync(
    days: int = 180,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Trigger a historical backfill for the last N days.
    """
    orchestrator = AaliyahOrchestrator(workspace_id=context.workspace_id)
    import asyncio
    # We run this as a background task
    asyncio.create_task(orchestrator.historical_sync(db, days))
    return {"message": f"Historical sync for {days} days started in background."}

@router.get("/history")
async def get_chat_history(
    thread_id: Optional[str] = None,
    email_id: Optional[str] = None,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Fetch server-side chat history for a thread or global context.
    """
    try:
        from app.models.chat_message import ChatRepository
        repo = ChatRepository(db, context.workspace_id)
        messages = repo.list_messages(thread_id=thread_id, email_id=email_id)
        
        return [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "type": m.msg_type,
                "payload": m.payload,
                "created_at": m.created_at
            } for m in messages
        ]
    except Exception as e:
        import traceback
        logger.error(f"Assist History Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compose")
@limiter.limit("5/minute")
async def compose_email(
    request: Request,
    payload: ComposeRequest,
    context: CurrentContext = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """
    Send an email from scratch (Feature 6).
    """
    workspace_id = payload.workspace_id or context.workspace_id
    
    from app.services.integrations.token_store import get_valid_token
    from app.services.integrations.google_gmail import GmailService
    
    # Try google first
    token_google = get_valid_token(db, workspace_id, "google")
    token_outlook = get_valid_token(db, workspace_id, "outlook")
    
    if token_google:
        service = GmailService(token_google)
    elif token_outlook:
        from app.services.integrations.microsoft_outlook import OutlookService
        service = OutlookService(token_outlook)
    else:
        raise HTTPException(status_code=400, detail="No active Google or Outlook email integration found.")
    
    try:
        to_str = ", ".join(payload.to)
        cc_str = ", ".join(payload.cc) if payload.cc else None
        bcc_str = ", ".join(payload.bcc) if payload.bcc else None
        
        # Append signature if exists
        from app.models.workspace import Workspace
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace:
             settings = getattr(workspace, "settings_json", {}) or {}
             signature = settings.get("aaliyah", {}).get("signature", "")
             if not signature:
                  style = getattr(workspace, "style_profile_json", {}) or {}
                  signature = style.get("signature", "--\nSent via Aaliyah")
             if signature and signature not in payload.body:
                  payload.body = f"{payload.body}\n\n{signature}"

        await service.send_message(
            to=to_str,
            subject=payload.subject,
            text=payload.body,
            cc=cc_str,
            bcc=bcc_str,
            attachments=[a.model_dump() for a in (payload.attachments or [])]
        )
        return {"status": "success", "message": "Email sent."}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Compose failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
