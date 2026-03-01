"""Tier-1 fast triage classifier with few-shot examples and deterministic fallback."""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional

from app.services.brain.core import Brain
from app.services.brain.schemas.models import ModelType
from app.config import settings
import logging

logger = logging.getLogger(__name__)

from .ingestion.email_ingestor import NormalizedEmailMessage

VALID_CATEGORIES = {"Priority", "Needs Reply", "Approvals", "Follow-ups", "Newsletter", "Notifications"}
VALID_PRIORITIES = {"High", "Medium", "Low"}

# ── Few-shot calibration examples ──────────────────────────────────────
_FEW_SHOT = """
Example 1:
Sender: alerts@github.com
Subject: [Dependabot] Security vulnerability in lodash
Snippet: A high severity vulnerability was found in lodash...
Answer: {"category": "Priority", "priority": "High", "is_noise": false, "confidence": 0.92, "reasoning": "Security alert requiring immediate review.", "language": "English"}

Example 2:
Sender: newsletter@techcrunch.com
Subject: This Week in AI — Feb 2026
Snippet: Welcome to our weekly roundup of the latest in...
Answer: {"category": "Newsletter", "priority": "Low", "is_noise": true, "confidence": 0.97, "reasoning": "Marketing newsletter.", "language": "English"}

Example 3:
Sender: jane@company.com
Subject: Re: Q3 Board Deck — feedback
Snippet: Hi, I reviewed the latest draft and have a few comments. Can we discuss?...
Answer: {"category": "Needs Reply", "priority": "Medium", "is_noise": false, "confidence": 0.85, "reasoning": "Actionable feedback requires a response.", "language": "English"}

Example 4:
Sender: vendor@service.com
Subject: Proposal for new software
Snippet: Hey, we'd like to offer you a 20% discount on our annual plan...
Answer: {"category": "Approvals", "priority": "Medium", "is_noise": false, "confidence": 0.70, "reasoning": "Vendor proposal requiring user decision.", "language": "English"}

Example 5:
Sender: ceo@company.com
Subject: URGENT: Board meeting moved to tomorrow
Snippet: We need to finalize the presentation by tonight. Please prioritize...
Answer: {"category": "Priority", "priority": "High", "is_noise": false, "confidence": 0.98, "reasoning": "Executive escalation with time-critical deadline.", "language": "English"}

Example 6:
Sender: partner@foreign.com
Subject: Confirmación del contrato
Snippet: Hola, adjunto el contrato firmado. Por favor, revíselo.
Answer: {"category": "Approvals", "priority": "Medium", "is_noise": false, "confidence": 0.90, "reasoning": "Signed contract received requiring review/approval.", "language": "Spanish"}
"""

