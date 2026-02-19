"""
Single authoritative EVA-style runtime gate for email.

This must run BEFORE any LLM call and BEFORE any provider action.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.agents.aaliyah.core.autonomy import AUTONOMY, normalize_action
from app.agents.aaliyah.core.policy_engine import PolicyDecision, PolicyEngine
from app.agents.aaliyah.core.risk_engine import RiskEngine, RiskResult


OUTCOMES = {"NO_ACTION", "AUTO_ORGANIZE", "DRAFT_READY", "NEEDS_APPROVAL", "SUMMARY_ONLY", "ESCALATE"}


@dataclass(frozen=True)
class GateResult:
    allowed: bool
    outcome: str
    require_approval: bool
    allow_llm: bool
    explain_one_liner: str
    intent: str
    risk: RiskResult
    policy: PolicyDecision


def _explain(outcome: str, intent: str, risk: RiskResult, policy: PolicyDecision) -> str:
    # Deterministic "What + Why" in one line. Undo is handled by AuditLog for applied actions.
    why = policy.reason
    if risk.domain != "LOW" and risk.reasons:
        why = f"{why} (risk={risk.domain}: {', '.join(risk.reasons[:3])})"
    return f"{outcome}: {intent}. {why}"


def gate_email(
    *,
    db: Session,
    user_id: str,
    workspace_id: str,
    intent: str,
    subject: str,
    body: str,
    context: Optional[dict[str, Any]] = None,
    model_confidence: float = 1.0,
) -> GateResult:
    canonical_intent = normalize_action(intent) or str(intent or "").upper().strip()

    risk_engine = RiskEngine()
    risk = risk_engine.score(subject=subject, body=body)

    ctx = dict(context or {})
    ctx.update({"subject": subject, "body": body})

    policy_engine = PolicyEngine(db)
    policy = policy_engine.evaluate(
        user_id=user_id,
        workspace_id=workspace_id,
        intent=canonical_intent,
        risk_domain=risk.domain,
        context=ctx,
    )


    # Default deny for unknown.
    if canonical_intent not in AUTONOMY and canonical_intent not in policy.allowed_actions:
        outcome = "NEEDS_APPROVAL"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=False,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Autonomy ladder: any disallowed automatic action becomes NEEDS_APPROVAL.
    if canonical_intent in AUTONOMY and not AUTONOMY.get(canonical_intent, False):
        outcome = "NEEDS_APPROVAL"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=False,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Risk thresholds (pre-LLM).
    if risk.score >= 0.60:
        outcome = "ESCALATE"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=policy.allowed,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    if risk.score >= 0.40:
        outcome = "SUMMARY_ONLY"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=policy.allowed,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Confidence threshold (post-generation should also re-check, but gate can early-block if known low).
    if float(model_confidence) < 0.65:
        outcome = "NEEDS_APPROVAL"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=policy.allowed,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Policy can still require approval.
    if policy.require_approval or not policy.allowed:
        outcome = "NEEDS_APPROVAL"
        allow_llm = False
        explain = _explain(outcome, canonical_intent, risk, policy)
        return GateResult(
            allowed=policy.allowed,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner=explain,
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Safe low-risk path.
    outcome = "DRAFT_READY" if canonical_intent == "DRAFT" else "AUTO_ORGANIZE"
    allow_llm = canonical_intent in {
        "DRAFT", "SUMMARY", "UPDATE_PREFERENCE",
        "MEETING_PREP", "BRIEFING", "STATUS",
        "LABEL", "ARCHIVE", "CREATE_TASK",
    }
    explain = _explain(outcome, canonical_intent, risk, policy)
    return GateResult(
        allowed=True,
        outcome=outcome,
        require_approval=False,
        allow_llm=allow_llm,
        explain_one_liner=explain,
        intent=canonical_intent,
        risk=risk,
        policy=policy,
    )

def final_action_gate(
    *,
    action: str,
    email_row: Any, # TriagedEmail row
    draft: dict,
    settings: dict,
    is_explicit_approval: bool = False
) -> bool:
    """
    Locked Send Gate: Must be called by all send endpoints.
    Enforces that no email can be sent without approval if risks or missing info exist.
    """
    # 1. Thread/Provider safety check
    if email_row.provider != draft.get("provider", email_row.provider):
        raise ValueError("Thread/Provider mismatch detected in Final Action Gate.")

    # 2. Block if missing info present
    if draft.get("missing_info"):
        return False

    # 3. Block if risk labels present and approval not recorded
    risk_labels = draft.get("risk_labels", [])
    if risk_labels and not is_explicit_approval:
        return False

    # 4. Mandatory approval if email was flagged as requiring it
    if email_row.requires_approval and not is_explicit_approval:
        return False

    # 5. Fallback: if not explicit approval, check if global auto-send is enabled
    # Even then, we only allow it if "Always Require Approval" is OFF.
    if not is_explicit_approval:
        aaliyah_s = settings.get("aaliyah", {})
        auto_send_enabled = aaliyah_s.get("auto_send_enabled", False)
        always_require_approval = aaliyah_s.get("always_require_approval", True)
        
        if always_require_approval:
            return False
            
        if not auto_send_enabled:
            return False

    return True

