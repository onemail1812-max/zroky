"""
OAuth Service Implementation
Handles Google (Gmail/Calendar) and Microsoft (Outlook) OAuth flows.
Features:
- Encrypted Token Storage
- Automatic Refresh (not implemented)
"""

import json
import logging
import time
from typing import Dict, Any, Optional

from requests_oauthlib import OAuth2Session
from sqlalchemy.orm import Session

from app.config import settings
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.integrations.token_store import encrypt_token, try_decrypt

logger = logging.getLogger(__name__)


class OAuthService:
    def __init__(self, db: Session):
        self.db = db

    def get_google_auth_url(self, workspace_id: str, redirect_uri: str, scopes: list[str]) -> str:
        """Generate Google Consent Screen URL"""
        if not settings.google_enabled:
            raise ValueError("Google integration is disabled")

        google = OAuth2Session(settings.google_client_id, scope=scopes, redirect_uri=redirect_uri)
        authorization_url, state = google.authorization_url(
            "https://accounts.google.com/o/oauth2/v2/auth",
            access_type="offline",
            prompt="consent",
        )
        return authorization_url

    def exchange_google_code(self, code: str, redirect_uri: str, workspace_id: str, scopes: list[str]) -> Dict[str, Any]:
        """Exchange auth code for tokens"""
        google = OAuth2Session(settings.google_client_id, redirect_uri=redirect_uri, scope=scopes)
        token = google.fetch_token(
            "https://oauth2.googleapis.com/token",
            client_secret=settings.google_client_secret,
            code=code,
        )

        self._store_token(workspace_id, "google", token, scopes)
        return token

    def _store_token(self, workspace_id: str, provider: str, token: Dict[str, Any], scopes: list[str]):
        """Save encrypted token to DB"""
        token_encrypted = encrypt_token(token)

        providers = []
        if provider == "google":
            providers = [IntegrationProvider.GOOGLE_GMAIL, IntegrationProvider.GOOGLE_CALENDAR]
        else:
            providers = [IntegrationProvider.OUTLOOK]

        for provider_enum in providers:
            integration = self.db.query(Integration).filter(
                Integration.workspace_id == workspace_id,
                Integration.provider == provider_enum,
            ).first()

            if integration:
                integration.token_encrypted = token_encrypted
                integration.scopes_json = json.dumps(scopes)
                integration.status = IntegrationStatus.CONNECTED
            else:
                import uuid

                integration = Integration(
                    id=str(uuid.uuid4()),
                    workspace_id=workspace_id,
                    provider=provider_enum,
                    status=IntegrationStatus.CONNECTED,
                    scopes_json=json.dumps(scopes),
                    token_encrypted=token_encrypted,
                )
                self.db.add(integration)

        self.db.commit()

    def get_valid_token(self, workspace_id: str, provider: str) -> Optional[Dict[str, Any]]:
        """Retrieve and automatically refresh token if needed (refresh not implemented)"""
        provider_enum = IntegrationProvider.OUTLOOK
        if provider == "google":
            provider_enum = IntegrationProvider.GOOGLE_GMAIL

        integration = self.db.query(Integration).filter(
            Integration.workspace_id == workspace_id,
            Integration.provider == provider_enum,
        ).first()

        if not integration or not integration.token_encrypted:
            return None

        token = try_decrypt(integration.token_encrypted)
        if not token:
            return None

        if token.get("expires_at") and time.time() > token["expires_at"] - 60:
            logger.info(f"Token expired for {provider}. Refresh not implemented.")
        return token
