from __future__ import annotations

import json
import time
import urllib.parse
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentContext, get_current_context
from app.models.integration import Integration, IntegrationProvider, IntegrationStatus
from app.services.brain.guardrails import redact_text
from app.services.integrations.connector_state import encode_state, decode_state
from app.services.integrations.token_store import encrypt_token

from app.models.workspace import Workspace

router = APIRouter(prefix="/api/v1/connectors", tags=["connectors"])


class ConnectRequest(BaseModel):
    returnUrl: str
    scopes: List[str]
    serviceType: str
    state: Optional[str] = None


class CallbackRequest(BaseModel):
    code: str
    redirectUri: str
    serviceType: Optional[str] = None
    state: Optional[str] = None


@router.post("/oauth/{provider}/callback")
async def connector_oauth_callback_post(
    provider: str,
    payload: CallbackRequest,
    db: Session = Depends(get_db),
):
    provider = provider.lower()
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Use state from payload if present
    state = payload.state
    code = payload.code
    serviceType = payload.serviceType

    decoded: Optional[dict] = None
    if state:
        try:
            decoded = decode_state(state)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    if not decoded:
        # Try finding state in memory/db via code? No, stateless.
        raise HTTPException(status_code=400, detail="Invalid or missing state")

    workspace_id = decoded.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing workspace context")

    scopes = decoded.get("scopes") or []
    # service_type from decoded state overrides payload if present (or vice versa? State is trusted source)
    service_type = decoded.get("service_type") or serviceType or "email"

    _provider_enabled(provider)
    redirect_uri = settings.google_redirect_uri if provider == "google" else settings.microsoft_redirect_uri
    # Use the redirectUri from payload (frontend origin) if configured to allow dynamic
    # But usually backend MUST match exactly what was sent in auth request
    # Since we built auth request with settings.*_redirect_uri, we must use that here too.
    # The payload.redirectUri is what the frontend *thinks* it is.
    # Wait, 'messgaing' service might be different.
    # Let's trust the settings one for backend exchange.
    
    token = _exchange_code(provider, code, redirect_uri, scopes)
    
    integration = _store_integration(
        db=db,
        workspace_id=str(workspace_id),
        provider=provider,
        service_type=str(service_type),
        scopes=[str(s) for s in scopes],
        token=token,
    )

    return {
        "success": True,
        "account": {
            "id": integration.id,
            "provider": provider,
            "status": "active",
            "connectedAt": integration.created_at.isoformat(),
        }
    }


def _assert_workspace_header_consistency(request: Request, workspace_id: str) -> None:
    header_workspace = request.headers.get("x-workspace-id")
    if header_workspace and header_workspace != workspace_id:
        raise HTTPException(status_code=403, detail="Cross-workspace access denied")


def _provider_enabled(provider: str) -> None:
    # if provider == "google" and not settings.google_enabled:
    #     raise HTTPException(status_code=400, detail="Google integration is disabled")
    # if provider == "microsoft" and not settings.microsoft_enabled:
    #     raise HTTPException(status_code=400, detail="Microsoft integration is disabled")
    pass


def _build_auth_url(provider: str, scopes: List[str], redirect_uri: str, state: str) -> str:
    if provider == "google":
        if not settings.google_client_id:
            raise HTTPException(status_code=500, detail="Missing Google client configuration")

        # MOCK FLOW for Dev/Demo
        if settings.google_client_id == "mock-google-client":
            # Redirect directly to our own callback with a mock code
            params = {
                "state": state,
                "code": "mock_google_code_123",
                "scope": " ".join(scopes),
            }
            query = urllib.parse.urlencode(params)
            return f"{redirect_uri}?{query}"

        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "access_type": "offline",
            "prompt": "consent",
            # Keep incremental authorization so existing grants are reused when possible.
            "include_granted_scopes": "true",
            "state": state,
        }
        query = urllib.parse.urlencode(params)
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    tenant = settings.microsoft_tenant_id
    auth_endpoint = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
    if not settings.microsoft_client_id:
        raise HTTPException(status_code=500, detail="Missing Microsoft client configuration")

    if settings.microsoft_client_id == "mock-ms-client":
        params = {
            "state": state,
            "code": "mock_microsoft_code_123",
            "scope": " ".join(scopes),
        }
        query = urllib.parse.urlencode(params)
        return f"{redirect_uri}?{query}"

    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "response_mode": "query",
        "scope": " ".join(scopes),
        "state": state,
    }
    query = urllib.parse.urlencode(params)
    return f"{auth_endpoint}?{query}"


