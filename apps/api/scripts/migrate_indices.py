
import sys
import os
import sqlite3
from app.config import settings

def main():
    db_url = settings.database_url
    if not db_url.startswith("sqlite"):
        print("Not using SQLite, skipping manual migration.")
        return

    db_path = db_url.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    print(f"Adding indices to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Audit Logs: workspace + created_at for fast timeline
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_workspace_created ON audit_logs (workspace_id, created_at DESC);")
        
        # Triaged Emails: workspace + received_at for fast feed
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_triaged_emails_workspace_received ON triaged_emails (workspace_id, received_at DESC);")
        
        # Triaged Emails: workspace + category for filtering
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_triaged_emails_workspace_category ON triaged_emails (workspace_id, category);")

        conn.commit()
        print("Indices added successfully.")
    except Exception as e:
        print(f"Error adding indices: {e}")
    
    conn.close()

if __name__ == "__main__":
    main()
