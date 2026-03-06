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

    # [v2.3-Lockdown] ABSOLUTE MANUAL MODE
    # Non-negotiable human-in-the-loop for ALL outbound actions.
    if canonical_intent in {"SEND", "ACCEPT_MEETING", "DECLINE_MEETING", "COMMIT_PAYMENT"}:
        outcome = "NEEDS_APPROVAL"
        allow_llm = False
        return GateResult(
            allowed=True,
            outcome=outcome,
            require_approval=True,
            allow_llm=allow_llm,
            explain_one_liner="Absolute Manual Mode: Outbound action parked for human review.",
            intent=canonical_intent,
            risk=risk,
            policy=policy,
        )

    # Policy/Risk thresholds (remaining logic for non-send intents)
    if policy.require_approval or not policy.allowed or float(model_confidence) < 0.90:
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
    
    # [v2.2-Hardening] Zero-Trust Token Filter (Secondary Verification)
    # Even if LLM is confident, final body content is checked for sensitive patterns.
    # Note: For DRAFT and SEND, this check is critical.
    if canonical_intent in {"DRAFT", "SEND"}:
        blacklist = {
            "bank account", "iban", "routing number", "ssn", "social security",
            "password", "secret", "contract", "termination", "severance",
            "legal action", "lawsuit", "confidential"
        }
        found_tokens = [t for t in blacklist if t in body.lower()]
        if found_tokens:
            outcome = "NEEDS_APPROVAL"
            return GateResult(
                allowed=True,
                outcome=outcome,
                require_approval=True,
                allow_llm=allow_llm,
                explain_one_liner=f"Zero-Trust Block: Sensitive tokens detected ({', '.join(found_tokens[:2])}).",
                intent=canonical_intent,
                risk=risk,
                policy=policy,
            )

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
    email_row: Any = None, # Optional TriagedEmail row
    draft: dict,
    settings: dict,
    is_explicit_approval: bool = False
) -> bool:
    """
    Locked Send Gate: Must be called by all send endpoints.
    Enforces that no email can be sent without approval if risks or missing info exist.
    Supports both triaged replies (email_row present) and "Compose New" (email_row is None).
    """
    # 1. Thread/Provider safety check (only if email_row exists)
    if email_row and email_row.provider != draft.get("provider", email_row.provider):
        raise ValueError("Thread/Provider mismatch detected in Final Action Gate.")

    # 2. Block if missing info present
    if draft.get("missing_info"):
        return False

    # 3. Block if risk labels present and approval not recorded
    risk_labels = draft.get("risk_labels", [])
    if risk_labels and not is_explicit_approval:
        return False

    # 4. Mandatory approval check for triaged items
    if email_row and email_row.requires_approval and not is_explicit_approval:
        # [Bug 2.11 Part 2] Unblock legacy drafts stuck with Global Policy labels
        aaliyah_settings = settings.get("aaliyah", {})
        auto_send_enabled = aaliyah_settings.get("auto_send_enabled", False)
        
        is_just_global_policy = email_row.approval_reason == "Global policy: Always require approval"
        
        if auto_send_enabled and is_just_global_policy:
            pass # Unblock legacy item
        else:
            return False

    # 5. Zero-Trust Content Filter for brand new "Compose" sends (where no email_row exists)
    if email_row is None and not is_explicit_approval:
        body = draft.get("body", "").lower()
        blacklist = {
            "bank account", "iban", "routing number", "ssn", "social security",
            "password", "secret", "contract", "termination", "severance",
            "legal action", "lawsuit", "confidential"
        }
        found_tokens = [t for t in blacklist if t in body]
        if found_tokens:
            return False

    # 6. Check if Global Auto-Send is enabled for autonomous drafts
    if not is_explicit_approval:
        aaliyah_settings = settings.get("aaliyah", {})
        auto_send_enabled = aaliyah_settings.get("auto_send_enabled", False)
        
        if auto_send_enabled:
            return True
            
        # Human approval is the only way to send if auto_send_enabled is False.
        return False

    return True