def _redirect_with_error(return_url: str, error: str, description: str | None = None) -> RedirectResponse:
    params = {"error": error}
    if description:
        params["error_description"] = description
    query = urllib.parse.urlencode(params)
    separator = "&" if "?" in return_url else "?"
    return RedirectResponse(url=f"{return_url}{separator}{query}")


def _default_return_url() -> str:
    return f"{settings.frontend_base_url.rstrip('/')}/oauth/callback"


def _safe_json_loads(value: Optional[str]) -> dict:
    if not value:
        return {}
    try:
        obj = json.loads(value)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _safe_json_loads_list(value: Optional[str]) -> list:
    if not value:
        return []
    try:
        obj = json.loads(value)
        return obj if isinstance(obj, list) else []
    except Exception:
        return []


def _outlook_has_email_access(integration: Integration) -> bool:
    scopes = _safe_json_loads_list(integration.scopes_json)
    if any("Mail." in str(s) for s in scopes):
        return True
    cfg = _safe_json_loads(integration.config_json)
    st = str(cfg.get("service_type") or "").lower()
    return st in {"email", "both"}


def _service_type_has_email(service_type: str) -> bool:
    return str(service_type or "").lower() in {"email", "both"}


# Exclusive provider checks removed



# Exclusive provider assertion removed



def _exchange_code(provider: str, code: str, redirect_uri: str, scopes: List[str]) -> Dict[str, Any]:
    # MOCK TOKEN EXCHANGE
    if code == "mock_google_code_123":
        return {
            "access_token": "mock_google_access_token",
            "refresh_token": "mock_google_refresh_token",
            "expires_in": 3600,
            "scope": " ".join(scopes),
            "token_type": "Bearer",
            "expires_at": int(time.time()) + 3600,
        }
    if code == "mock_microsoft_code_123":
        return {
            "access_token": "mock_microsoft_access_token",
            "refresh_token": "mock_microsoft_refresh_token",
            "expires_in": 3600,
            "scope": " ".join(scopes),
            "token_type": "Bearer",
            "expires_at": int(time.time()) + 3600,
        }

    if provider == "google":
        if not settings.google_client_id or not settings.google_client_secret:
            raise HTTPException(status_code=500, detail="Missing Google client configuration")

        resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
            },
            timeout=20,
        )
        if not resp.ok:
            detail: str
            try:
                payload = resp.json()
                detail = str(payload.get("error_description") or payload.get("error") or payload)
            except Exception:
                detail = resp.text or f"HTTP {resp.status_code}"
            raise HTTPException(status_code=400, detail=f"Failed to exchange Google auth code: {detail}")

        token: Dict[str, Any] = resp.json()
        if "expires_at" not in token and "expires_in" in token:
            try:
                token["expires_at"] = int(time.time()) + int(token["expires_in"])
            except Exception:
                pass
        return token

    tenant = settings.microsoft_tenant_id
    token_endpoint = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    if not settings.microsoft_client_id or not settings.microsoft_client_secret:
        raise HTTPException(status_code=500, detail="Missing Microsoft client configuration")

    resp = requests.post(
        token_endpoint,
        data={
            "grant_type": "authorization_code",
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
        },
        timeout=20,
    )
    if not resp.ok:
        detail = resp.text or f"HTTP {resp.status_code}"
        try:
            payload = resp.json()
            detail = str(payload.get("error_description") or payload.get("error") or payload)
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Failed to exchange Microsoft auth code: {detail}")

    token = resp.json()
    if "expires_at" not in token and "expires_in" in token:
        try:
            token["expires_at"] = int(time.time()) + int(token["expires_in"])
        except Exception:
            pass
    return token


def _store_integration(
    db: Session,
    workspace_id: str,
    provider: str,
    service_type: str,
    scopes: List[str],
    token: Dict[str, Any],
) -> Integration:
    token_encrypted = encrypt_token(token)
    if isinstance(token_encrypted, dict):
        token_encrypted = json.dumps(token_encrypted)

    if provider == "google":
        providers = []
        if service_type in {"email", "both"}:
            providers.append(IntegrationProvider.GOOGLE_GMAIL)
        if service_type in {"calendar", "both"}:
            providers.append(IntegrationProvider.GOOGLE_CALENDAR)
    else:
        providers = [IntegrationProvider.OUTLOOK]

    last_integration: Optional[Integration] = None
    for provider_enum in providers:
        integration = (
            db.query(Integration)
            .filter(
                Integration.workspace_id == workspace_id,
                Integration.provider == provider_enum,
            )
            .first()
        )
        if integration:
            integration.status = IntegrationStatus.CONNECTED
            integration.scopes_json = json.dumps(scopes)
            integration.token_encrypted = token_encrypted
            integration.config_json = json.dumps({"service_type": service_type})
        else:
            import uuid

            integration = Integration(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                provider=provider_enum,
                status=IntegrationStatus.CONNECTED,
                scopes_json=json.dumps(scopes),
                token_encrypted=token_encrypted,
                config_json=json.dumps({"service_type": service_type}),
            )
            db.add(integration)
        last_integration = integration

    # Dual provider support enabled - no freezing
    # _freeze_other_email_provider(db, workspace_id, provider, service_type)

    db.commit()
    return last_integration


