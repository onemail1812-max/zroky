"""Check the latest chat messages."""
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models.chat_message import ChatMessageRow

db = SessionLocal()
msgs = db.query(ChatMessageRow).order_by(ChatMessageRow.created_at.desc()).limit(15).all()
for m in msgs:
    print(f'ID: {m.id} | type: {m.msg_type}')
    content = str(m.content) if m.content else 'None'
    print(f'Content: {content[:150]}')
    print('---')
db.close()
