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
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    
    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

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

    MICROSOFT_ENABLED: bool = False
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: str = "common"
    MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/oauth/microsoft/callback"

    # Sync Loop
    SYNC_INTERVAL: int = 120

    # ------------------
    # Queue
    # ------------------
    REDIS_URL: str = "redis://localhost:6379/0"

    # ------------------
    # Validations & Defaults
    # ------------------
    @validator("OAUTH_ENCRYPTION_KEY")
    def validate_encryption_key(cls, v):
        if len(v) < 64: # 32 bytes = 64 hex chars
             pass 
        return v
    
    # Compatibility with old code that might access settings.google_scopes etc
    @property
    def google_scopes(self) -> list[str]:
        return [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.settings.basic",
            "https://www.googleapis.com/auth/calendar",
        ]
        
    @property
    def microsoft_scopes(self) -> list[str]:
        return [
            "openid", "profile", "email", "User.Read", "offline_access",
            "Mail.ReadWrite", "Mail.Send", "MailboxSettings.ReadWrite",
            "Calendars.Read", "Calendars.ReadWrite",
        ]

    # Properties to maintain backward compatibility with old settings names 
    # if code uses lowercase properties that map to uppercase ENV vars
    @property
    def openrouter_api_key(self): return self.OPENROUTER_API_KEY
    @property
    def openrouter_base_url(self): return self.OPENROUTER_BASE_URL
    @property
    def openrouter_app_url(self): return self.OPENROUTER_APP_URL
    @property
    def openrouter_app_name(self): return self.OPENROUTER_APP_NAME
    @property
    def aaliyah_draft_model(self): return self.AALIYAH_DRAFT_MODEL
    @property
    def aaliyah_reasoning_model(self): return self.AALIYAH_REASONING_MODEL
    @property
    def aaliyah_verify_model(self): return self.AALIYAH_VERIFY_MODEL
    
    @property
    def server_host(self): return self.SERVER_HOST
    @property
    def server_port(self): return self.SERVER_PORT
    @property
    def database_url(self): return self.DATABASE_URL
    @property
    def redis_url(self): return self.REDIS_URL
    @property
    def app_name(self): return self.APP_NAME
    @property
    def app_version(self): return self.APP_VERSION
    @property
    def debug(self): return self.DEBUG
    @property
    def secret_key(self): return self.SECRET_KEY
    @property
    def algorithm(self): return "HS256"
    @property
    def access_token_expire_minutes(self): return self.ACCESS_TOKEN_EXPIRE_MINUTES
    @property
    def refresh_token_expire_days(self): return self.REFRESH_TOKEN_EXPIRE_DAYS
    @property
    def cors_origins(self): return self.CORS_ORIGINS
    @property
    def cors_credentials(self): return True
    @property
    def cors_methods(self): return ["*"]
    @property
    def cors_headers(self): return ["*"]
    @property
    def google_enabled(self): return self.GOOGLE_ENABLED
    @property
    def google_client_id(self): return self.GOOGLE_CLIENT_ID
    @property
    def google_client_secret(self): return self.GOOGLE_CLIENT_SECRET
    @property
    def google_redirect_uri(self): return self.GOOGLE_REDIRECT_URI
    @property
    def microsoft_enabled(self): return self.MICROSOFT_ENABLED
    @property
    def microsoft_client_id(self): return self.MICROSOFT_CLIENT_ID
    @property
    def microsoft_client_secret(self): return self.MICROSOFT_CLIENT_SECRET
    @property
    def microsoft_tenant_id(self): return self.MICROSOFT_TENANT_ID
    @property
    def microsoft_redirect_uri(self): return self.MICROSOFT_REDIRECT_URI
    @property
    def sync_interval(self): return self.SYNC_INTERVAL
    @property
    def env(self): return self.ENV
    @property
    def oauth_encryption_key(self): return self.OAUTH_ENCRYPTION_KEY
    @property
    def clerk_jwks_url(self): return None
    @property
    def clerk_jwt_iss(self): return None
    @property
    def clerk_jwt_aud(self): return None
    
    @property
    def frontend_base_url(self): return self.FRONTEND_BASE_URL

    @property
    def brain_model(self): return self.BRAIN_MODEL
    
    @property
    def brain_api_key(self): return self.BRAIN_API_KEY

    @property
    def groq_api_key(self): return self.GROQ_API_KEY

    @property
    def openrouter_embedding_model(self): return self.OPENROUTER_EMBEDDING_MODEL

# Instantiate global settings
settings = Settings()
