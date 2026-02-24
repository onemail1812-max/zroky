"""Stub — connector_state removed in stateless architecture."""
import json
import base64

def encode_state(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode()

def decode_state(state: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(state.encode()).decode())
