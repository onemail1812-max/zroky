"""Convert the 12:58 email chat message from plain text to a rich EmailActionCard."""
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.chat_message import ChatMessageRow

db = SessionLocal()

# Find the proactive message
msg = db.query(ChatMessageRow).filter(ChatMessageRow.id == "proactive_bc78f56d0d54").first()
if not msg:
    print("Message not found!")
    db.close()
    sys.exit(1)

print(f"BEFORE: type={msg.msg_type}, content={msg.content[:80]}")

# Get the existing payload data
payload = msg.payload or {}
sender = payload.get("sender", "User Id <mailto7169@gmail.com>")
subject = payload.get("subject", "Server outage affecting Production!")
snippet = payload.get("snippet", "")

# Extract sender name
sender_name = sender.split("<")[0].strip() if "<" in sender else sender

# Update to email_action type with proper payload
msg.msg_type = "email_action"
msg.content = None  # EmailActionCard uses payload, not content
msg.payload = {
    "sender": sender_name,
    "subject": subject,
    "snippet": snippet or "Hi,\nThe main database went down 10 minutes ago and currently our production API is returning 500 errors to all users. This is affecting approximately 50,000 active users.",
    "priority": "Priority",
    "draft": None,
}

db.commit()
print(f"AFTER: type={msg.msg_type}, payload={msg.payload}")
print("DONE! Refresh the browser to see the rich EmailActionCard.")
db.close()
