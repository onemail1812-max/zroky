from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor
from app.database import SessionLocal
import asyncio

async def test_load():
    db = SessionLocal()
    try:
        ingestor = EmailIngestor("test-workspace", db)
        print("Ingestor loaded successfully")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_load())
