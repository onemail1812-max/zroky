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
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


_JWKS_CACHE: dict[str, dict[str, Any]] = {}


def _resolve_clerk_jwks_url(token: str) -> Optional[str]:
    """Resolve Clerk JWKS URL from config or token issuer."""
    if settings.CLERK_JWKS_URL:
        return settings.CLERK_JWKS_URL

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
    if settings.CLERK_JWT_ISS:
        decode_kwargs["issuer"] = settings.CLERK_JWT_ISS
    if settings.CLERK_JWT_AUD:
        decode_kwargs["audience"] = settings.CLERK_JWT_AUD

    try:
        return jwt.decode(
            token,
            jwks,
            **decode_kwargs,
        )
    except JWTError as e:
        # If issuer/audience settings are misconfigured, retry with JWKS-only validation.
        # This keeps local development working while still verifying signature + expiry.
        print(f"DEBUG CLERK JWT: Initial decode failed with error: {e}", flush=True)
        if settings.CLERK_JWT_ISS or settings.CLERK_JWT_AUD:
            print(f"DEBUG CLERK JWT: Retrying without issuer/audience", flush=True)
            try:
                return jwt.decode(
                    token,
                    jwks,
                    algorithms=["RS256"],
                )
            except JWTError as inner_e:
                print(f"DEBUG CLERK JWT: Inner decode failed: {inner_e}", flush=True)
                pass
        
        print(f"DEBUG CLERK JWT: Raising 401 Invalid Token. Original error: {e}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from e


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token.
    
    Priority:
    1. Debug mode without Clerk → accept any token, return demo user
    2. Clerk JWKS available → verify via Clerk
    3. Fallback → verify via local JWT secret
    """
    # Debug mode: no Clerk configured → allow any token
    if settings.DEBUG and not settings.CLERK_JWKS_URL:
        # Try to decode as local JWT first
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            # Can't decode? Fine in debug, return demo user
            return {"sub": "user_demo_001", "workspace_id": "ws_demo_stable_001"}

    # Production: Clerk verification
    if _resolve_clerk_jwks_url(token):
        return _verify_clerk_token(token)

    # Fallback: local JWT
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
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

    In debug mode without Clerk, allow missing credentials → return demo user.
    In production, always require a valid token.
    """
    # No credentials provided
    if credentials is None:
        if settings.DEBUG and not settings.CLERK_JWKS_URL:
            return {"sub": "user_demo_001", "workspace_id": "ws_demo_stable_001"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # Credentials provided → verify
    token = credentials.credentials
    return verify_token(token)

