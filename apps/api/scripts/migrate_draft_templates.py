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

    print(f"Migrating {db_path} to create draft_templates...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS draft_templates (
                id VARCHAR PRIMARY KEY,
                workspace_id VARCHAR NOT NULL,
                name VARCHAR NOT NULL,
                subject VARCHAR,
                body TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_draft_templates_id ON draft_templates (id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_draft_templates_workspace_id ON draft_templates (workspace_id);")
        conn.commit()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
    
    conn.close()

if __name__ == "__main__":
    main()
