import asyncio
import logging
from app.database import SessionLocal
from app.agents.aaliyah.core.ingestion.email_ingestor import EmailIngestor
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    workspace_id = "ws_demo_stable_001"
    db = SessionLocal()
    try:
        ingestor = EmailIngestor(workspace_id, db)
        
        print(f"--- Testing Zero-History Sync for {workspace_id} ---")
        
        # Check initial config
        from app.models.integration import Integration, IntegrationProvider
        integration = db.query(Integration).filter(
            Integration.workspace_id == workspace_id,
            Integration.provider == IntegrationProvider.GOOGLE_GMAIL
        ).first()
        
        print(f"Initial config: {integration.config_json}")
        
        # Reset config to simulate first-ever sync if needed
        # integration.config_json = json.dumps({"service_type": "email"})
        # db.commit()
        
        # Run sync
        messages = await ingestor.fetch_incremental(provider="google")
        
        print(f"Messages fetched: {len(messages)}")
        
        # Check config
        db.refresh(integration)
        print(f"Updated config: {integration.config_json}")
        
    except Exception as e:
        logger.exception(f"Sync failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
