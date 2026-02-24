"""Tier-1 fast triage classifier with few-shot examples and deterministic fallback."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType

from .ingestion.email_ingestor import NormalizedEmailMessage

VALID_CATEGORIES = {"Priority", "Needs Reply", "Approvals", "Follow-ups", "Newsletter", "Notifications"}
VALID_PRIORITIES = {"High", "Medium", "Low"}

# ── Few-shot calibration examples ──────────────────────────────────────
_FEW_SHOT = """
Example 1:
Sender: alerts@github.com
Subject: [Dependabot] Security vulnerability in lodash
Snippet: A high severity vulnerability was found in lodash...
Answer: {"category": "Priority", "priority": "High", "is_noise": false, "confidence": 0.92, "reasoning": "Security alert requiring immediate review."}

Example 2:
Sender: newsletter@techcrunch.com
Subject: This Week in AI — Feb 2026
Snippet: Welcome to our weekly roundup of the latest in...
Answer: {"category": "FYI", "priority": "Low", "is_noise": true, "confidence": 0.97, "reasoning": "Marketing newsletter."}

Example 3:
Sender: jane@company.com
Subject: Re: Q3 Board Deck — feedback
Snippet: Hi, I reviewed the latest draft and have a few comments. Can we discuss?...
Answer: {"category": "Needs Reply", "priority": "Medium", "is_noise": false, "confidence": 0.85, "reasoning": "Actionable feedback requires a response."}

Example 4:
Sender: vendor@service.com
Subject: Proposal for new software
Snippet: Hey, we'd like to offer you a 20% discount on our annual plan...
Answer: {"category": "Approvals", "priority": "Medium", "is_noise": false, "confidence": 0.70, "reasoning": "Vendor proposal requiring user decision."}

