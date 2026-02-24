
import sys
import os
import sqlite3
from app.config import settings

def main():
    db_url = settings.database_url
    if not db_url.startswith("sqlite"):
        if db_url.startswith("postgresql"):
            print("Connecting to postgres to ensure pgvector indices...")
            from sqlalchemy import create_engine, text
            engine = create_engine(db_url)
            with engine.begin() as conn:
                try:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                    # Create generic expression index for JSON embedding storage
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_memory_entries_embedding ON memory_entries USING ivfflat ((embedding_json::vector) vector_cosine_ops) WITH (lists = 100);"))
                    print("Postgres vector indices added successfully.")
                except Exception as e:
                    print(f"Error adding Postgres vector indices: {e}")
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
