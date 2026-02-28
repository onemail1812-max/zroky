import sqlite3
import os

db_path = r"d:\Zroky\apps\api\zroky.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        print("Checking for email_id column...")
        cursor.execute("PRAGMA table_info(chat_messages);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "email_id" not in columns:
            print("Adding email_id column...")
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN email_id VARCHAR;")
            conn.commit()
            print("Successfully added email_id column.")
        else:
            print("email_id column already exists.")
            
        # Also check for indexes defined in model
        # id (primary key already indexed)
        # workspace_id (index ix_chat_messages_workspace_id)
        # thread_id (index ix_chat_messages_thread_id)
        # email_id (index ix_chat_messages_email_id)
        # created_at (index ix_chat_messages_created_at)
        
        print("\nChecking and creating indexes...")
        indexes = {
            "ix_chat_messages_workspace_id": "CREATE INDEX ix_chat_messages_workspace_id ON chat_messages (workspace_id);",
            "ix_chat_messages_thread_id": "CREATE INDEX ix_chat_messages_thread_id ON chat_messages (thread_id);",
            "ix_chat_messages_email_id": "CREATE INDEX ix_chat_messages_email_id ON chat_messages (email_id);",
            "ix_chat_messages_created_at": "CREATE INDEX ix_chat_messages_created_at ON chat_messages (created_at);"
        }
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index';")
        existing_indexes = [row[0] for row in cursor.fetchall()]
        
        for idx_name, idx_sql in indexes.items():
            if idx_name not in existing_indexes:
                print(f"Creating index {idx_name}...")
                cursor.execute(idx_sql)
                print(f"Index {idx_name} created.")
            else:
                print(f"Index {idx_name} already exists.")
        
        conn.commit()
        print("\nMigration completed successfully.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()
