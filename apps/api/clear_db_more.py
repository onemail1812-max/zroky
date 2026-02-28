import sqlite3

conn = sqlite3.connect('D:/Zroky/apps/api/zroky.db')
cursor = conn.cursor()

tables_to_clear = [
    'messages',
    'artifacts'
]

for table in tables_to_clear:
    cursor.execute(f"DELETE FROM {table}")
    print(f"Cleared table: {table}")

conn.commit()
conn.close()
