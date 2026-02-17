import requests
from typing import List, Dict, Any, Optional
from datetime import datetime

# TODO: Add real OAuth token refresh logic if needed.
# For now, assumes valid access_token.

def fetch_gmail_messages(access_token: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch raw messages from Gmail API.
    Does NOT use google-api-python-client to keep dep light.
    """
    base_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    
    # List IDs
    resp = requests.get(
        base_url,
        params={"maxResults": limit, "q": "in:inbox"},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    if not resp.ok:
        print(f"Gmail list failed: {resp.text}")
        return []
    
    messages = resp.json().get("messages", [])
    if not messages:
        return []
    
    # Batch get details (naive loop for now, optimize later)
    full_messages = []
    for msg in messages:
        detail_resp = requests.get(
            f"{base_url}/{msg['id']}",
            params={"format": "full"},
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if detail_resp.ok:
            payload = detail_resp.json()
            full_messages.append(payload)
            
    return full_messages


def fetch_outlook_messages(access_token: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Fetch messages from MS Graph API.
    """
    base_url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
    
    resp = requests.get(
        base_url,
        params={
            "$top": limit,
            "$select": "id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,conversationId",
            "$orderby": "receivedDateTime desc"
        },
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if not resp.ok:
        print(f"Outlook fetch failed: {resp.text}")
        return []
        
    return resp.json().get("value", [])
