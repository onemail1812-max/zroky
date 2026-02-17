from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    """Aaliyah API Configuration"""
    
    # Load .env
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=True, # Be precise
        extra="ignore"
    )

    # Core Settings
    ENV: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., description="JWT Signing Key")
    OAUTH_ENCRYPTION_KEY: str = Field(..., min_length=64, description="32-byte hex for token encryption")

    # API Keys
    OPENROUTER_API_KEY: str = Field(..., description="Required for LLM")
    
    # OAuth (Can be mocked in dev if explicit flag set) - Optional to allow startup without them in CI
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None

    # URLs
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_APP_URL: str = "http://localhost:3000"
    OPENROUTER_APP_NAME: str = "Aaliyah AI"

settings = Settings()
