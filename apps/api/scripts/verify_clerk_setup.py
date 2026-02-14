"""
Verify Clerk Authentication Setup
"""
import sys
sys.path.insert(0, 'd:/Zroky/apps/api')

from app.config import settings

def verify_clerk_setup():
    print("🔐 Clerk Authentication Setup Verification\n")
    print("=" * 60)
    
    # Check Clerk configuration
    clerk_configured = bool(settings.clerk_jwks_url)
    
    print("\n📋 Configuration Status:")
    print(f"  CLERK_JWKS_URL: {'✅ Set' if settings.clerk_jwks_url else '❌ Missing'}")
    if settings.clerk_jwks_url:
        print(f"    → {settings.clerk_jwks_url}")
    
    print(f"  CLERK_JWT_ISS: {'✅ Set' if settings.clerk_jwt_iss else '❌ Missing'}")
    if settings.clerk_jwt_iss:
        print(f"    → {settings.clerk_jwt_iss}")
    
    print(f"  CLERK_JWT_AUD: {'⚠️  Optional' if not settings.clerk_jwt_aud else '✅ Set'}")
    
    print(f"\n  FRONTEND_BASE_URL: {settings.frontend_base_url}")
    print(f"  CORS_ORIGINS: {', '.join(settings.cors_origins)}")
    print(f"  DEBUG: {settings.debug}")
    
    # Check security settings
    print("\n🔒 Security Settings:")
    print(f"  SECRET_KEY: {'✅ Set' if settings.secret_key and settings.secret_key != 'your-secret-key-change-in-production' else '❌ Using default'}")
    print(f"  ALGORITHM: {settings.algorithm}")
    print(f"  TOKEN_EXPIRE: {settings.access_token_expire_minutes} minutes")
    
    # Check OAuth settings
    print("\n🔑 OAuth Settings:")
    print(f"  OAUTH_ENCRYPTION_KEY: {'✅ Set' if settings.oauth_encryption_key else '❌ Missing'}")
    print(f"  GOOGLE_CLIENT_ID: {'✅ Set' if settings.google_client_id else '❌ Missing'}")
    print(f"  MICROSOFT_CLIENT_ID: {'✅ Set' if settings.microsoft_client_id else '❌ Missing'}")
    
    # Overall status
    print("\n" + "=" * 60)
    if clerk_configured:
        print("✅ Clerk is CONFIGURED and ready to use!")
        print("\n📝 Next Steps:")
        print("  1. Restart the backend server to load new config")
        print("  2. Restart the frontend server to load Clerk keys")
        print("  3. Visit http://localhost:3002/login to test")
    else:
        print("⚠️  Clerk is NOT fully configured")
        print("\n📝 Missing Configuration:")
        if not settings.clerk_jwks_url:
            print("  - CLERK_JWKS_URL in .env")
        if not settings.clerk_jwt_iss:
            print("  - CLERK_JWT_ISS in .env")
    
    print("\n" + "=" * 60)
    
    return clerk_configured

if __name__ == "__main__":
    verify_clerk_setup()
