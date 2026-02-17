from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.email import EmailMessage
from app.services.email.parsing.html_cleaner import clean_html_to_text
from app.services.email.parsing.reply_parser import parse_email_body

def parse_gmail_message(raw: Dict[str, Any], workspace_id: str, integration_id: str) -> Optional[EmailMessage]:
    """
    Convert raw Gmail payload to EmailMessage model.
    """
    try:
        payload = raw.get("payload", {})
        headers = payload.get("headers", [])
        
        # Headers dict
        header_map = {h["name"].lower(): h["value"] for h in headers}
        
        # Thread
        thread_id = raw.get("threadId")
        msg_id = raw.get("id")
        
        # Subject
        subject = header_map.get("subject", "(No Subject)")
        
        # Snippet
        snippet = raw.get("snippet", "")
        
        # Body Decoding (naive text/plain or text/html)
        body = ""
        parts = payload.get("parts", [])
        
        # Simple recursion for parts
        # (TODO: Handle multipart/alternative correctly)
        def _get_body_part(parts_list):
            for part in parts_list:
                mime_type = part.get("mimeType")
                if mime_type == "text/plain":
                    data = part.get("body", {}).get("data")
                    if data:
                        import base64
                        return base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
                if mime_type == "text/html":
                     # Fallback if no plain
                     data = part.get("body", {}).get("data")
                     if data:
                        import base64
                        html = base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')
                        return clean_html_to_text(html)
                if "parts" in part: # Nested multipart
                     res = _get_body_part(part["parts"])
                     if res: return res
            return None
            
        body = _get_body_part(parts) or snippet

        # Sender/Recipients
        # "Name <email>" -> {name, email} (simple split)
        sender_str = header_map.get("from", "")
        sender = {"name": sender_str.split("<")[0].strip(), "email": sender_str.split("<")[-1].strip(">")} if "<" in sender_str else {"name": sender_str, "email": sender_str}
        
        recipients = [] # TODO parse To/Cc
        
        # Date
        # Gmail internalDate is ms timestamp
        internal_date = int(raw.get("internalDate", 0)) / 1000
        received_at = datetime.fromtimestamp(internal_date)
        
        # Clean Body
        body_cleaned = parse_email_body(body)

        return EmailMessage(
            id=msg_id, # Use provider ID as PK for dedupe logic? Or UUID? Sprint plan said UUID. But let's use msg_id for easier dedupe.
            workspace_id=workspace_id,
            integration_id=integration_id,
            provider="google",
            thread_id=thread_id,
            message_id=msg_id,
            subject=subject,
            sender=sender,
            recipients=recipients,
            snippet=snippet,
            body_cleaned=body_cleaned,
            received_at=received_at,
            labels=["needs_reply"] if "UNREAD" in raw.get("labelIds", []) else [],
            is_read="UNREAD" not in raw.get("labelIds", [])
        )
    except Exception as e:
        print(f"Failed to parse Gmail message {raw.get('id')}: {e}")
        return None


def parse_outlook_message(raw: Dict[str, Any], workspace_id: str, integration_id: str) -> Optional[EmailMessage]:
    """
    Convert raw Outlook payload to EmailMessage model.
    """
    try:
        msg_id = raw.get("id")
        thread_id = raw.get("conversationId")
        subject = raw.get("subject", "(No Subject)")
        snippet = raw.get("bodyPreview", "")
        
        # Body
        body_content = raw.get("body", {}).get("content", "")
        content_type = raw.get("body", {}).get("contentType", "text")
        
        if content_type == "html":
            body_text = clean_html_to_text(body_content)
        else:
            body_text = body_content
            
        body_cleaned = parse_email_body(body_text)
        
        # Date
        received_str = raw.get("receivedDateTime")
        if received_str:
            # removing 'Z' and parsing
            received_at = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        else:
            received_at = datetime.utcnow()
            
        # Sender
        # {emailAddress: {name, address}}
        sender_raw = raw.get("from", {}).get("emailAddress", {})
        sender = {"name": sender_raw.get("name"), "email": sender_raw.get("address")}
        
        # Recipients
        recipients = []
        to_list = raw.get("toRecipients", [])
        for r in to_list:
            addr = r.get("emailAddress", {})
            recipients.append({"name": addr.get("name"), "email": addr.get("address")})
            
        return EmailMessage(
            id=msg_id,
            workspace_id=workspace_id,
            integration_id=integration_id,
            provider="microsoft",
            thread_id=thread_id,
            message_id=msg_id,
            subject=subject,
            sender=sender,
            recipients=recipients,
            snippet=snippet,
            body_cleaned=body_cleaned,
            received_at=received_at,
            is_read=raw.get("isRead", False),
            labels=[]
        )
    except Exception as e:
        print(f"Failed to parse Outlook message {raw.get('id')}: {e}")
        return None
