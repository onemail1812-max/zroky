import sqlite3
import os

DB_PATH = "d:\\Zroky\\apps\\api\\zroky.db"

def check_ws():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT count(*) FROM workspaces")
        count = cursor.fetchone()[0]
        print(f"Workspaces count: {count}")
        
        cursor.execute("SELECT count(*) FROM users")
        print(f"Users count: {cursor.fetchone()[0]}")
        
        cursor.execute("SELECT count(*) FROM memberships")
        print(f"Memberships count: {cursor.fetchone()[0]}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_ws()
