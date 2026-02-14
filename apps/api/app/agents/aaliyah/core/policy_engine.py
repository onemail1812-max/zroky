"""
Deterministic policy engine (no LLM).

The policy engine answers: "Is this action allowed at all, and does it require approval?"
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Set, Any

from sqlalchemy.orm import Session

from app.agents.aaliyah.core.autonomy import normalize_action


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str
    allowed_actions: Set[str]
    require_approval: bool


class PolicyEngine:
    """
    Workspace/user aware policy rules.
    In production this should read user settings (VIP senders, time windows, etc).
    """

    def __init__(self, db: Optional[Session]):
        self.db = db

    # Overridable hook for tests and future settings storage.
    def _get_settings(self, user_id: str, workspace_id: str) -> Any:
        return None

    def evaluate(
        self,
        user_id: str,
        workspace_id: str,
        intent: str,
        risk_domain: str,
        context: Optional[dict] = None,
    ) -> PolicyDecision:
        canonical = normalize_action(intent) or str(intent or "").upper().strip()

        allowed_actions: Set[str] = {
            "LABEL", "ARCHIVE", "SUMMARY", "DRAFT", "CREATE_TASK", "UPDATE_PREFERENCE",
            "MEETING_PREP", "BRIEFING", "STATUS",
        }

        # Default deny for unknown.
        if canonical not in allowed_actions and canonical not in {"SEND", "ACCEPT_MEETING", "DECLINE_MEETING", "COMMIT_PAYMENT"}:
            return PolicyDecision(
                allowed=False,
                reason=f"Unknown intent '{intent}'. Defaulting to review.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        # Hard blocks (policy cannot be overridden).
        if canonical in {"SEND", "ACCEPT_MEETING", "DECLINE_MEETING", "COMMIT_PAYMENT"}:
            return PolicyDecision(
                allowed=False,
                reason=f"Policy block: {canonical} is never allowed automatically.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        # Risk-aware approval.
        if str(risk_domain or "").upper() in {"MONEY", "LEGAL", "HR", "SECURITY"}:
            return PolicyDecision(
                allowed=True,
                reason=f"High-risk domain {risk_domain}: require approval.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        # Context-based approval rules (deterministic).
        ctx = context or {}
        if bool(ctx.get("is_new_sender")) and bool(ctx.get("is_actionable")):
            return PolicyDecision(
                allowed=True,
                reason="New sender + actionable request: require approval.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        if bool(ctx.get("has_attachments")):
            return PolicyDecision(
                allowed=True,
                reason="Attachments present: require approval.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        return PolicyDecision(
            allowed=True,
            reason="Allowed by deterministic policy.",
            allowed_actions=allowed_actions,
            require_approval=False,
        )

