import asyncio
from app.database import SessionLocal
from app.models.integration import Integration, IntegrationProvider
from app.services.integrations.google_gmail import GmailService
from app.services.integrations.token_store import get_valid_token
import json
from datetime import datetime

async def diagnostic():
    db = SessionLocal()
    workspace_id = "ws_demo_stable_001"
    
    token = get_valid_token(db, workspace_id, IntegrationProvider.GOOGLE_GMAIL)
    if not token:
        print("No valid token found")
        return
        
    service = GmailService(token)
    profile = await service.get_profile()
    
    integration = db.query(Integration).filter(
        Integration.workspace_id == workspace_id,
        Integration.provider == IntegrationProvider.GOOGLE_GMAIL
    ).first()
    
    config = json.loads(integration.config_json) if integration.config_json else {}
    last_history_id = config.get("last_history_id")
    
    print(f"--- DIAGNOSTICS ---")
    print(f"Current Account: {profile.get('emailAddress')}")
    print(f"Aaliyah's Stored History ID: {last_history_id}")
    print(f"Gmail's Current History ID:  {profile.get('historyId')}")
    print(f"-------------------")
    
    print("Fetching last 5 emails in inbox...")
    raw_messages = await service.search_messages("in:inbox", max_results=5)
    
    for rm in raw_messages:
        msg = await service.get_message(rm["id"], format="full")
        headers = msg.get("payload", {}).get("headers", [])
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No Subject")
        date = next((h["value"] for h in headers if h["name"] == "Date"), "No Date")
        InternalDate = datetime.fromtimestamp(int(msg.get("internalDate", 0))/1000)
        historyId = msg.get("historyId")
        
        print(f"ID: {msg['id']}")
        print(f"Subj: {subject}")
        print(f"Date: {date} (Internal: {InternalDate})")
        print(f"HistoryId: {historyId}")
        
        if last_history_id and int(historyId) <= int(last_history_id):
            print(f"Result: Aaliyah IGNORES this (historyId {historyId} is <= stored {last_history_id})")
        else:
            print(f"Result: Aaliyah SHOULD SEE this")
        print("---")

if __name__ == "__main__":
    asyncio.run(diagnostic())
