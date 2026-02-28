"""Find the 12:58 email and update its chat entry to a rich EmailActionCard."""
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.chat_message import ChatMessageRow
from app.models.triaged_email import TriagedEmail

db = SessionLocal()

# 1) Show all chat messages
print("=== CHAT MESSAGES ===")
msgs = db.query(ChatMessageRow).order_by(ChatMessageRow.created_at.desc()).limit(20).all()
for m in msgs:
    content_preview = (m.content or "")[:100]
    payload_preview = str(m.payload)[:100] if m.payload else "None"
    print(f"ID: {m.id} | type: {m.msg_type} | role: {m.role}")
    print(f"  content: {content_preview}")
    print(f"  payload: {payload_preview}")
    print(f"  created: {m.created_at}")
    print()

# 2) Show triaged emails to find the 12:58 one
print("=== TRIAGED EMAILS ===")
emails = db.query(TriagedEmail).order_by(TriagedEmail.created_at.desc()).limit(10).all()
for e in emails:
    subject = str(e.subject or "")[:60]
    sender = str(e.sender or "")[:40]
    print(f"ID: {e.id} | subject: {subject} | sender: {sender}")
    print(f"  priority: {e.priority} | category: {e.category} | created: {e.created_at}")
    meta = e.metadata_json or {}
    print(f"  snippet: {str(e.snippet or '')[:80]}")
    print()

db.close()
