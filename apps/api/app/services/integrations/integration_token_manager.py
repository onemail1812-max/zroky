from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, Optional

import requests
from sqlalchemy.orm import Session

from app.config import settings
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.brain.guardrails import redact_text
from app.services.integrations.token_store import encrypt_token, try_decrypt
from app.services.integrations.safe_requester import SafeRequester

logger = logging.getLogger(__name__)


class IntegrationTokenManager:
    """
    Workspace-scoped token retrieval + refresh.

    The connectors service stores OAuth tokens encrypted in `integrations.token_encrypted`.
    This helper returns a valid (fresh) token dict for downstream provider clients.
    """

    def __init__(self, db: Session):
        self.db = db
        self.http = SafeRequester()

    def get_valid_token(self, workspace_id: str, provider: IntegrationProvider) -> Optional[Dict[str, Any]]:
        integration = (
            self.db.query(Integration)
            .filter(
                Integration.workspace_id == workspace_id,
                Integration.provider == provider,
                Integration.status == IntegrationStatus.CONNECTED,
            )
            .first()
        )
        if not integration or not integration.token_encrypted:
            return None

        token = try_decrypt(integration.token_encrypted)
        if not token or not isinstance(token, dict):
            return None

        # Refresh if token is expiring/expired. Use a small skew to avoid races.
        expires_at = token.get("expires_at")
        if isinstance(expires_at, (int, float)) and time.time() > float(expires_at) - 60:
            refreshed = self._refresh_token(integration, token)
            if refreshed:
                token = refreshed

        return token

    def get_integration(self, workspace_id: str, provider: IntegrationProvider) -> Optional[Integration]:
        return (
            self.db.query(Integration)
            .filter(
                Integration.workspace_id == workspace_id,
                Integration.provider == provider,
                Integration.status == IntegrationStatus.CONNECTED,
            )
            .first()
        )

    def get_config(self, workspace_id: str, provider: IntegrationProvider) -> Dict[str, Any]:
        integration = self.get_integration(workspace_id, provider)
        if not integration or not integration.config_json:
            return {}
        try:
            return json.loads(integration.config_json)
        except Exception:
            return {}

    def update_config(self, workspace_id: str, provider: IntegrationProvider, updates: Dict[str, Any]):
        integration = self.get_integration(workspace_id, provider)
        if not integration:
            return
        
        current = {}
        if integration.config_json:
            try:
                current = json.loads(integration.config_json)
            except Exception:
                current = {}
        
        current.update(updates)
        integration.config_json = json.dumps(current)
        self.db.commit()

    def refresh_integration_token(self, integration: Integration) -> Optional[Dict[str, Any]]:
        """Force refresh of the integration token."""
        token = try_decrypt(integration.token_encrypted)
        if not token: 
            return None
        return self._refresh_token(integration, token)

    def _refresh_token(self, integration: Integration, token: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        provider = integration.provider
        refresh_token = token.get("refresh_token")
        if not refresh_token:
            return None

        try:
            if provider in {IntegrationProvider.GOOGLE_GMAIL, IntegrationProvider.GOOGLE_CALENDAR}:
                updated = self._refresh_google(refresh_token)
            elif provider == IntegrationProvider.OUTLOOK:
                updated = self._refresh_microsoft(refresh_token, integration.scopes_json)
            else:
                return None
        except Exception as exc:
            logger.warning("Token refresh failed for %s: %s", provider, redact_text(str(exc)))
            return None

        if not isinstance(updated, dict) or not updated.get("access_token"):
            return None

        # Merge, preserving existing refresh_token if the provider doesn't return one.
        merged: Dict[str, Any] = dict(token)
        merged.update(updated)
        if not merged.get("refresh_token"):
            merged["refresh_token"] = refresh_token

        # Normalize expires_at.
        expires_in = merged.get("expires_in")
        if isinstance(expires_in, (int, float)):
            merged["expires_at"] = time.time() + float(expires_in)

        # Persist back encrypted.
        integration.token_encrypted = encrypt_token(merged)
        self.db.commit()
        return merged

    def _refresh_google(self, refresh_token: str) -> Dict[str, Any]:
        if not settings.google_client_id or not settings.google_client_secret:
            raise ValueError("Google OAuth settings missing")

        resp = self.http.post(
            "https://oauth2.googleapis.com/token",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()

    def _refresh_microsoft(self, refresh_token: str, scopes_json: Optional[str]) -> Dict[str, Any]:
        if not settings.microsoft_client_id or not settings.microsoft_client_secret:
            raise ValueError("Microsoft OAuth settings missing")

        tenant = settings.microsoft_tenant_id
        token_endpoint = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
        scopes = []
        if scopes_json:
            try:
                scopes = json.loads(scopes_json)
            except Exception:
                scopes = []

        scope_str = " ".join([str(s) for s in scopes]) if scopes else "offline_access Mail.ReadWrite"

        resp = self.http.post(
            token_endpoint,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "scope": scope_str,
            },
            timeout=15,
        )
        resp.raise_for_status()
    def mark_needs_reconnect(self, workspace_id: str, provider: IntegrationProvider):
        """Mark integration as needing user reconnection."""
        integration = (
            self.db.query(Integration)
            .filter(Integration.workspace_id == workspace_id, Integration.provider == provider)
            .first()
        )
        if integration:
            integration.status = IntegrationStatus.NEEDS_RECONNECT
            self.db.commit()
            logger.info(f"Marked integration {provider} for workspace {workspace_id} as NEEDS_RECONNECT")
