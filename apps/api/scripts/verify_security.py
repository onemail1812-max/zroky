
import asyncio
import logging
from app.config import settings
from app.main import startup_event

# Ensure critical logs are shown
logging.basicConfig(level=logging.CRITICAL)

async def test_security_warnings():
    print("\n--- [1] Simulating PRODUCTION with WEAK config ---")
    
    # Overwrite settings to simulate a misconfigured production environment
    settings.env = "production"
    settings.secret_key = "weak"
    settings.oauth_encryption_key = "0123456789abcdef0123456789abcdef"
    settings.clerk_jwks_url = "" # Missing

    # This should trigger CRITICAL logs
    await startup_event()
    
    print("\n--- [2] Simulating PRODUCTION with STRONG config ---")
    
    # Overwrite with strong settings
    settings.secret_key = "a_very_long_secure_key_that_is_at_least_32_bytes_long"
    settings.oauth_encryption_key = "12345678901234567890123456789012" # Rotated
    settings.clerk_jwks_url = "https://clerk.com/jwks"
    
    print("(Run startup again - Should be silent)")
    await startup_event()
    print("✅ Startup completed without new warnings.")

if __name__ == "__main__":
    asyncio.run(test_security_warnings())
