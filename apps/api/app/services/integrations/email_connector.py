"""Stub — EmailConnectorFactory removed in stateless architecture."""

class EmailConnectorFactory:
    """STUB: Replaced by new stateless gmail_client / outlook_client."""
    def __init__(self, db=None, workspace_id=None):
        pass
    async def get_connector(self, user_id=None, provider=None):
        return None
