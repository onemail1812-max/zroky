"""Simplified config for robust startup."""
from __future__ import annotations
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AnyHttpUrl, validator
from typing import Optional, List

# Explicitly find .env
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    
    # ------------------
    # Environment Loading
    # ------------------
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # ------------------
    # Core Application
    # ------------------
    ENV: str = "development"
    APP_NAME: str = "Zroky API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    
    # Database
    DATABASE_URL: str = "sqlite:///./zroky.db"
    
    # Security (MUST BE SET IN PROD)
    SECRET_KEY: str = Field(default="dev-secret-key-change-me", min_length=16)
    OAUTH_ENCRYPTION_KEY: str = Field(..., description="32-byte hex string required for token encryption.")
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
    CORS_HEADERS: List[str] = [
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Forwarded-For",
    ]
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    
    # Auth
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CLERK_JWKS_URL: Optional[str] = None
    CLERK_JWT_ISS: Optional[str] = None
    CLERK_JWT_AUD: Optional[str] = None

    # ------------------
    # LLM Services (OpenRouter / Custom Brain)
    # ------------------
    OPENROUTER_API_KEY: Optional[str] = Field(None, description="Optional if using custom Brain.")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_APP_URL: str = "http://localhost:3000"
    OPENROUTER_APP_NAME: str = "Aaliyah AI"
    
    # Models
    AALIYAH_DRAFT_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    AALIYAH_REASONING_MODEL: str = "arcee-ai/trinity-large-preview:free"
    AALIYAH_VERIFY_MODEL: str = "deepseek/deepseek-r1:free"
    BRAIN_MODEL: str = "groq/llama-3.1-8b-instant"
    BRAIN_API_KEY: Optional[str] = Field(None, description="Primary key for Intelligence.")
    GROQ_API_KEY: Optional[str] = Field(None, description="Groq API key for fast inference.")
    OPENROUTER_EMBEDDING_MODEL: str = "openai/text-embedding-3-small"

    # ------------------
    # Integrations (OAuth)
    # ------------------
    GOOGLE_ENABLED: bool = False
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/oauth/google/callback"
    GOOGLE_SCOPES: List[str] = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/calendar",
    ]

    MICROSOFT_ENABLED: bool = False
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: str = "common"
    MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/oauth/microsoft/callback"
    MICROSOFT_SCOPES: List[str] = [
        "openid", "profile", "email", "User.Read", "offline_access",
        "Mail.ReadWrite", "Mail.Send", "MailboxSettings.ReadWrite",
        "Calendars.Read", "Calendars.ReadWrite",
    ]

    # Sync Loop
    SYNC_INTERVAL: int = 120

    # ------------------
    # Queue
    # ------------------
    REDIS_URL: str = "redis://localhost:6379/0"

    # ------------------
    # Validations & Defaults
    # ------------------
    @validator("OAUTH_ENCRYPTION_KEY", pre=True, always=True)
    def validate_encryption_key(cls, v, values):
        import re, secrets, logging
        _log = logging.getLogger("app.config")

        if not v or (isinstance(v, str) and v.strip() == ""):
            # In debug/dev mode, auto-generate a secure key instead of crashing
            if values.get("DEBUG"):
                generated = secrets.token_hex(32)
                _log.warning(
                    "OAUTH_ENCRYPTION_KEY is empty — auto-generated a temporary key. "
                    "Set a permanent 64-char hex key in .env for production."
                )
                return generated
            raise ValueError("OAUTH_ENCRYPTION_KEY must not be empty in production.")

        v = v.strip()

        # Must be valid hex characters only
        if not re.fullmatch(r"[0-9a-fA-F]+", v):
            raise ValueError("OAUTH_ENCRYPTION_KEY must contain only hex characters (0-9, a-f).")

        # Must be exactly 64 hex chars = 32 bytes (AES-256)
        if len(v) < 64:
            raise ValueError(
                f"OAUTH_ENCRYPTION_KEY is too short ({len(v)} chars). "
                f"Must be at least 64 hex characters (32 bytes). "
                f"Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )

        return v
    


# Instantiate global settings
settings = Settings()
