import json
from sqlalchemy.orm import Session
from app.models.integration import Integration, IntegrationProvider

class IntegrationTokenManager:
    """Helper to store/retrieve provider-specific configuration in the database."""
    def __init__(self, db: Session = None):
        self.db = db

    def get_config(self, workspace_id: str, provider: IntegrationProvider) -> dict:
        """Get provider-specific config from the database."""
        if not self.db:
            return {}
        integration = self.db.query(Integration).filter(
            Integration.workspace_id == workspace_id,
            Integration.provider == provider
        ).first()
        if not integration or not integration.config_json:
            return {}
        try:
            return json.loads(integration.config_json)
        except Exception:
            return {}

    def update_config(self, workspace_id: str, provider: IntegrationProvider, updates: dict):
        """Update provider-specific config in the database."""
        if not self.db:
            return
        integration = self.db.query(Integration).filter(
            Integration.workspace_id == workspace_id,
            Integration.provider == provider
        ).first()
        if not integration:
            return
        
        current_config = {}
        if integration.config_json:
            try:
                current_config = json.loads(integration.config_json)
            except Exception:
                pass
        
        current_config.update(updates)
        integration.config_json = json.dumps(current_config)
        self.db.commit()

    async def get_valid_token(self, workspace_id: str, provider: str) -> str | None:
        """Compatibility wrapper for get_valid_token."""
        from app.services.integrations.token_store import get_valid_token
        return get_valid_token(self.db, workspace_id, provider)
