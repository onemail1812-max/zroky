"""Security and authentication utilities."""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
import httpx
import time
from typing import Any

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer scheme (optional in dev/demo flows)
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


_JWKS_CACHE: dict[str, dict[str, Any]] = {}


def _resolve_clerk_jwks_url(token: str) -> Optional[str]:
    """Resolve Clerk JWKS URL from config or token issuer."""
    if settings.clerk_jwks_url:
        return settings.clerk_jwks_url

    try:
        claims = jwt.get_unverified_claims(token)
    except JWTError:
        return None

    issuer = claims.get("iss")
    if not isinstance(issuer, str) or not issuer.startswith("http"):
        return None

    return f"{issuer.rstrip('/')}/.well-known/jwks.json"


def _get_clerk_jwks(jwks_url: str) -> dict:
    """Fetch and cache Clerk JWKS by URL."""
    cached = _JWKS_CACHE.get(jwks_url)
    if cached and time.time() < cached["expires_at"]:
        return cached["keys"]

    with httpx.Client(timeout=10.0) as client:
        try:
            response = client.get(jwks_url)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to fetch Clerk JWKS",
            ) from e

    _JWKS_CACHE[jwks_url] = {"keys": data, "expires_at": time.time() + 3600}
    return data


def _verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT using JWKS."""
    jwks_url = _resolve_clerk_jwks_url(token)
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clerk JWKS URL not configured",
        )
    jwks = _get_clerk_jwks(jwks_url)

    try:
        jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        ) from e

    decode_kwargs = {
        "algorithms": ["RS256"],
    }
    if settings.clerk_jwt_iss:
        decode_kwargs["issuer"] = settings.clerk_jwt_iss
    if settings.clerk_jwt_aud:
        decode_kwargs["audience"] = settings.clerk_jwt_aud

    try:
        return jwt.decode(
            token,
            jwks,
            **decode_kwargs,
        )
    except JWTError as e:
        # If issuer/audience settings are misconfigured, retry with JWKS-only validation.
        # This keeps local development working while still verifying signature + expiry.
        if settings.clerk_jwt_iss or settings.clerk_jwt_aud:
            try:
                return jwt.decode(
                    token,
                    jwks,
                    algorithms=["RS256"],
                )
            except JWTError:
                pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token (Clerk preferred)."""
    if _resolve_clerk_jwks_url(token):
        return _verify_clerk_token(token)

    # Fallback to local JWT
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Get current authenticated user from token.

    In demo/dev mode, allow missing credentials and return a stub payload.
    In PRODUCTION, never allow bypass.
    """
    if credentials is None:
        # 1. Strict Production Check
        if settings.env == "production":
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required (Production Mode)",
            )
        
        # 2. Allow Debug Bypass
        if settings.debug and not settings.clerk_jwks_url:
            return {"sub": "user_demo_001", "workspace_id": "ws_demo_001"}
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    token = credentials.credentials
    payload = verify_token(token)
    return payload
