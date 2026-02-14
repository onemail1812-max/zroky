"""
ActionPolicy

Hard autonomy invariants. These rules are enforced in code and cannot
be overridden by prompts or model output.
"""

from __future__ import annotations

from typing import Dict, Optional

from app.agents.aaliyah.core.autonomy import AUTONOMY, ALIASES, normalize_action, enforce


ALLOWED_AUTOMATIONS: Dict[str, bool] = AUTONOMY
ACTION_ALIASES: Dict[str, str] = ALIASES


class ActionPolicy:
    """Central gate for autonomous actions."""

    @classmethod
    def normalize(cls, action_type: Optional[str]) -> Optional[str]:
        return normalize_action(action_type)

    @classmethod
    def check_automation_allowed(cls, action_type: Optional[str]) -> Dict[str, str]:
        canonical = cls.normalize(action_type)
        if not canonical:
            return {
                "allowed": False,
                "reason": "Unknown action type (no autonomy mapping)",
                "blocked_by": "autonomy_invariant",
                "action": str(action_type),
            }

        allowed = ALLOWED_AUTOMATIONS.get(canonical, False)
        if not allowed:
            return {
                "allowed": False,
                "reason": f"Autonomy invariant: {canonical} is not allowed automatically",
                "blocked_by": "autonomy_invariant",
                "action": canonical,
            }

        return {"allowed": True, "action": canonical}

    @classmethod
    def enforce_allowed(cls, action_type: Optional[str]) -> str:
        """Raise PermissionError if action is disallowed."""
        return enforce(action_type)
