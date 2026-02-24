from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.agents.aaliyah.api.connectors import _handle_oauth_callback

from app.core.limiter import limiter
router = APIRouter(prefix="/oauth", tags=["oauth"])


@router.get("/google/callback")
@limiter.limit("20/minute")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    return await _handle_oauth_callback("google", request, code, state, error, db)


@router.get("/microsoft/callback")
@limiter.limit("20/minute")
async def microsoft_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    return await _handle_oauth_callback("microsoft", request, code, state, error, db)
