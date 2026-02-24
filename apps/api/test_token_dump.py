from app.database import SessionLocal
from app.models.integration import IntegrationProvider
from app.services.integrations.token_store import get_valid_token, decrypt_token
from app.models.integration import Integration
import json
import time

def check_token():
    db = SessionLocal()
    workspace_id = "ws_demo_stable_001"
    
    integration = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.provider == IntegrationProvider.GOOGLE_GMAIL
    ).first()
    
    if not integration:
        print("No integration found!")
        return
        
    print(f"Token present in DB: {bool(integration.token_encrypted)}")
    
    raw = decrypt_token(integration.token_encrypted)
    print(f"Decrypted successfully? {bool(raw)}")
    
    try:
        token_data = json.loads(raw)
        print("Is valid JSON.")
        print(f"Has expires_at? {token_data.get('expires_at')}")
        print(f"Current time: {int(time.time())}")
        if token_data.get("expires_at"):
            diff = int(token_data.get("expires_at")) - int(time.time())
            print(f"Expires in {diff} seconds")
            
        print(f"Has refresh_token? {bool(token_data.get('refresh_token'))}")
    except Exception as e:
        print("NOT JSON. Plain string fallback triggered.")

if __name__ == "__main__":
    check_token()
