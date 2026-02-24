import asyncio
import sqlite3
import json
import sys
import os

# Ensure app is in path
sys.path.append(os.getcwd())

from app.integrations.gmail_client import GmailClient
from app.services.integrations.token_store import get_valid_token

async def test_client():
    from app.database import SessionLocal
    db = SessionLocal()
    workspace_id = 'ws_demo_stable_001'
    
    token = get_valid_token(db, workspace_id, "google")
    db.close()
    
    if not token:
        print("Failed to get token")
        return

    print(f"Token: {token[:10]}...")
    client = GmailClient(token)
    
    print("Testing list_threads(query='label:INBOX')...")
    res = await client.list_threads(max_results=5, query="label:INBOX")
    print(f"Result (label:INBOX): {res}")
    
    print("\nTesting list_threads(query='')...")
    res_all = await client.list_threads(max_results=5, query="")
    print(f"Result (all): {res_all}")

if __name__ == "__main__":
    asyncio.run(test_client())
