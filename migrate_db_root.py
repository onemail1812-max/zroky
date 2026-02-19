
import sqlite3
import os

db_path = "./zroky.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("ALTER TABLE workspaces ADD COLUMN onboarding_status TEXT DEFAULT 'pending' NOT NULL;")
        conn.commit()
        print("Successfully added onboarding_status column to root db")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"File {db_path} not found")
