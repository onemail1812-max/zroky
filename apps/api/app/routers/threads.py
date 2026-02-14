"""Threads router."""
from fastapi import APIRouter, Depends, HTTPException

# IMPORTANT:
# - Shlok chat brain is applied ONLY for employee_id == "shlok".
# - Other employees do not generate AI messages yet.
# - POST returns the USER message for backward compatibility.

from sqlalchemy.orm import Session
import uuid
import json
from typing import Any, Dict, List
import logging

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.thread import Thread
from app.models.message import Message, AuthorType
from app.models.artifact import Artifact, ArtifactType, ArtifactStatus
from app.schemas.threads import ThreadResponse
from app.schemas.messages import MessageResponse, MessageCreate
from app.services.shlok.orchestrator import ShlokOrchestrator
from app.services.shlok.memory import load_thread_context



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["threads"])


def _scoped_employee_id(employee_id: str, user_id: str) -> str:
    """Namespace employee_id by user to avoid cross-user thread collisions."""
    if ":" in employee_id:
        return employee_id
    return f"{employee_id}:{user_id}"


def _base_employee_id(employee_id: str) -> str:
    return employee_id.split(":", 1)[0]


@router.get("/employee/{employee_id}", response_model=list[ThreadResponse])
async def get_employee_threads(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get thread for employee."""
    scoped_employee_id = _scoped_employee_id(employee_id, context.user_id)
    thread = (
        db.query(Thread)
        .filter(Thread.workspace_id == context.workspace_id, Thread.employee_id == scoped_employee_id)
        .first()
    )
    if not thread:
        # Create thread if not exists
        thread = Thread(
            id=str(uuid.uuid4()),
            workspace_id=context.workspace_id,
            employee_id=scoped_employee_id,
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
    return [thread]


@router.get("/{thread_id}/messages", response_model=list[MessageResponse])
async def get_thread_messages(
    thread_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get messages in thread."""
    messages = (
        db.query(Message)
        .filter(Message.thread_id == thread_id, Message.workspace_id == context.workspace_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return messages


@router.post("/{thread_id}/messages", response_model=MessageResponse)
async def create_message(
    thread_id: str,
    message_create: MessageCreate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Create message and generate AI response.

    Behavior:
    - Always creates a USER message.
    - For Shlok only: generates and persists an AI message using ShlokOrchestrator.
    - For other employees: no AI message yet.
    - Returns the USER message (backward-compatible).
    """
    # Get thread to find employee
    thread = (
        db.query(Thread)
        .filter(Thread.id == thread_id, Thread.workspace_id == context.workspace_id)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Create user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        thread_id=thread_id,
        employee_id=thread.employee_id,
        author_type=AuthorType.USER,
        author_user_id=context.user_id,
        content_text=message_create.content_text,
        content_json=json.dumps(message_create.content_json)
        if message_create.content_json is not None
        else None,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Generate AI response for Shlok or Aaliyah
    base_employee_id = _base_employee_id(thread.employee_id)

    if base_employee_id == "shlok":
        try:
            thread_messages = load_thread_context(
                db=db,
                workspace_id=context.workspace_id,
                thread_id=thread_id,
            )

            orchestrator = ShlokOrchestrator(db)
            raw = orchestrator.generate_reply(
                workspace_id=context.workspace_id,
                thread_messages=thread_messages,
            )

            payload = _safe_parse_json(raw)
            ai_text = _render_shlok_message(payload, raw)

            ai_msg = Message(
                id=str(uuid.uuid4()),
                workspace_id=context.workspace_id,
                thread_id=thread_id,
                employee_id=thread.employee_id,
                author_type=AuthorType.AI,
                content_text=ai_text,
                content_json=json.dumps(payload) if payload else None,
            )
            db.add(ai_msg)
            db.commit()

            try:
                _persist_shlok_artifacts(
                    db=db,
                    workspace_id=context.workspace_id,
                    thread_id=thread_id,
                    employee_id=thread.employee_id,
                    payload=payload,
                )
            except Exception:
                pass
        except Exception:
            ai_msg = Message(
                id=str(uuid.uuid4()),
                workspace_id=context.workspace_id,
                thread_id=thread_id,
                employee_id=thread.employee_id,
                author_type=AuthorType.AI,
                content_text="I encountered an error. Please try again.",
            )
            db.add(ai_msg)
            db.commit()

    elif base_employee_id == "aaliyah":
        try:
            thread_messages = load_thread_context(
                db=db,
                workspace_id=context.workspace_id,
                thread_id=thread_id,
            )

            from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator

            orchestrator = AaliyahOrchestrator(workspace_id=context.workspace_id)
            
            # Extract last user message for single-turn handling
            last_user_msg = ""
            for msg in reversed(thread_messages):
                if msg.author_type == AuthorType.USER:
                    last_user_msg = msg.content_text or ""
                    break
            
            result = await orchestrator.handle_chat(
                db=db,
                user_id=context.user_id,
                message=last_user_msg,
            )

            # Adapt internal orchestrator response to thread payload format
            details = result.get("details", {})
            params = details.get("params", {})
            gate = details.get("gate", {})
            
            payload = {
                "message": result.get("reply"),
                "actions": []
            }
            
            if gate.get("explain"):
                payload["actions"].append({
                    "description": gate.get("explain"),
                    "requires_approval": gate.get("require_approval", False)
                })

            if details.get("action") == "draft":
                draft_data = {
                    "to": params.get("recipient"),
                    "subject": params.get("subject"),
                    "body": params.get("body"),
                    "reasoning": str(params.get("critic", {}).get("notes") or "")
                }
                payload["drafts"] = [draft_data]

            raw = json.dumps(payload)
            ai_text = _render_aaliyah_message(payload, raw)

            ai_msg = Message(
                id=str(uuid.uuid4()),
                workspace_id=context.workspace_id,
                thread_id=thread_id,
                employee_id=thread.employee_id,
                author_type=AuthorType.AI,
                content_text=ai_text,
                content_json=json.dumps(payload) if payload else None,
            )
            db.add(ai_msg)
            db.commit()

            # Persist Aaliyah artifacts -> TODO: Restore when Task/Draft persistence is unified
            # if payload and payload.get("drafts"):
            #     # email_service.create_draft(...) # EmailService missing
            #     pass

        except Exception as e:
            logger.error(f"Error in Aaliyah chat generation: {e}")
            ai_msg = Message(
                id=str(uuid.uuid4()),
                workspace_id=context.workspace_id,
                thread_id=thread_id,
                employee_id=thread.employee_id,
                author_type=AuthorType.AI,
                content_text=f"I encountered an error: {str(e)}. Please try again.",
            )
            db.add(ai_msg)
            db.commit()

    else:
        # Other employees not yet implemented
        pass # No AI message for other employees for now

    return user_msg


def _safe_parse_json(text: str) -> Dict[str, Any]:
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return {}
    try:
        return json.loads(text[start : end + 1])
    except Exception:
        return {}


def _render_shlok_message(payload: Dict[str, Any], fallback: str) -> str:
    if not payload:
        return fallback.strip() if fallback else "Draft ready."

    lines: List[str] = []
    rationale = payload.get("rationale")
    if rationale:
        lines.append(f"Rationale: {rationale}")

    drafts = payload.get("drafts") or []
    if drafts:
        lines.append("")
        lines.append("Drafts:")
        for draft in drafts:
            platform = draft.get("platform", "General")
            content = draft.get("content", "").strip()
            if content:
                lines.append(f"- {platform}: {content}")

    next_actions = payload.get("next_actions") or []
    if next_actions:
        lines.append("")
        lines.append("Next steps:")
        for item in next_actions:
            lines.append(f"- {item}")

    return "\n".join(lines).strip() or "Draft ready."


def _persist_shlok_artifacts(
    db: Session,
    workspace_id: str,
    thread_id: str,
    employee_id: str,
    payload: Dict[str, Any],
) -> None:
    if not payload:
        return

    artifacts = payload.get("artifacts") or []
    if not artifacts and payload.get("drafts"):
        artifacts = [
            {
                "type": ArtifactType.SOCIAL_POST.value,
                "title": draft.get("title")
                or f"{draft.get('platform', 'Social')} draft",
                "content": draft,
            }
            for draft in payload.get("drafts", [])
        ]

    for artifact in artifacts:
        artifact_type = artifact.get("type") or ArtifactType.SOCIAL_POST.value
        if artifact_type not in {t.value for t in ArtifactType}:
            artifact_type = ArtifactType.SOCIAL_POST.value

        record = Artifact(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            employee_id=employee_id,
            thread_id=thread_id,
            type=artifact_type,
            status=ArtifactStatus.DRAFT,
            title=artifact.get("title"),
            content_json=json.dumps(artifact.get("content") or {}),
        )
        db.add(record)

    db.commit()


def _render_aaliyah_message(payload: Dict[str, Any], raw: str) -> str:
    """Render Aaliyah's message from JSON payload."""
    if not payload:
        return raw

    parts = []

    # Main message
    message = payload.get("message", "")
    if message:
        parts.append(message)

    # Drafts
    drafts = payload.get("drafts", [])
    if drafts:
        parts.append("\n\n📧 **Email Drafts:**")
        for i, draft in enumerate(drafts, 1):
            parts.append(f"\n{i}. **To:** {draft.get('to')}")
            parts.append(f"   **Subject:** {draft.get('subject')}")
            if draft.get('reasoning'):
                parts.append(f"   💡 {draft.get('reasoning')}")

    # Tasks
    tasks = payload.get("tasks", [])
    if tasks:
        parts.append("\n\n✅ **Tasks Created:**")
        for i, task in enumerate(tasks, 1):
            parts.append(f"\n{i}. {task.get('title')} (Due: {task.get('due_date')})")
            parts.append(f"   Priority: {task.get('priority')}")

    # Suggestions
    suggestions = payload.get("suggestions", [])
    if suggestions:
        parts.append("\n\n💡 **Suggestions:**")
        for suggestion in suggestions:
            parts.append(f"- {suggestion}")

    # Actions
    actions = payload.get("actions", [])
    if actions:
        parts.append("\n\n🎯 **Next Actions:**")
        for action in actions:
            approval = " (requires approval)" if action.get("requires_approval") else ""
            parts.append(f"- {action.get('description')}{approval}")

    return "\n\n".join(parts)
