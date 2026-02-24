import sqlite3
import os
import json

DB_PATH = "d:\\Zroky\\apps\\api\\zroky.db"

def check_emails():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check email count
        cursor.execute("SELECT count(*) FROM triaged_emails")
        count = cursor.fetchone()[0]
        print(f"Triaged Emails count: {count}")

        # Check workspace settings for provider connection
        cursor.execute("SELECT id, settings_json FROM workspaces LIMIT 1")
        row = cursor.fetchone()
        if row:
            ws_id, settings_json = row
            print(f"Workspace ID: {ws_id}")
            if settings_json:
                settings = json.loads(settings_json)
                print(f"Settings JSON keys: {list(settings.keys())}")
                if "providers" in settings:
                     print(f"Providers: {settings['providers']}")
                else:
                     print("No 'providers' key in settings.")
            else:
                print("Settings JSON is empty/null.")
        else:
            print("No workspace found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_emails()
