"""Unified Redis Cache Service.

Provides a robust interface for caching JSON-serializable data,
with automatic fallback to in-memory storage if Redis is unavailable.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional, Dict

from app.config import settings

logger = logging.getLogger(__name__)

# Singleton Redis client
_redis_client: Any = None
_redis_init_attempted: bool = False

# Fallback store
_inmemory_store: Dict[str, str] = {}


def get_redis_client() -> Any:
    """Lazy-init Redis connection."""
    global _redis_client, _redis_init_attempted
    if _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True

    redis_url = getattr(settings, "redis_url", None) or ""
    if not redis_url.strip():
        logger.info("Cache: no REDIS_URL configured — using in-memory fallback")
        return None

    try:
        import redis as _redis_lib

        _redis_client = _redis_lib.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
        )
        _redis_client.ping()
        logger.info("Cache: connected to Redis at %s", redis_url.split("@")[-1])
    except Exception as exc:
        logger.warning(
            "Cache: Redis connection failed (%s) — using in-memory fallback", exc
        )
        _redis_client = None

    return _redis_client


class RedisCache:
    """Simple JSON-aware cache wrapper."""

    def __init__(self, namespace: str = "cache"):
        self.namespace = namespace
        self._redis = get_redis_client()

    def _make_key(self, key: str) -> str:
        return f"{self.namespace}:{key}"

    def get_json(self, key: str) -> Optional[Any]:
        """Retrieve and deserialize JSON data."""
        full_key = self._make_key(key)
        raw = None
        
        if self._redis:
            try:
                raw = self._redis.get(full_key)
            except Exception as exc:
                logger.warning("Cache.get redis error: %s", exc)
        
        # Fallback check
        if raw is None:
            raw = _inmemory_store.get(full_key)

        if not raw:
            return None

        try:
            return json.loads(raw)
        except Exception:
            return None

    def set_json(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Serialize and store JSON data with TTL."""
        full_key = self._make_key(key)
        try:
            serialized = json.dumps(value, default=str)
        except Exception as exc:
            logger.error("Cache.set serialization error: %s", exc)
            return

        if self._redis:
            try:
                self._redis.setex(full_key, ttl_seconds, serialized)
            except Exception as exc:
                logger.warning("Cache.set redis error: %s", exc)

        # Always write to memory fallback (but we don't implement TTL pruning for memory)
        _inmemory_store[full_key] = serialized

    def delete(self, key: str) -> None:
        full_key = self._make_key(key)
        if self._redis:
            try:
                self._redis.delete(full_key)
            except Exception:
                pass
        _inmemory_store.pop(full_key, None)
