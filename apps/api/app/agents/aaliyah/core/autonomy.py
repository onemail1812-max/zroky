"""
Autonomy ladder (hard invariants).

Golden rule:
- The AI may decide *how* to do an already-approved action.
- The AI may never decide *what it is allowed to do*.

This module is the single source of truth for "what can happen automatically".
"""

from __future__ import annotations

from typing import Optional


# Canonical action types (uppercase snake-case).
AUTONOMY: dict[str, bool] = {
    "READ": True,
    "LABEL": True,
    "ARCHIVE": True,
    "SUMMARY": True,
    "DRAFT": True,
    "CREATE_TASK": True,
    "UPDATE_PREFERENCE": True,
    "MEETING_PREP": True,
    "BRIEFING": True,
    "STATUS": True,
    # Hard blocks (never automatic)
    "SEND": False,
    "ACCEPT_MEETING": False,
    "DECLINE_MEETING": False,
    "COMMIT_PAYMENT": False,
}


# Accept common synonyms from older codepaths or model output.
ALIASES: dict[str, str] = {
    "SEND_EMAIL": "SEND",
    "SEND_MAIL": "SEND",
    "EMAIL_SEND": "SEND",
    "DRAFT_REPLY": "DRAFT",
    "DRAFT_EMAIL": "DRAFT",
    "CREATE_DRAFT": "DRAFT",
    "SUMMARIZE": "SUMMARY",
    "SUMMARISE": "SUMMARY",
    "MOVE": "ARCHIVE",
    "MOVE_TO_ARCHIVE": "ARCHIVE",
    "MEETING_ACCEPT": "ACCEPT_MEETING",
    "MEETING_DECLINE": "DECLINE_MEETING",
    "PAYMENT": "COMMIT_PAYMENT",
}


def normalize_action(action_type: Optional[str]) -> Optional[str]:
    if not action_type:
        return None

    raw = str(action_type).strip()
    if not raw:
        return None

    key = raw.upper().replace("-", "_").replace(" ", "_")
    key = ALIASES.get(key, key)

    if key in AUTONOMY:
        return key
    return None


def enforce(action_type: Optional[str]) -> str:
    """
    Raise PermissionError if the action is not allowed automatically by the ladder.

    Returns the canonical action type if allowed.
    """
    canonical = normalize_action(action_type)
    if not canonical:
        raise PermissionError("Action not allowed by autonomy ladder: unknown action")

    if not AUTONOMY.get(canonical, False):
        raise PermissionError("Action not allowed by autonomy ladder")

    return canonical

