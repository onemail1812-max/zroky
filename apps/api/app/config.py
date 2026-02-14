"""Application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Optional, Any
from pathlib import Path

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings."""

    # Load `apps/api/.env` regardless of current working directory.
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App settings
    env: str = "development"
    app_name: str = "Zroky API"
    app_version: str = "0.1.0"
    debug: bool = False

    # Server settings
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # Database settings
    database_url: str = "sqlite:///./zroky.db"
    database_echo: bool = False

    # Redis (Hot State cache)
    redis_url: Optional[str] = Field(
        default=None,
        description="Redis URL for hot state cache (e.g. redis://localhost:6379/0). Falls back to in-memory when absent.",
    )

    # Security settings
    secret_key: Optional[str] = Field(
        default=None,
        description="JWT signing key (required in production)",
    )
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # Frontend base URL (OAuth callback redirect target)
    frontend_base_url: str = "http://localhost:3002"

    # CORS settings
    cors_origins: list[str] = ["http://localhost:4000", "http://localhost:3005", "http://localhost:3002", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:4000", "http://127.0.0.1:8000"]
    cors_credentials: bool = True
    cors_methods: list[str] = ["*"]
    cors_headers: list[str] = ["*"]

    # OpenRouter - General
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_name: str = "Zroky"
    openrouter_app_url: str = "http://localhost:3000"

    # Public URL for booking links etc
    public_app_url: str = "http://localhost:3002"

    # Aaliyah (Executive Assistant)
    aaliyah_model: str = "google/gemini-2.5-flash-lite"
    aaliyah_api_key: Optional[str] = Field(
        default=None,
        description="OpenRouter API key for Aaliyah (defaults to OPENROUTER_API_KEY)",
    )

    # Chief of Staff Brain (Reasoning)
    brain_model: str = "deepseek/deepseek-r1"
    brain_api_key: Optional[str] = Field(
        default=None,
        description="OpenRouter API key for Chief of Staff (defaults to OPENROUTER_API_KEY)",
    )

    # Legacy/Default (for backward compatibility or direct access)
    openrouter_api_key: str = Field(..., description="OpenRouter API key (default)")
    openrouter_text_model: str = "google/gemini-2.5-flash"
    openrouter_embedding_model: str = "openai/text-embedding-3-small"

    openrouter_image_model: str = "allenai/molmo-2-8b:free"

    # Google OAuth (Gmail + Google Calendar)
    google_enabled: bool = False
    google_client_id: Optional[str] = Field(default=None, description="Google OAuth client ID")
    google_client_secret: Optional[str] = Field(default=None, description="Google OAuth client secret")
    google_redirect_uri: str = "http://localhost:8000/oauth/google/callback"
    google_scopes: list[str] = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.settings.basic",
        "https://www.googleapis.com/auth/calendar",
    ]

    # Microsoft OAuth (Outlook + Microsoft Calendar)
    microsoft_enabled: bool = False
    microsoft_client_id: Optional[str] = Field(default=None, description="Microsoft OAuth client ID")
    microsoft_client_secret: Optional[str] = Field(default=None, description="Microsoft OAuth client secret")
    microsoft_tenant_id: str = "common"
    microsoft_redirect_uri: str = "http://localhost:8000/oauth/microsoft/callback"
    microsoft_scopes: list[str] = [
        "openid",
        "profile",
        "email",
        "User.Read",
        "offline_access",
        "Mail.ReadWrite",
        "Mail.Send",
        "MailboxSettings.ReadWrite",
        "Calendars.Read",
        "Calendars.ReadWrite",
    ]

    # Sync Worker
    sync_interval: int = 120 # Check for new data every 2 minutes

    # OAuth encryption key (32-byte hex string)
    oauth_encryption_key: str = Field(..., description="OAuth encryption key (32-byte hex string)")

    # Clerk Auth (JWT verification)
    clerk_enabled: bool = False
    clerk_jwks_url: Optional[str] = Field(default=None, description="Clerk JWKS URL")
    clerk_jwt_aud: Optional[str] = Field(default=None, description="Clerk JWT audience")
    clerk_jwt_iss: Optional[str] = Field(default=None, description="Clerk JWT issuer")

    @model_validator(mode="after")
    def apply_dev_defaults(self) -> "Settings":
        def _is_blank(value: Any) -> bool:
            if value is None:
                return True
            if isinstance(value, str) and not value.strip():
                return True
            return False

        if _is_blank(self.secret_key):
            if str(self.env).lower() in {"prod", "production"}:
                raise ValueError("SECRET_KEY is required in production")
            self.secret_key = "dev-secret"

        # Fix for short/invalid OAUTH_ENCRYPTION_KEY in dev
        if self.env != "production":
             # 0123456789abcdef0123456789abcdef is 32 chars (16 bytes), need 64 chars (32 bytes)
             if not self.oauth_encryption_key or len(self.oauth_encryption_key) < 64:
                 self.oauth_encryption_key = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

        # Default Aaliyah/Brain keys to OPENROUTER_API_KEY if not provided
        if _is_blank(self.aaliyah_api_key):
            self.aaliyah_api_key = self.openrouter_api_key
        if _is_blank(self.brain_api_key):
            self.brain_api_key = self.openrouter_api_key

        # Inject Mock Credentials for Dev/QA if missing
        if self.env != "production":
            if _is_blank(self.google_client_id):
                self.google_client_id = "mock-google-client"
            if _is_blank(self.google_client_secret):
                self.google_client_secret = "mock-google-secret"
            if _is_blank(self.microsoft_client_id):
                self.microsoft_client_id = "mock-ms-client"
            if _is_blank(self.microsoft_client_secret):
                self.microsoft_client_secret = "mock-ms-secret"

        # Google integration
        if self.google_enabled:
            missing = []
            if _is_blank(self.google_client_id):
                missing.append("GOOGLE_CLIENT_ID")
            if _is_blank(self.google_client_secret):
                missing.append("GOOGLE_CLIENT_SECRET")
            if missing:
                raise ValueError(f"Missing required Google OAuth settings: {', '.join(missing)}")
        else:
            self.google_client_id = None
            self.google_client_secret = None

        # Microsoft integration
        if self.microsoft_enabled:
            missing = []
            if _is_blank(self.microsoft_client_id):
                missing.append("MICROSOFT_CLIENT_ID")
            if _is_blank(self.microsoft_client_secret):
                missing.append("MICROSOFT_CLIENT_SECRET")
            if missing:
                raise ValueError(f"Missing required Microsoft OAuth settings: {', '.join(missing)}")
        else:
            self.microsoft_client_id = None
            self.microsoft_client_secret = None

        # Clerk integration
        if self.clerk_enabled:
            missing = []
            if _is_blank(self.clerk_jwks_url):
                missing.append("CLERK_JWKS_URL")
            if _is_blank(self.clerk_jwt_aud):
                missing.append("CLERK_JWT_AUD")
            if _is_blank(self.clerk_jwt_iss):
                missing.append("CLERK_JWT_ISS")
            if missing:
                raise ValueError(f"Missing required Clerk settings: {', '.join(missing)}")
        else:
            self.clerk_jwks_url = None
            self.clerk_jwt_aud = None
            self.clerk_jwt_iss = None

        return self

settings = Settings()
