"""Custom CSRF protection middleware for Zroky API."""
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from app.config import settings

logger = logging.getLogger(__name__)

class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Enforces basic CSRF protection for state-changing methods.
    
    Since the API primarily uses Bearer tokens (safe from traditional CSRF),
    this middleware adds defense-in-depth by:
    1. Verifying the Origin/Referer header matches allowed CORS origins.
    2. Requiring a custom header (X-Zroky-CSRF) for all non-safe methods (POST, PUT, DELETE, PATCH).
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 1. Allow safe methods
        if request.method in ("GET", "HEAD", "OPTIONS", "TRACE"):
            return await call_next(request)

        # 2. Skip for public webhooks if any (e.g., Stripe, Clerk)
        if request.url.path.startswith("/api/webhooks"):
            return await call_next(request)

        # 3. Check for custom CSRF header
        # In a Bearer token architecture, the presence of any custom header 
        # is enough to prevent simple <form> or <a> based CSRF attacks.
        csrf_header = request.headers.get("X-Zroky-CSRF")
        
        # Development override: allow if DEBUG and no header provided (for easy testing)
        # However, we should encourage the header even in dev.
        if not csrf_header:
            logger.warning("CSRF Attempt: Missing X-Zroky-CSRF header for %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "csrf_error",
                        "message": "CSRF protection triggered: X-Zroky-CSRF header missing."
                    }
                }
            )

        # 4. Origin validation (Defense-in-depth)
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        if origin:
            is_allowed = False
            for allowed in settings.CORS_ORIGINS:
                if origin.startswith(allowed):
                    is_allowed = True
                    break
            
            if not is_allowed and settings.ENV == "production":
                logger.warning("CSRF Attempt: Origin %s not in allowed CORS_ORIGINS", origin)
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": {
                            "code": "csrf_error",
                            "message": f"CSRF protection triggered: Origin {origin} not allowed."
                        }
                    }
                )

        return await call_next(request)
