"""
Shlok memory handling.

This module enforces strict memory boundaries:
- Workspace-scoped only
- Thread-scoped only
- No cross-employee leakage
- No long-term autonomous memory writes

Shlok operates with read-only contextual memory assembled at request time.
"""

from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from app.models.message import Message, AuthorType
from app.models.guideline import Guideline


def load_thread_context(
    db: Session,
    workspace_id: str,
    thread_id: str,
) -> List[Dict[str, str]]:
    """
    Load thread messages in a safe, prompt-ready format.
    """
    messages = (
        db.query(Message)
        .filter(
            Message.workspace_id == workspace_id,
            Message.thread_id == thread_id,
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    out: List[Dict[str, str]] = []
    for m in messages:
        if m.author_type == AuthorType.USER:
            out.append({"role": "user", "content": m.content_text or ""})
        elif m.author_type == AuthorType.AI:
            out.append({"role": "assistant", "content": m.content_text or ""})

    return out


def load_shlok_guideline(
    db: Session,
    workspace_id: str,
) -> Dict:
    """
    Load Shlok guideline content_json safely.
    """
    guideline = (
        db.query(Guideline)
        .filter(
            Guideline.workspace_id == workspace_id,
            Guideline.employee_id == "shlok",
        )
        .first()
    )
    if not guideline or not guideline.content_json:
        return {}

    try:
        import json

        return json.loads(guideline.content_json) or {}
    except Exception:
        return {}
