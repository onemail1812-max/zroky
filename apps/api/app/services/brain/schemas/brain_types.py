"""Standardized schema definitions for the Brain service."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator, ConfigDict


class BrainConfig(BaseModel):
    """Runtime configuration for provider calls."""

    model: str = "deepseek/deepseek-r1"
    temperature: float = Field(default=0.2, ge=0.0, le=1.2)
    max_tokens: int = Field(default=1500, ge=64, le=16_384)
    timeout_seconds: int = Field(default=30, ge=3, le=120)
    stream_timeout_seconds: int = Field(default=60, ge=5, le=300)
    chunk_timeout_seconds: int = Field(default=10, ge=2, le=60)
    retry_count: int = Field(default=2, ge=0, le=5)
    retry_backoff_seconds: float = Field(default=0.5, ge=0.1, le=10.0)

    @field_validator("model")
    @classmethod
    def validate_model(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("model is required")
        return value.strip()


class BrainRequest(BaseModel):
    """Input contract for Brain.think."""
    model_config = ConfigDict(protected_namespaces=())

    prompt: str = Field(min_length=1, max_length=12_000)
    system_prompt: str = Field(min_length=1, max_length=4_000)
    context: Optional[Dict[str, Any]] = None
    images: Optional[list[str]] = Field(default=None, description="List of base64 encoded images or image URLs")
    model_override: Optional[str] = None
    temperature_override: Optional[float] = Field(default=None, ge=0.0, le=1.2)

    @field_validator("prompt", "system_prompt")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("value cannot be blank")
        return cleaned

    @field_validator("model_override")
    @classmethod
    def strip_model(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class BrainResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    content: str = Field(default="")
    usage: Dict[str, Any] = Field(default_factory=dict)
    model_used: str
    latency_ms: int = Field(ge=0)
    finish_reason: str = "stop"
