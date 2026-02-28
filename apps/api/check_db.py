import sqlite3

conn = sqlite3.connect('D:/Zroky/apps/api/zroky.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print("Tables found:")
for t in tables:
    table_name = t[0]
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"- {table_name}: {count} rows")
    except:
        pass

conn.close()
