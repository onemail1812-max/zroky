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

    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT settings_json FROM workspaces LIMIT 1")
        print("Column 'settings_json' already exists.")
    except sqlite3.OperationalError:
        print("Adding 'settings_json' column...")
        cursor.execute("ALTER TABLE workspaces ADD COLUMN settings_json TEXT")
        conn.commit()
        print("Done.")
    
    conn.close()

if __name__ == "__main__":
    main()