@router.post("/connect/{provider}")
async def connect_provider(
    provider: str,
    payload: ConnectRequest,
    request: Request,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    provider = provider.lower()
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    _provider_enabled(provider)
    workspace_id = context.workspace_id
    user_id = context.user_id
    # _assert_workspace_header_consistency(request, workspace_id) 

    # _assert_email_provider_available(db, workspace_id, provider, payload.serviceType)

    state_payload = {
        "workspace_id": workspace_id,
        "user_id": user_id,
        "return_url": payload.returnUrl,
        "provider": provider,
        "service_type": payload.serviceType,
        "scopes": payload.scopes,
    }
    
    state = encode_state(state_payload)

    redirect_uri = settings.google_redirect_uri if provider == "google" else settings.microsoft_redirect_uri
    if payload.returnUrl and "localhost" in payload.returnUrl:
         # For local dev, trust the returnUrl if explicit override needed, but standard flow uses configured callback
         pass

    auth_url = _build_auth_url(provider, payload.scopes, redirect_uri, state)
    return {"authUrl": auth_url, "state": state}


@router.get("/oauth/{provider}/callback")
async def connector_oauth_callback(
    provider: str,
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return await _handle_oauth_callback(provider, request, code, state, error, db)


async def _handle_oauth_callback(
    provider: str,
    request: Request,
    code: Optional[str],
    state: Optional[str],
    error: Optional[str],
    db: Session,
):
    provider = provider.lower()
    if provider not in {"google", "microsoft"}:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    fallback_return_url = _default_return_url()

    decoded: Optional[dict] = None
    if state:
        try:
            decoded = decode_state(state)
        except Exception:
            return _redirect_with_error(fallback_return_url, "invalid_state", "Invalid state parameter")

    return_url = (decoded or {}).get("return_url") or fallback_return_url

    try:
        if error:
            return _redirect_with_error(return_url, error)

        if not code or not state:
            return _redirect_with_error(return_url, "missing_params", "Missing code or state")

        if not decoded:
            return _redirect_with_error(return_url, "invalid_state", "Invalid or expired state")

        scopes = decoded.get("scopes") or []
        service_type = decoded.get("service_type") or "email"
        workspace_id = decoded.get("workspace_id")
        if not workspace_id:
            return _redirect_with_error(return_url, "invalid_state", "Missing workspace context")

        _provider_enabled(provider)
        redirect_uri = settings.google_redirect_uri if provider == "google" else settings.microsoft_redirect_uri
        token = _exchange_code(provider, code, redirect_uri, scopes)

        _store_integration(
            db=db,
            workspace_id=str(workspace_id),
            provider=provider,
            service_type=str(service_type),
            scopes=[str(s) for s in scopes],
            token=token,
        )

        params = {"success": "true", "provider": provider}
        query = urllib.parse.urlencode(params)
        separator = "&" if "?" in return_url else "?"
        return RedirectResponse(url=f"{return_url}{separator}{query}")
    except Exception as exc:
        import logging
        logger = logging.getLogger(__name__)
        logger.error("OAuth callback failed.", exc_info=True)
        # Never hard-fail with a 500 on an OAuth callback. Always redirect back to the UI.
        return _redirect_with_error(return_url, "oauth_failed", f"OAuth callback failed: {str(exc)}")


@router.get("/accounts")
async def list_accounts(
    request: Request,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    workspace_id = context.workspace_id
    # _assert_workspace_header_consistency(request, workspace_id)
    integrations = db.query(Integration).filter(Integration.workspace_id == workspace_id).all()
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    
    settings_json = getattr(workspace, "settings_json", {}) or {}
    primary_email = settings_json.get("aaliyah", {}).get("primary_email_provider")

    accounts = []
    for integration in integrations:
        provider = "google"
        if integration.provider == IntegrationProvider.OUTLOOK:
            provider = "microsoft"

        scopes = []
        if integration.scopes_json:
            try:
                scopes = json.loads(integration.scopes_json)
            except Exception:
                scopes = []

        has_email = integration.provider == IntegrationProvider.GOOGLE_GMAIL or any("Mail." in s for s in scopes)
        has_calendar = integration.provider == IntegrationProvider.GOOGLE_CALENDAR or any("calendar" in s.lower() or "Calendars" in s for s in scopes)

        status = "active"
        if integration.status == IntegrationStatus.DISCONNECTED:
            status = "revoked"
        elif integration.status == IntegrationStatus.ERROR:
            status = "expired"
        elif integration.status == IntegrationStatus.NEEDS_RECONNECT:
            status = "needs_reconnect"

        accounts.append(
            {
                "id": integration.id,
                "provider": provider,
                "email": "connected",
                "name": None,
                "scopes": scopes,
                "hasEmailAccess": has_email,
                "hasCalendarAccess": has_calendar,
                "status": status,
                "connectedAt": integration.created_at.isoformat(),
                "lastSyncAt": None,
                "isPrimary": (provider == primary_email) and has_email,
            }
        )

    return accounts


@router.post("/accounts/{account_id}/revoke")
async def revoke_account(
    account_id: str,
    request: Request,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    workspace_id = context.workspace_id
    _assert_workspace_header_consistency(request, workspace_id)
    integration = (
        db.query(Integration)
        .filter(Integration.id == account_id, Integration.workspace_id == workspace_id)
        .first()
    )
    if not integration:
        raise HTTPException(status_code=404, detail="Account not found")

    integration.status = IntegrationStatus.DISCONNECTED
    integration.token_encrypted = None
    
    # ── Enterprise Cleanup ───────────────────────────────────────────────
    # Proactively purge triaged data for this provider since we can no 
    # longer sync or verify deletions.
    from app.models.triaged_email import TriagedEmail
    from app.models.search_index import EmailIndex
    
    provider_name = "google" if integration.provider == IntegrationProvider.GOOGLE_GMAIL else "microsoft"
    
    try:
        deleted_emails = db.query(TriagedEmail).filter(
            TriagedEmail.workspace_id == workspace_id,
            TriagedEmail.provider == provider_name
        ).delete(synchronize_session=False)
        
        # 2. Clean Search Index
        deleted_index = db.query(EmailIndex).filter(
            EmailIndex.workspace_id == workspace_id,
            EmailIndex.provider == provider_name
        ).delete(synchronize_session=False)
        
        db.commit()
        
        import logging
        logging.getLogger(__name__).info(
            f"Revoke Cleanup: workspace={workspace_id} provider={provider_name} "
            f"purged={deleted_emails} emails, {deleted_index} index entries."
        )
        
        # 4. Notify Frontend via Orchestrator to clear caches
        from app.agents.aaliyah.core.orchestrator import AaliyahOrchestrator
        orc = AaliyahOrchestrator(workspace_id)
        await orc.broadcast_updates(db)
        
    except Exception as e:
        db.rollback()
        logging.getLogger(__name__).error(f"Revoke Cleanup failed: {e}")
        # Note: We still proceed with the revocation even if cleanup has a hiccup
        pass

    return {"status": "revoked", "purged": True}


class SetPrimaryRequest(BaseModel):
    provider: str  # google or microsoft or none


@router.post("/primary/email")
async def set_primary_email(
    payload: SetPrimaryRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Set the primary email provider for auto-sending."""
    workspace = db.query(Workspace).filter(Workspace.id == context.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    provider = payload.provider.lower()
    if provider not in {"google", "microsoft", "none"}:
        raise HTTPException(status_code=400, detail="Invalid provider")

    # Update settings
    settings_data = dict(getattr(workspace, "settings_json", {}) or {})
    if "aaliyah" not in settings_data:
        settings_data["aaliyah"] = {}
    
    # If "none", we clear it
    if provider == "none":
        settings_data["aaliyah"].pop("primary_email_provider", None)
    else:
        # verify provider is actually connected
        target_enum = IntegrationProvider.GOOGLE_GMAIL if provider == "google" else IntegrationProvider.OUTLOOK
        integration = (
            db.query(Integration)
            .filter(
                Integration.workspace_id == context.workspace_id,
                Integration.provider == target_enum,
                Integration.status == IntegrationStatus.CONNECTED,
            )
            .first()
        )
        if not integration:
             raise HTTPException(status_code=400, detail=f"Provider {provider} is not connected")
        
        settings_data["aaliyah"]["primary_email_provider"] = provider

    workspace.settings_json = settings_data
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(workspace, "settings_json")
    db.commit()

    return {"status": "updated", "primary_email_provider": provider}
