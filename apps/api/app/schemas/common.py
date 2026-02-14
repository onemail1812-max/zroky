"""Common schemas."""
from typing import Optional
from pydantic import BaseModel


class PaginationParams(BaseModel):
    """Pagination parameters."""

    skip: int = 0
    limit: int = 100


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