class TriageResult(BaseModel):
    category: str = Field(..., description="Classification category (e.g. Priority, Newsletter)")
    priority: str = Field(..., description="High, Medium, or Low")
    is_noise: bool = Field(False, description="True if email is automated/ads/spam")
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str = Field(..., description="Concise explanation for this classification")
    needs_clarity: bool = Field(False, description="True if AI needs user opinion before drafting")
    can_draft: bool = Field(False, description="True if AI has enough context to draft a reply")
    clarification_questions: list[str] = Field(default_factory=list, description="Specific questions AI needs answered before drafting (only when needs_clarity=true)")
    context_type: str = Field(default="business", description="'business' or 'personal' based on sender domain")
    language: str = Field(default="English", description="Detected language of the email (e.g., English, Spanish, French, Hindi)")
    is_vip: bool = Field(False, description="True if sender is a high-value contact (CEO, Director, Founder, or long-term partner)")

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
        if heuristic.category == "Newsletter" and heuristic.is_noise:
            return heuristic

        # Tier-1 fast model for everything else or ambiguous cases.
        subject = message.metadata.subject or ""
        sender = message.metadata.sender or ""
        snippet = message.content or ""

        # Detect context type for this email
        from app.agents.aaliyah.core.ingestion.sanitizer import detect_context_type
        ctx_type = detect_context_type(sender)

        # UPGRADE: Enterprise-grade clarification with specific questions.
        system_prompt = (
            "You are an elite, high-speed email classifier for Aaliyah, a Super Intelligent Executive Assistant. "
            "Return strict JSON only with keys: category, priority, is_noise, confidence, reasoning, needs_clarity, can_draft, clarification_questions, context_type, language, is_vip. "
            "category must be one of [Priority, Needs Reply, Approvals, Follow-ups, Newsletter, Notifications]. "
            "priority must be one of [High, Medium, Low]. "
            "is_noise=true means the email can be safely auto-archived (ads, digests, automated alerts). "
            "confidence should reflect how certain you are (0.0-1.0). "
            "reasoning should be a single concise sentence explaining the classification. "
            "language should be the detected language of the email (e.g., English, Spanish, French, Hindi). "
            "is_vip (bool): Identify if the sender is an executive, high-value partner, or priority stakeholder. Check for titles like CEO, Founder, Director, Partner, or keywords indicating high relational value. "
            f"context_type: Set to '{ctx_type}' (detected from sender domain). "
            "INTERACTIVE CLARIFICATION RULES: "
            "needs_clarity (bool): Set to true if the email requires the user's specific input before a reply can be drafted. "
            "Examples: approval requests, budget decisions, meeting preferences with specific people, or any question where the answer depends on the user's personal judgment. "
            "clarification_questions (list[str]): When needs_clarity=true, generate ALL specific questions the AI needs answered. "
            "Each question must be direct and actionable. Examples: "
            "['Do you approve the $5,000 expense for the marketing campaign?', 'Should I suggest morning or afternoon slots for the meeting?'] "
            "Generate between 1-4 questions maximum. Cover ALL doubts in one pass so the user isn't asked repeatedly. "
            "can_draft (bool): Set to true ONLY if the AI has enough context to draft WITHOUT any user input. "
            "Standard acknowledgments, thank-you replies, and information-only forwards can be auto-drafted."
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
            # Stage 1: Tier-1 Fast Primary (e.g. Gemini Flash)
            result = await self.brain.think_json(
                prompt=prompt,
                response_model=TriageResult,
                system_prompt=system_prompt,
                model_override=settings.BRAIN_MODEL,
                temperature_override=0.0,
            )
            
            # [v2.1 Scale Hardening] - Multi-Model Fallback
            # If confidence is low or categorizations are ambiguous, escalate to Tier-2 High-Capacity.
            if result.confidence < 0.7 or result.category == "Notifications": # Low confidence or noisy cat
                 logger.info(f"Triage: Confidence ({result.confidence}) below threshold. Escalating to Tier-2 High-Capacity.")
                 result = await self.brain.think_json(
                    prompt=prompt,
                    response_model=TriageResult,
                    system_prompt=system_prompt,
                    model_override="openai/gpt-4o", # Tier-2 Sovereign Model
                    temperature_override=0.0,
                )

            # Normalize category and priority
            result = self._normalize_result(result)
            return result
        except Exception as e:
            logger.warning("Primary triage failed, attempting critical recovery fallback: %s", e)
            try:
                # Emergency recovery using highest-capacity model
                result = await self.brain.think_json(
                    prompt=prompt,
                    response_model=TriageResult,
                    system_prompt=system_prompt,
                    model_override="openai/gpt-4o",
                    temperature_override=0.0,
                )
                return self._normalize_result(result)
            except Exception:
                pass

        return heuristic

    def _normalize_result(self, result: TriageResult) -> TriageResult:
        """Ensure category and priority are from valid sets."""
        raw_cat = result.category.strip()
        best_cat = "Notifications"
        for valid in VALID_CATEGORIES:
            if valid.lower() == raw_cat.lower().replace("-"," ").replace("_"," "):
                best_cat = valid
                break
        
        priority = result.priority.strip().title()
        if priority not in VALID_PRIORITIES:
            priority = "Low"
            
        return result.model_copy(update={"category": best_cat, "priority": priority})

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
                language="English"
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
                    language="English"
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
                language="English"
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
                language="English"
            )

        return TriageResult(
            category="Follow-ups",
            priority="Low",
            is_noise=False,
            confidence=0.65,
            reasoning="No urgency or reply markers found; classified as general information.",
            language="English"
        )
