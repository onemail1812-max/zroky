"""Input/output guardrails for Brain requests."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.services.brain.errors import BrainValidationError

MAX_PROMPT_CHARS = 12_000
MAX_SYSTEM_PROMPT_CHARS = 4_000

_EMAIL_RE = re.compile(r"([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?1[\s\-]?)?(?:\(?\d{3}\)?[\s\-]?)\d{3}[\s\-]?\d{4}(?!\d)")
_TOKEN_RE = re.compile(
    r"(?i)\b(?:sk-or-[A-Za-z0-9_-]{8,}|gocspx-[A-Za-z0-9_-]{8,}|ya29\.[A-Za-z0-9._-]{10,}|"
    r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,})\b"
)
_AUTH_HEADER_RE = re.compile(r"(?i)(authorization\s*[:=]\s*bearer\s+)[^\s]+")
_SENSITIVE_KEY_RE = re.compile(
    r"(?i)(\"?(?:password|secret|token|access_token|refresh_token|api_key|client_secret|authorization)\"?\s*[:=]\s*)"
    r"(\"[^\"]*\"|'[^']*'|[^\s,}]+)"
)

_PROMPT_INJECTION_SIGNALS = (
    "ignore previous instructions",
    "system prompt",
    "developer prompt",
    "reveal hidden",
    "print secrets",
    "bypass safety",
)


def fingerprint(text: str) -> str:
    """Short deterministic fingerprint for observability without logging content."""
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return digest[:12]


def validate_prompt(prompt: str, system_prompt: str) -> None:
    if not isinstance(prompt, str) or not prompt.strip():
        raise BrainValidationError("Prompt must be a non-empty string")
    if not isinstance(system_prompt, str) or not system_prompt.strip():
        raise BrainValidationError("System prompt must be a non-empty string")
    if len(prompt) > MAX_PROMPT_CHARS:
        raise BrainValidationError(f"Prompt exceeds {MAX_PROMPT_CHARS} characters")
    if len(system_prompt) > MAX_SYSTEM_PROMPT_CHARS:
        raise BrainValidationError(f"System prompt exceeds {MAX_SYSTEM_PROMPT_CHARS} characters")


def detect_prompt_injection(text: str) -> bool:
    normalized = (text or "").lower()
    return any(signal in normalized for signal in _PROMPT_INJECTION_SIGNALS)


def redact_text(value: str | None) -> str:
    text = str(value or "")
    text = _AUTH_HEADER_RE.sub(r"\1[REDACTED]", text)
    text = _SENSITIVE_KEY_RE.sub(r"\1[REDACTED]", text)
    text = _TOKEN_RE.sub("[REDACTED_TOKEN]", text)
    text = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    text = _PHONE_RE.sub("[REDACTED_PHONE]", text)
    return text


def _sanitize_recursive(value: Any, key: str | None = None) -> Any:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for k, v in value.items():
            k_str = str(k)
            if any(x in k_str.lower() for x in ("password", "secret", "token", "api_key", "authorization")):
                sanitized[k_str] = "[REDACTED]"
            else:
                sanitized[k_str] = _sanitize_recursive(v, key=k_str)
        return sanitized

    if isinstance(value, list):
        return [_sanitize_recursive(item, key=key) for item in value]

    if isinstance(value, str):
        return redact_text(value)

    return value


def sanitize_context(context: dict[str, Any] | None) -> dict[str, Any] | None:
    if context is None:
        return None
    return _sanitize_recursive(context)


def safe_json_excerpt(value: Any, limit: int = 240) -> str:
    try:
        raw = json.dumps(value, default=str, ensure_ascii=True)
    except Exception:
        raw = str(value)
    redacted = redact_text(raw)
    if len(redacted) <= limit:
        return redacted
    return redacted[: limit - 3] + "..."
