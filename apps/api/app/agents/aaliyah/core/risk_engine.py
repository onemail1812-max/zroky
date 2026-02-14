"""
Pre-LLM risk engine.

Deterministic keyword + pattern scan.
This must run BEFORE any LLM call or provider action.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import List


RISK_DOMAINS = {"LOW", "MONEY", "LEGAL", "HR", "SECURITY", "REPUTATION"}


@dataclass(frozen=True)
class RiskResult:
    score: float  # 0..1
    domain: str  # LOW|MONEY|LEGAL|HR|SECURITY|REPUTATION
    reasons: List[str]
    should_escalate: bool


_CURRENCY_RE = re.compile(r"(?i)(\$)\s*\d")
_AMOUNT_RE = re.compile(r"(?i)\b(usd|inr|eur|gbp)\b\s*\d")
_ACCESS_RE = re.compile(r"\baccess\b", re.IGNORECASE)  # word-boundary to avoid "accessible"


class RiskEngine:
    def score(self, subject: str, body: str) -> RiskResult:
        text = f"{subject or ''}\n{body or ''}".lower()

        # Keyword buckets with light weights.
        buckets: dict[str, list[str]] = {
            "MONEY": [
                "invoice",
                "payment",
                "pay ",
                "refund",
                "pricing",
                "quote",
                "bank",
                "wire",
                "transfer",
                "overdue",
                "billing",
                "amount",
            ],
            "LEGAL": [
                "nda",
                "contract",
                "terms",
                "liability",
                "indemn",
                "termination",
                "agreement",
                "subpoena",
                "lawsuit",
            ],
            "HR": [
                "salary",
                "offer",
                "appraisal",
                "performance",
                "terminate",
                "termination",
                "candidate",
                "hiring",
                "compensation",
                "bonus",
            ],
            "SECURITY": [
                "password",
                "otp",
                "2fa",
                "token",
                "credentials",
                "breach",
                "phish",
                "reset",
                "vulnerability",
                "exploit",
                "authentication",
                "unauthorized",
                "malware",
                "ransomware",
            ],
            "REPUTATION": [
                "complaint",
                "angry",
                "escalat",
                "fraud",
                "harass",
                "bad review",
                "lawsuit",
                "social media",
                "pr crisis",
                "press inquiry",
                "public statement",
            ],
        }

        domain_scores: dict[str, float] = {d: 0.0 for d in buckets}
        domain_reasons: dict[str, list[str]] = {d: [] for d in buckets}

        for domain, words in buckets.items():
            for w in words:
                if w in text:
                    # First hit is heavier; subsequent hits add smaller increments.
                    inc = 0.35 if not domain_reasons[domain] else 0.12
                    domain_scores[domain] += inc
                    domain_reasons[domain].append(w.strip())

        # Pattern boosts.
        if _CURRENCY_RE.search(text) or _AMOUNT_RE.search(text):
            domain_scores["MONEY"] += 0.35
            domain_reasons["MONEY"].append("currency_amount_pattern")

        # Word-boundary "access" check for security (avoiding false positives)
        if _ACCESS_RE.search(text):
            domain_scores["SECURITY"] += 0.25
            domain_reasons["SECURITY"].append("access")

        # Pick the highest risk domain.
        best_domain = "LOW"
        best_score = 0.0
        best_reasons: list[str] = []
        for domain, score in domain_scores.items():
            if score > best_score:
                best_domain = domain
                best_score = score
                best_reasons = domain_reasons[domain]

        best_score = float(min(1.0, max(0.0, best_score)))

        # EVA-style policy: if risk >= 0.4, treat as escalatable (drafting blocked by gate).
        should_escalate = best_domain != "LOW" and best_score >= 0.4

        return RiskResult(
            score=best_score,
            domain=best_domain,
            reasons=best_reasons,
            should_escalate=should_escalate,
        )
