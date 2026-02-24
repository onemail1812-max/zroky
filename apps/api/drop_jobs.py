from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS jobs;"))
    conn.commit()
print("Jobs table dropped successfully.")
