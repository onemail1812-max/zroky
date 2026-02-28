import sqlite3
import os

db_path = r"d:\Zroky\apps\api\zroky.db"
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_messages';")
        row = cursor.fetchone()
        if row:
            print("Schema for chat_messages:")
            print(row[0])
        else:
            print("Table 'chat_messages' not found.")
            
        cursor.execute("PRAGMA table_info(chat_messages);")
        columns = cursor.fetchall()
        print("\nColumn Details:")
        for col in columns:
            print(col)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
