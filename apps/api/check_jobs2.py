from app.database import engine
from sqlalchemy import text
import pprint

with engine.connect() as conn:
    rs = conn.execute(text("SELECT id, type, status, attempts, last_error, locked_by FROM jobs LIMIT 10"))
    print("Database Queue Status for 'jobs' table:")
    for row in rs:
        print(f"[{row[2]}] {row[1]} (id: {row[0][:8]}...) attempts: {row[3]}, locked_by: {row[5]}, error: {row[4]}")
