
import sqlite3

def check_audit_logs_schema():
    conn = sqlite3.connect('zroky.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(audit_logs)")
    columns = cursor.fetchall()
    
    columns_present = [col[1] for col in columns]
    print(f"Columns present: {columns_present}")

    # Columns to check and add if missing
    columns_to_check = {
        "status": "VARCHAR DEFAULT 'APPLIED'",
        "explain_one_liner": "VARCHAR",
        "before_state": "TEXT",
        "after_state": "TEXT",
        "undo_payload": "TEXT"
    }

    for col_name, col_type in columns_to_check.items():
        if col_name not in columns_present:
            print(f"Adding '{col_name}' column...")
            try:
                cursor.execute(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type}")
                print(f"Added {col_name}.")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column '{col_name}' already exists.")

    conn.commit()
    conn.close()
    print("Schema update complete.")

if __name__ == "__main__":
    check_audit_logs_schema()
