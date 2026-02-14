from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional

DEFAULT_STATE_TTL_SECONDS = 10 * 60


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _sign(secret: str, payload_b64: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(digest)


def encode_state(payload: Dict[str, Any], secret: str, ttl_seconds: int = DEFAULT_STATE_TTL_SECONDS) -> str:
    """
    Stateless OAuth state:
    - Base64url(JSON(payload + iat/nonce)) + '.' + Base64url(HMAC-SHA256)
    - Prevents in-memory state loss (reload/multi-worker) and tampering.
    """
    now = int(time.time())
    body = dict(payload)
    body["iat"] = now
    body["nonce"] = secrets.token_urlsafe(12)
    body["ttl"] = int(ttl_seconds)

    raw = json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(raw)
    sig_b64 = _sign(secret, payload_b64)
    return f"{payload_b64}.{sig_b64}"


def decode_state(state: str, secret: str, max_age_seconds: int = DEFAULT_STATE_TTL_SECONDS) -> Optional[Dict[str, Any]]:
    try:
        payload_b64, sig_b64 = state.split(".", 1)
    except ValueError:
        return None

    expected = _sign(secret, payload_b64)
    if not hmac.compare_digest(expected, sig_b64):
        return None

    try:
        raw = _b64url_decode(payload_b64)
        body = json.loads(raw.decode("utf-8"))
    except Exception:
        return None

    iat = body.get("iat")
    if not isinstance(iat, int):
        return None

    ttl = body.get("ttl")
    if not isinstance(ttl, int):
        ttl = max_age_seconds

    # Never allow unbounded or extremely long TTL via state.
    ttl = min(max_age_seconds, max(30, ttl))

    now = int(time.time())
    if now - iat > ttl:
        return None

    return body

