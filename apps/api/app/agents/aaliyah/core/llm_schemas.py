"""
LLM output schemas (strict JSON only).

LLM must be non-authoritative:
- It can generate content (drafts/summaries/extractions).
- It cannot propose or execute actions.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any, List, Optional


@dataclass(frozen=True)
class DraftOutput:
    subject: str
    body: str
    tone_tags: List[str]
    confidence: float


def _as_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def parse_draft_output(raw: str) -> DraftOutput:
    """
    Parse and validate DraftOutput JSON. Raises ValueError on any mismatch.
    """
    try:
        obj = json.loads(raw)
    except Exception as exc:
        raise ValueError("DraftOutput must be valid JSON") from exc

    if not isinstance(obj, dict):
        raise ValueError("DraftOutput must be a JSON object")

    subject = obj.get("subject")
    body = obj.get("body")
    tone_tags = obj.get("tone_tags") or []
    confidence = _as_float(obj.get("confidence"))

    if not isinstance(subject, str) or not subject.strip():
        raise ValueError("DraftOutput.subject is required")
    if not isinstance(body, str) or not body.strip():
        raise ValueError("DraftOutput.body is required")
    if not isinstance(tone_tags, list) or any(not isinstance(t, str) for t in tone_tags):
        raise ValueError("DraftOutput.tone_tags must be a list of strings")
    if confidence is None or confidence < 0.0 or confidence > 1.0:
        raise ValueError("DraftOutput.confidence must be a number in [0,1]")

    return DraftOutput(
        subject=subject.strip(),
        body=body,
        tone_tags=[t.strip() for t in tone_tags if t.strip()],
        confidence=float(confidence),
    )

