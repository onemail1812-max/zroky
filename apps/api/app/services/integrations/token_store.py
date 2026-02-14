from __future__ import annotations

import base64
import json
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet

from app.config import settings


def _get_fernet() -> Fernet:
    key_hex = settings.oauth_encryption_key
    key_bytes = bytes.fromhex(key_hex)
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_token(token: Dict[str, Any]) -> str:
    raw = json.dumps(token, default=str).encode("utf-8")
    return _get_fernet().encrypt(raw).decode("utf-8")


def decrypt_token(token_encrypted: str) -> Dict[str, Any]:
    raw = _get_fernet().decrypt(token_encrypted.encode("utf-8"))
    return json.loads(raw.decode("utf-8"))


def try_decrypt(token_encrypted: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token_encrypted:
        return None
    try:
        return decrypt_token(token_encrypted)
    except Exception:
        return None
