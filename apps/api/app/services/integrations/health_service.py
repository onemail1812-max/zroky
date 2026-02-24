"""Stub — ConnectorHealthService removed in stateless architecture."""

class ConnectorHealthService:
    """STUB: Replaced by stateless /health/providers endpoint in main.py."""
    def __init__(self, db=None, workspace_id=None):
        pass

    def get_detailed_health(self):
        return {
            "email": {"connected": False, "status": "STUB", "error_code": None},
            "calendar": {"connected": False, "status": "STUB", "error_code": None},
            "providers": {},
        }
