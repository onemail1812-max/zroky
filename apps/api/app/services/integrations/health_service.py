"""
Unified Health Check Service for Aaliyah Integrations.
Handles deep verification of tokens, scopes, and provider connectivity.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import logging
import requests

from sqlalchemy.orm import Session
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.integrations.token_store import decrypt_token
from app.services.integrations.integration_token_manager import IntegrationTokenManager

logger = logging.getLogger(__name__)

class ConnectorHealthService:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        self.token_manager = IntegrationTokenManager(db)

    def get_detailed_health(self) -> Dict[str, Any]:
        """
        Returns the unified health status model:
        {
          "email": { connected, provider, status, last_sync_at, error_code },
          "calendar": { connected, provider, status, last_sync_at, error_code },
          "providers": { ...raw... } # Optional debug info
        }
        """
        
        # 1. Fetch all integrations for workspace
        integrations = self.db.query(Integration).filter(
            Integration.workspace_id == self.workspace_id
        ).all()

        # 2. Analyze Email Health
        email_health = self._analyze_service(integrations, "email")
        
        # 3. Analyze Calendar Health
        calendar_health = self._analyze_service(integrations, "calendar")

        return {
            "email": email_health,
            "calendar": calendar_health,
            # Legacy/Debug structure to keep frontend happy if needed, or for raw provider view
            "providers": {i.provider.value: self._get_raw_status(i) for i in integrations}
        }

    def _analyze_service(self, integrations: List[Integration], service_type: str) -> Dict[str, Any]:
        """
        Finds the primary integration for a service type and checks its health.
        """
        # Logic: Find the first connected integration that supports this service type.
        # Heuristic: Sort by status (CONNECTED first) to prioritize working accounts.
        
        candidates = [i for i in integrations if self._supports_service(i, service_type)]
        # Sort: CONNECTED comes before others.
        candidates.sort(key=lambda x: 0 if x.status == IntegrationStatus.CONNECTED else 1)
        
        candidate = candidates[0] if candidates else None
        
        if not candidate:
            return {
                "connected": False,
                "provider": None,
                "status": "NOT_CONNECTED",
                "last_sync_at": None,
                "error_code": "NO_INTEGRATION"
            }

        # Check Cache
        cached_status = self._get_cached_status(candidate)
        if cached_status:
            return cached_status

        # Verify the candidate
        status, code = self._verify_integration(candidate, service_type)
        
        result = {
            "connected": status == "OK",
            "provider": candidate.provider.value.lower(),
            "status": status,
            "last_sync_at": candidate.updated_at.isoformat() if candidate.updated_at else None,
            "error_code": code
        }
        
        # Update Cache
        self._set_cached_status(candidate, result)
        
        return result

    def _get_cached_status(self, integration: Integration) -> Optional[Dict[str, Any]]:
        # Simple caching using config_json
        if not integration.config_json:
            return None
        try:
            config = json.loads(integration.config_json)
            last_check = config.get("last_health_check")
            last_result = config.get("last_health_result")
            
            if last_check and last_result:
                check_time = datetime.fromisoformat(last_check)
                # Cache valid for 15 minutes
                if (datetime.utcnow() - check_time).total_seconds() < 900: 
                    return last_result
        except:
            return None
        return None

    def _set_cached_status(self, integration: Integration, result: Dict[str, Any]):
        try:
            config = json.loads(integration.config_json) if integration.config_json else {}
            config["last_health_check"] = datetime.utcnow().isoformat()
            config["last_health_result"] = result
            integration.config_json = json.dumps(config)
            self.db.add(integration)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to cache health status for {integration.id}: {e}")

    def _supports_service(self, integration: Integration, service_type: str) -> bool:
        provider = integration.provider
        scopes = self._get_scopes(integration)
        
        if service_type == "email":
            if provider == IntegrationProvider.GOOGLE_GMAIL:
                return any("gmail" in s for s in scopes)
            if provider == IntegrationProvider.OUTLOOK:
                return any("Mail" in s for s in scopes)
                
        if service_type == "calendar":
            if provider == IntegrationProvider.GOOGLE_GMAIL: # Often combined
                 return any("calendar" in s for s in scopes)
            if provider == IntegrationProvider.GOOGLE_CALENDAR:
                 return True
            if provider == IntegrationProvider.OUTLOOK:
                 return any("Calendars" in s for s in scopes)
                 
        return False

    def _get_scopes(self, integration: Integration) -> List[str]:
        if not integration.scopes_json:
            return []
        try:
            return json.loads(integration.scopes_json)
        except:
            return []

    def _verify_integration(self, integration: Integration, service_type: str) -> tuple[str, str]:
        """
        Returns (Status, ErrorCode)
        Status: OK, EXPIRED, REVOKED, SCOPE_MISSING, ERROR, RATE_LIMIT, NETWORK_ERROR
        """
        
        # 1. Status Check
        if integration.status == IntegrationStatus.NEEDS_RECONNECT:
            return "NEEDS_RECONNECT", "TOKEN_EXPIRED"

        # 2. Scope Check
        if not self._supports_service(integration, service_type):
            return "SCOPE_MISSING", "MISSING_REQUIRED_SCOPES"

        # 2. Token Check
        if not integration.token_encrypted:
            return "NOT_CONNECTED", "NO_TOKEN"

        try:
            # decrypt_token might fail
            token_data = decrypt_token(integration.token_encrypted)
            token = token_data.get("access_token")
            # refresh_token = token_data.get("refresh_token") # Unused here
            
            if not token:
                return "EXPIRED", "TOKEN_MISSING"

            # 3. API Reachability / Validation with Retry Strategy
            ping_result = self._ping_provider_with_retry(integration, token)
            
            if ping_result == "OK":
                return "OK", "HEALTHY"
            
            if ping_result == "RATE_LIMIT":
                return "RATE_LIMIT", "RATE_LIMIT_EXCEEDED"

            if ping_result == "NETWORK_ERROR":
                 return "NETWORK_ERROR", "NETWORK_TIMEOUT"

            if ping_result == "AUTH_ERROR":
                # If ping failed (401), try refresh
                logger.info(f"Ping failed (401) for {integration.provider}, attempting refresh...")
                refreshed = self.token_manager.refresh_integration_token(integration)
                if refreshed:
                    return "OK", "REFRESHED"
                else:
                    return "REVOKED", "REFRESH_FAILED"
            
            # Fallback for other errors
            return "ERROR", ping_result

        except Exception as e:
            logger.error(f"Health check error for {integration.id}: {e}")
            return "ERROR", "INTERNAL_ERROR"

    def _ping_provider_with_retry(self, integration: Integration, token: str) -> str:
        """
        Pings provider with retry logic for network/rate limits.
        Returns: OK, AUTH_ERROR, RATE_LIMIT, NETWORK_ERROR, or specific error string.
        """
        url = ""
        headers = {}
        
        if integration.provider == IntegrationProvider.GOOGLE_GMAIL:
            url = f"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={token}"
        elif integration.provider == IntegrationProvider.OUTLOOK:
             url = "https://graph.microsoft.com/v1.0/me"
             headers = {"Authorization": f"Bearer {token}"}
        else:
             return "OK" # Unknown provider assumed OK

        import time
        max_retries = 2 # Total 3 attempts
        
        for attempt in range(max_retries + 1):
            try:
                res = requests.get(url, headers=headers, timeout=5)
                
                if res.status_code == 200:
                    return "OK"
                
                if res.status_code == 401:
                    return "AUTH_ERROR"
                
                if res.status_code == 403:
                    # Check for rate limit vs permissions
                    # Google: 403 can be "insufficientPermissions" or "rateLimitExceeded"
                    content = res.text.lower()
                    if "insufficient" in content or "scope" in content:
                        return "MISSING_REQUIRED_SCOPES" # Should have been caught by local check, but maybe revoked remotely
                    if "rate" in content or "limit" in content or "quota" in content:
                         if attempt < max_retries:
                             time.sleep(1 * (attempt + 1)) # Backoff
                             continue
                         return "RATE_LIMIT"
                    return "ACCESS_DENIED" # Generic 403

                if res.status_code == 429:
                    if attempt < max_retries:
                         time.sleep(1 * (attempt + 1))
                         continue
                    return "RATE_LIMIT"

                if res.status_code >= 500:
                    return "PROVIDER_DOWN"

                # Other 4xx
                return f"API_ERROR_{res.status_code}"

            except requests.exceptions.Timeout:
                 if attempt < max_retries:
                     continue
                 return "NETWORK_ERROR"
            except requests.exceptions.ConnectionError:
                 if attempt < max_retries:
                     continue
                 return "NETWORK_ERROR"
            except Exception as e:
                return f"UNKNOWN_ERROR"
        
        return "UNKNOWN_ERROR"

    def _get_raw_status(self, integration: Integration) -> str:
        # Helper for the legacy providers dict
        status, _ = self._verify_integration(integration, "email") # default check
        return status
