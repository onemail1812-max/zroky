"""Token store service — uses AES-GCM for secure storage."""
import json
from typing import Union, Dict, Any
from app.services.security.token_encryption import encrypt_token as aes_encrypt, decrypt_token as aes_decrypt

def encrypt_token(token: Union[str, Dict[str, Any]]) -> str:
    """Encrypt a token (string or dict) using AES-GCM."""
    if isinstance(token, dict):
        token = json.dumps(token)
    return aes_encrypt(token)

def decrypt_token(encrypted: str) -> str:
    """Decrypt a token using AES-GCM."""
    return aes_decrypt(encrypted)

def get_valid_token(db, workspace_id: str, provider: str) -> str | None:
    """
    Get a valid OAuth access token for a given provider.
    Handles decryption, expiration checking, and automatic refresh.
    """
    from app.models.integration import Integration, IntegrationProvider
    import time

    provider_map = {
        "google": [IntegrationProvider.GOOGLE_GMAIL, IntegrationProvider.GOOGLE_CALENDAR, "GOOGLE_GMAIL", "GOOGLE_CALENDAR"],
        "microsoft": [IntegrationProvider.OUTLOOK, "OUTLOOK"],
    }
    providers_to_check = provider_map.get(provider, [provider])

    integration = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.provider.in_(providers_to_check),
    ).first()

    if not integration or not integration.token_encrypted:
        return None

    raw = decrypt_token(integration.token_encrypted)
    if not raw:
        # Decryption failed (might be plaintext or wrong key)
        raw = integration.token_encrypted
    
    try:
        token_data = json.loads(raw)
    except Exception:
        # Fallback for plain tokens that are NOT JSON strings
        return raw

    if not isinstance(token_data, dict):
        return str(token_data)

    access_token = token_data.get("access_token")
    expires_at = token_data.get("expires_at")

    # Refresh if expired or expiring within 60 seconds
    if expires_at and int(expires_at) < int(time.time()) + 60:
        refresh_token = token_data.get("refresh_token")
        if refresh_token:
            new_token = _refresh_access_token(provider, refresh_token)
            if new_token:
                token_data["access_token"] = new_token["access_token"]
                if "expires_in" in new_token:
                    token_data["expires_at"] = int(time.time()) + int(new_token["expires_in"])
                if "refresh_token" in new_token:
                    token_data["refresh_token"] = new_token["refresh_token"]
                
                integration.token_encrypted = encrypt_token(token_data)
                db.commit()
                return token_data["access_token"]
    
    return access_token

def _refresh_access_token(provider: str, refresh_token: str) -> dict | None:
    """Connect to provider's OAuth endpoint to refresh the token."""
    import requests
    from app.config import settings
    
    # Normalize provider name for refresh checking
    p_norm = provider.lower()
    is_google = "google" in p_norm or "gmail" in p_norm
    is_microsoft = "microsoft" in p_norm or "outlook" in p_norm
    
    try:
        if is_google:
            resp = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                },
                timeout=15,
            )
        elif is_microsoft:
            resp = requests.post(
                f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                },
                timeout=15,
            )
        else:
            return None

        return resp.json() if resp.ok else None
    except Exception:
        return None
