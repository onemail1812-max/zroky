import asyncio
from app.database import SessionLocal
from app.models.integration import Integration, IntegrationProvider
from app.services.integrations.integration_token_manager import IntegrationTokenManager
from app.services.integrations.google_gmail import GmailService

async def check():
    db = SessionLocal()
    workspace_id = "ws_demo_stable_001"
    
    print("Initializing Token Manager...")
    token_manager = IntegrationTokenManager(db)
    
    try:
        print("Forcing token get/refresh...")
        token = token_manager.get_valid_token(workspace_id, IntegrationProvider.GOOGLE_GMAIL)
        
        if not token:
            print("FAILED TO GET TOKEN.")
            return
            
        print("Token retrieved. Testing Gmail Service...")
        service = GmailService(token)
        profile = await service.get_profile()
        print(f"Success! Authenticated as: {profile.get('emailAddress')}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(check())
