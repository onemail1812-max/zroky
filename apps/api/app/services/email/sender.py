from datetime import datetime
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.draft import Draft, DraftStatus
from app.models.email import EmailMessage
from app.models.integration import Integration, IntegrationStatus, IntegrationProvider
from app.services.integrations.token_store import decrypt_token
import requests
import json

class EmailSender:
    def __init__(self, db: Session, workspace_id: str):
        self.db = db
        self.workspace_id = workspace_id
        
    def _get_integration(self, email_msg: EmailMessage) -> Integration:
        integration = self.db.query(Integration).filter(
            Integration.id == email_msg.integration_id,
            Integration.workspace_id == self.workspace_id
        ).first()
        if not integration or integration.status != IntegrationStatus.CONNECTED:
            raise ValueError(f"Integration {email_msg.integration_id} not connected")
        return integration
        
    def send_draft(self, draft: Draft):
        email_msg = self.db.query(EmailMessage).filter(EmailMessage.id == draft.email_message_id).first()
        if not email_msg:
             raise ValueError("Original email not found")
             
        integration = self._get_integration(email_msg)
        token_data = decrypt_token(integration.token_encrypted)
        access_token = token_data.get("access_token")
        
        provider = integration.provider
        # Some integration logic might categorize provider under EMAIL / CALENDAR variants
        # Assuming provider string or enum check
        
        result = None
        if provider == IntegrationProvider.GOOGLE_GMAIL:
            result = self._send_gmail(access_token, draft, email_msg)
        elif provider == IntegrationProvider.OUTLOOK:
            result = self._send_outlook(access_token, draft, email_msg)
        else:
            raise ValueError(f"Unsupported provider {provider}")
            
        return result

    def _send_gmail(self, token: str, draft: Draft, original: EmailMessage):
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        
        # Construct MIME message
        # Proper threading requires In-Reply-To and References headers
        from email.mime.text import MIMEText
        import base64
        
        msg = MIMEText(draft.body)
        msg['to'] = original.sender.get("email")
        msg['subject'] = draft.subject
        
        # Threading
        if original.message_id: # Usually provided as 'Message-ID' header value
             msg['In-Reply-To'] = original.message_id
             msg['References'] = original.message_id
        
        raw_msg = base64.urlsafe_b64encode(msg.as_bytes()).decode('utf-8')
        
        body = {
            "raw": raw_msg,
            "threadId": original.thread_id
        }
        
        res = requests.post(url, json=body, headers={"Authorization": f"Bearer {token}"})
        if not res.ok:
            raise Exception(f"Gmail Send Error: {res.text}")
            
        return res.json()

    def _send_outlook(self, token: str, draft: Draft, original: EmailMessage):
        # Microsoft Graph /reply endpoint is easier for threading
        # /me/messages/{id}/reply
        # But for new mail: /me/sendMail
        
        # If replying:
        if original.id: # We used provider's ID as our ID in ingest.py
            url = f"https://graph.microsoft.com/v1.0/me/messages/{original.id}/reply"
            body = {
                "comment": draft.body
            }
        else:
            # Fallback (shouldn't happen for reply flow)
            url = "https://graph.microsoft.com/v1.0/me/sendMail"
            body = {
                "message": {
                    "subject": draft.subject,
                    "body": {
                        "contentType": "Text",
                        "content": draft.body
                    },
                    "toRecipients": [
                        {"emailAddress": {"address": original.sender.get("email")}}
                    ]
                }
            }
            
        res = requests.post(url, json=body, headers={"Authorization": f"Bearer {token}"})
        if not res.ok:
             raise Exception(f"Outlook Send Error: {res.text}")
             
        return True # logic successful (202 Accepted)
