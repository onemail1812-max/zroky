"""Hot State: Redis-backed real-time user context cache.

Tracks the user's *current* situation so Aaliyah can reason about the
**right now** — not just history. Falls back to an in-process dict when
Redis is unavailable (dev mode).

Stored fields per workspace:
  - location          (e.g. "Office", "Home", "Commuting")
  - mood              (e.g. "focused", "stressed", "relaxed")
  - active_project    (e.g. "Q3 Board Deck")
  - deadlines         (list of {label, due_at_iso})
  - last_interaction  (ISO timestamp of last user action)
  - session_notes     (free-form dict for current session context)
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis connection singleton
# ---------------------------------------------------------------------------
_redis_client: Any = None
_redis_init_attempted: bool = False


def _get_redis() -> Any:
    """Lazy-init Redis connection. Returns None if unavailable."""
    global _redis_client, _redis_init_attempted
    if _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True

    redis_url = getattr(settings, "redis_url", None) or ""
    if not redis_url.strip():
        logger.info("HotState: no REDIS_URL configured — using in-memory fallback")
        return None

    try:
        import redis as _redis_lib

        _redis_client = _redis_lib.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
        )
        _redis_client.ping()
        logger.info("HotState: connected to Redis at %s", redis_url.split("@")[-1])
    except Exception as exc:
        logger.warning("HotState: Redis connection failed (%s) — using in-memory fallback", exc)
        _redis_client = None

    return _redis_client


# ---------------------------------------------------------------------------
# In-memory fallback (single-process dev mode)
# ---------------------------------------------------------------------------
_inmemory_store: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# HotStateManager
# ---------------------------------------------------------------------------
_HOT_STATE_TTL = 3600 * 4  # 4 hours — auto-expire stale context

# Default fields
_DEFAULT_STATE: dict[str, Any] = {
    "location": None,
    "mood": None,
    "active_project": None,
    "deadlines": [],
    "last_interaction": None,
    "session_notes": {},
}


class HotStateManager:
    """Read/write the user's real-time contextual state."""

    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self._key = f"aaliyah:hot:{workspace_id}"
        self._redis = _get_redis()

    # -- helpers --

    def _serialize(self, data: dict[str, Any]) -> str:
        return json.dumps(data, default=str)

    def _deserialize(self, raw: str | None) -> dict[str, Any]:
        if not raw:
            return dict(_DEFAULT_STATE)
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                merged = dict(_DEFAULT_STATE)
                merged.update(data)
                return merged
        except Exception as e:
            logger.error(f"Failed to deserialize hot state for {self._key}: {e}", exc_info=True)
            pass
        return dict(_DEFAULT_STATE)

    # -- read --

    def get(self) -> dict[str, Any]:
        """Return full hot state snapshot."""
        if self._redis:
            try:
                raw = self._redis.get(self._key)
                return self._deserialize(raw)
            except Exception as exc:
                logger.warning("HotState.get redis error: %s", exc)

        return self._deserialize(_inmemory_store.get(self._key))

    def get_field(self, field: str) -> Any:
        """Return a single field value."""
        state = self.get()
        return state.get(field)

    # -- write --

    def patch(self, **fields: Any) -> dict[str, Any]:
        """Update one or more fields (merge). Returns full state."""
        state = self.get()
        state.update(fields)
        state["last_interaction"] = datetime.now(timezone.utc).isoformat()
        serialized = self._serialize(state)

        if self._redis:
            try:
                self._redis.setex(self._key, _HOT_STATE_TTL, serialized)
            except Exception as exc:
                logger.warning("HotState.patch redis error: %s", exc)

        # Always keep local copy as serialized string (same format as Redis)
        _inmemory_store[self._key] = serialized
        return state

    def set_location(self, location: str) -> None:
        self.patch(location=location)

    def set_mood(self, mood: str) -> None:
        self.patch(mood=mood)

    def set_active_project(self, project: str | None) -> None:
        self.patch(active_project=project)

    def add_deadline(self, label: str, due_at: str | datetime) -> None:
        """Add an immediate deadline to the hot state."""
        state = self.get()
        deadlines = state.get("deadlines") or []
        if isinstance(deadlines, str):
            try:
                deadlines = json.loads(deadlines)
            except Exception as e:
                logger.error(f"Failed to parse deadlines JSON in add_deadline for {self._key}: {e}", exc_info=True)
                deadlines = []
        due_str = due_at.isoformat() if isinstance(due_at, datetime) else str(due_at)
        # Deduplicate by label
        deadlines = [d for d in deadlines if d.get("label") != label]
        deadlines.append({"label": label, "due_at": due_str})
        self.patch(deadlines=deadlines)

    def remove_deadline(self, label: str) -> None:
        state = self.get()
        deadlines = state.get("deadlines") or []
        if isinstance(deadlines, str):
            try:
                deadlines = json.loads(deadlines)
            except Exception as e:
                logger.error(f"Failed to parse deadlines JSON in remove_deadline for {self._key}: {e}", exc_info=True)
                deadlines = []
        deadlines = [d for d in deadlines if d.get("label") != label]
        self.patch(deadlines=deadlines)

    def update_session_notes(self, notes: dict[str, Any]) -> None:
        state = self.get()
        session = state.get("session_notes") or {}
        if isinstance(session, str):
            try:
                session = json.loads(session)
            except Exception as e:
                logger.error(f"Failed to parse session_notes JSON for {self._key}: {e}", exc_info=True)
                session = {}
        session.update(notes)
        self.patch(session_notes=session)

    def touch(self) -> None:
        """Update last_interaction timestamp."""
        self.patch()

    # -- reset --

    def clear(self) -> None:
        """Wipe hot state entirely."""
        if self._redis:
            try:
                self._redis.delete(self._key)
            except Exception as e:
                logger.warning(f"Failed to clear Redis hot state for {self._key}: {e}")
                pass
        _inmemory_store.pop(self._key, None)

    # -- context summary for prompts --

    def summarize_for_prompt(self) -> str:
        """Produce a concise string Aaliyah can inject into her system prompt."""
        state = self.get()
        parts: list[str] = []

        if state.get("location"):
            parts.append(f"Location: {state['location']}")
        if state.get("mood"):
            parts.append(f"Current mood: {state['mood']}")
        if state.get("active_project"):
            parts.append(f"Active project: {state['active_project']}")

        deadlines = state.get("deadlines") or []
        if deadlines:
            dl_lines = [f"  - {d.get('label', '?')}: due {d.get('due_at', '?')}" for d in deadlines[:5]]
            parts.append("Immediate deadlines:\n" + "\n".join(dl_lines))

        notes = state.get("session_notes") or {}
        if notes:
            note_str = ", ".join(f"{k}={v}" for k, v in list(notes.items())[:5])
            parts.append(f"Session context: {note_str}")

        if not parts:
            return ""
        return "**User's Current Context:**\n" + "\n".join(parts)
