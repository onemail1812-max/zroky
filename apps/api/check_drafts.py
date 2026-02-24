from app.database import SessionLocal
from app.models.triaged_email import TriagedEmail

def check_triaged():
    db = SessionLocal()
    workspace_id = "ws_demo_stable_001"
    
    recent = db.query(TriagedEmail).filter(
        TriagedEmail.workspace_id == workspace_id
    ).order_by(TriagedEmail.created_at.desc()).limit(3).all()
    
    if not recent:
        print("No triaged emails found.")
        return
        
    for m in recent:
        print(f"Subject: {m.subject}")
        print(f"Sender: {m.sender}")
        print(f"Priority: {m.priority}")
        print(f"Has Draft: {bool(m.metadata_json and 'draft' in m.metadata_json)}")
        if m.metadata_json and 'draft' in m.metadata_json:
            print(f"Draft Subject: {m.metadata_json['draft'].get('subject')}")
        print("---")

if __name__ == "__main__":
    check_triaged()