Example 5:
Sender: ceo@company.com
Subject: URGENT: Board meeting moved to tomorrow
Snippet: We need to finalize the presentation by tonight. Please prioritize...
Answer: {"category": "Priority", "priority": "High", "is_noise": false, "confidence": 0.98, "reasoning": "Executive escalation with time-critical deadline."}
"""

@dataclass(frozen=True)
class TriageResult:
    category: str
    priority: str
    is_noise: bool
    confidence: float
    reasoning: str
    needs_clarity: bool = False
    can_draft: bool = False

def _parse_float(value: object, default: float = 0.5) -> float:
    try:
        number = float(value)
        return min(1.0, max(0.0, number))
    except Exception:
        return default

class SmartTriageClassifier:
    def __init__(self, brain: Brain):
        self.brain = brain

    async def classify(self, message: NormalizedEmailMessage) -> TriageResult:
        # Deterministic Keywords First
        heuristic = self._fallback_heuristic(message)
        
        # If it's pure noise or high priority simple alert, return early
        if heuristic.category == "Priority" and heuristic.confidence >= 0.8:
            return heuristic
        if heuristic.category == "FYI" and heuristic.is_noise:
            return heuristic

        # Tier-1 fast model for everything else or ambiguous cases.
        subject = message.metadata.subject or ""
        sender = message.metadata.sender or ""
        snippet = message.content or ""

        # UPGRADE: Added instructions for identifying clarity and drafting needs.
        system_prompt = (
            "You are an elite, high-speed email classifier for Aaliyah, a Super Intelligent Executive Assistant. "
            "Return strict JSON only with keys: category, priority, is_noise, confidence, reasoning, needs_clarity, can_draft. "
            "category must be one of [Priority, Needs Reply, Approvals, Follow-ups, Newsletter, Notifications]. "
            "priority must be one of [High, Medium, Low]. "
            "is_noise=true means the email can be safely auto-archived (ads, digests, automated alerts). "
            "confidence should reflect how certain you are (0.0-1.0). "
            "reasoning should be a single concise sentence explaining the classification. "
            "NEW RULES: "
            "needs_clarity (bool): Set to true if the email asks a complex question where the AI needs the user's opinion before drafting a reply (e.g., 'Do you approve this $5k expense?'). "
            "can_draft (bool): Set to true if the AI has enough context from the email alone to draft a standard response."
        )
        prompt = (
            f"{_FEW_SHOT}\n"
            f"Now classify this message:\n"
            f"Sender: {sender}\n"
            f"Subject: {subject}\n"
            f"Snippet: {snippet[:800]}\n"
            "Answer:"
        )

        try:
            response = await self.brain.think(
                prompt=prompt,
                system_prompt=system_prompt,
                model_override=ModelType.FAST.value,
                temperature_override=0.0,
            )
            parsed = self._parse_response(response.content)
            if parsed:
                return parsed
        except Exception:
            pass

        return heuristic

    def _parse_response(self, content: str) -> TriageResult | None:
        text = content.strip()
        if "```json" in text:
            text = text.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in text:
            text = text.split("```", 1)[1].split("```", 1)[0].strip()

        if not text.startswith("{"):
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                text = match.group(1)

        try:
            obj = json.loads(text)
        except Exception:
            return None
        if not isinstance(obj, dict):
            return None

        raw_category = str(obj.get("category") or "").strip()
        best_category = "Notifications"
        for valid in VALID_CATEGORIES:
            if valid.lower() == raw_category.lower() or valid.lower().replace("-","") == raw_category.lower().replace("-",""):
                best_category = valid
                break

        priority = str(obj.get("priority") or "").strip().title()
        is_noise = bool(obj.get("is_noise", False))
        confidence = _parse_float(obj.get("confidence"), default=0.5)
        reasoning = str(obj.get("reasoning") or "").strip()[:500]
        needs_clarity = bool(obj.get("needs_clarity", False))
        can_draft = bool(obj.get("can_draft", False))

        if priority not in VALID_PRIORITIES:
            priority = "Low"
            
        return TriageResult(
            category=best_category,
            priority=priority,
            is_noise=is_noise,
            confidence=confidence,
            reasoning=reasoning or "Classified by fast model.",
            needs_clarity=needs_clarity,
            can_draft=can_draft
        )

    def _fallback_heuristic(self, message: NormalizedEmailMessage) -> TriageResult:
        text = f"{message.metadata.subject or ''} {message.content or ''}".lower()
        sender = (message.metadata.sender or "").lower()

        # Newsletter / Promotional
        newsletter_markers = (
            "unsubscribe", "newsletter", "sale", "promotion", "digest",
            "weekly roundup", "monthly update", "manage preferences",
            "view in browser", "email preferences", "opt out",
        )
        if any(word in text for word in newsletter_markers):
            return TriageResult(
                category="Newsletter",
                priority="Low",
                is_noise=True,
                confidence=0.82,
                reasoning="Contains common newsletter/promotional markers.",
            )

        # Automated notifications (noise)
        noise_senders = ("noreply@", "no-reply@", "notifications@", "alerts@", "mailer-daemon@")
        if any(sender.startswith(prefix) or f"<{prefix}" in sender for prefix in noise_senders):
            if not any(w in text for w in ("urgent", "critical", "action required", "security")):
                return TriageResult(
                    category="Notifications",
                    priority="Low",
                    is_noise=True,
                    confidence=0.78,
                    reasoning="Automated notification from no-reply sender.",
                )

        # Urgency keywords
        urgency_words = (
            "urgent", "asap", "immediately", "critical", "deadline today",
            "time-sensitive", "action required", "eod", "by end of day",
            "escalation", "p0", "p1", "blocker", "production down",
        )
        if any(word in text for word in urgency_words):
            return TriageResult(
                category="Priority",
                priority="High",
                is_noise=False,
                confidence=0.85,
                reasoning="Contains urgency and time-critical language.",
            )

        # Needs Reply markers
        meeting_words = (
            "meeting", "availability", "reschedule", "?", "let me know",
            "thoughts", "feedback", "can we", "do you", "please confirm",
        )
        if any(word in text for word in meeting_words):
            return TriageResult(
                category="Needs Reply",
                priority="Medium",
                is_noise=False,
                confidence=0.70,
                reasoning="Contains questions or action-oriented phrases requiring reply.",
            )

        return TriageResult(
            category="Follow-ups",
            priority="Low",
            is_noise=False,
            confidence=0.65,
            reasoning="No urgency or reply markers found; classified as general information.",
        )
