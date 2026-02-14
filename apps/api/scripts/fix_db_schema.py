
import sqlite3
import os

# Path to the database
DB_PATH = "d:/Zroky/apps/api/zroky.db"

def inspect_table():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("--- Inspecting email_drafts table ---")
        cursor.execute("PRAGMA table_info(email_drafts)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("Existing columns:")
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
            
        required_columns = ["provider", "provider_draft_id"]
        missing_columns = [col for col in required_columns if col not in column_names]
        
        if missing_columns:
            print(f"\nMissing columns: {missing_columns}")
            for col in missing_columns:
                print(f"Adding column: {col}")
                cursor.execute(f"ALTER TABLE email_drafts ADD COLUMN {col} VARCHAR")
            conn.commit()
            print("Successfully added missing columns.")
        else:
            print("\nAll required columns exist.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_table()
