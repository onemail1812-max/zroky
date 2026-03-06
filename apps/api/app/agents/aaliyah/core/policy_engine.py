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
        from app.models.workspace import Workspace
        
        canonical = normalize_action(intent) or str(intent or "").upper().strip()

        # 1. Load Workspace Settings
        workspace = None
        if self.db:
            workspace = self.db.query(Workspace).filter(Workspace.id == workspace_id).first()
        
        settings = getattr(workspace, "settings_json", {}) or {}
        aaliyah_settings = settings.get("aaliyah", {})
        
        # [v2.3-Lockdown] ABSOLUTE MANUAL MODE
        # All destructive intents now require human approval regardless of settings.
        allowed_actions: Set[str] = {
            "LABEL", "ARCHIVE", "SUMMARY", "DRAFT", "CREATE_TASK", "UPDATE_PREFERENCE",
            "MEETING_PREP", "BRIEFING", "STATUS",
        }

        # Outbound/Execute actions are non-negotiably gated.
        if canonical in {"SEND", "ACCEPT_MEETING", "DECLINE_MEETING", "COMMIT_PAYMENT"}:
            return PolicyDecision(
                allowed=True, # Allowed to prepare/draft
                reason="Absolute Manual Mode: All outbound actions require explicit human approval.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        # Default deny for unknown.
        if canonical not in allowed_actions:
            return PolicyDecision(
                allowed=False,
                reason=f"Unknown intent '{intent}'. Defaulting to review.",
                allowed_actions=allowed_actions,
                require_approval=True,
            )

        # Informational actions (Labels, Summaries, Briefings) remain autonomous.
        return PolicyDecision(
            allowed=True,
            reason="Operational Autonomy (Non-Outbound).",
            allowed_actions=allowed_actions,
            require_approval=False,
        )


