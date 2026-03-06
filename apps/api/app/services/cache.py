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

    redis_url = getattr(settings, "REDIS_URL", None) or ""
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

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern. Returns count of deleted keys."""
        full_pattern = self._make_key(pattern)
        deleted = 0

        # Redis: use SCAN + DELETE (safe for production, no KEYS command)
        if self._redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = self._redis.scan(cursor, match=full_pattern, count=100)
                    if keys:
                        self._redis.delete(*keys)
                        deleted += len(keys)
                    if cursor == 0:
                        break
            except Exception as exc:
                logger.warning("Cache.delete_pattern redis error: %s", exc)

        # In-memory fallback: filter matching keys
        import fnmatch
        to_remove = [k for k in _inmemory_store if fnmatch.fnmatch(k, full_pattern)]
        for k in to_remove:
            _inmemory_store.pop(k, None)
            deleted += 1

        return deleted


# ── Global cache instance ─────────────────────────────────────────────
response_cache = RedisCache(namespace="response")


# ── Response Caching Decorator ────────────────────────────────────────

import hashlib
import functools
from fastapi import Request
from fastapi.responses import JSONResponse


def cached_response(
    ttl_seconds: int = 60,
    prefix: str = "",
    vary_on_query: bool = True,
    vary_on_workspace: bool = True,
):
    """
    Decorator for FastAPI endpoint functions that caches JSON responses.

    Args:
        ttl_seconds: Cache TTL in seconds (default: 60)
        prefix: Cache key prefix (default: derived from function name)
        vary_on_query: Include query params in cache key (default: True)
        vary_on_workspace: Include workspace_id in cache key (default: True)

    Usage:
        @router.get("/counts")
        @cached_response(ttl_seconds=30, prefix="inbox_counts")
        async def get_inbox_counts(request: Request, ...):
            ...
    """

    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs (FastAPI injects it)
            request: Optional[Request] = kwargs.get("request")
            if request is None:
                # Try positional args — some endpoints have request as first arg
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request is None:
                # Can't cache without request context — pass through
                return await func(*args, **kwargs)

            # Build cache key
            key_prefix = prefix or func.__name__
            key_parts = [key_prefix]

            if vary_on_workspace:
                # Get workspace from header or context
                ws_id = request.headers.get("x-workspace-id", "default")
                key_parts.append(f"ws:{ws_id}")

            # varying by path to ensure path parameters (like IDs) create distinct cache keys
            key_parts.append(f"p:{hashlib.md5(request.url.path.encode()).hexdigest()[:8]}")

            if vary_on_query:
                # Sort query params for deterministic keys
                sorted_params = sorted(request.query_params.items())
                if sorted_params:
                    param_str = "&".join(f"{k}={v}" for k, v in sorted_params)
                    key_parts.append(f"q:{hashlib.md5(param_str.encode()).hexdigest()[:12]}")

            cache_key = ":".join(key_parts)

            # Try cache hit
            cached = response_cache.get_json(cache_key)
            if cached is not None:
                return JSONResponse(
                    content=cached["body"],
                    status_code=cached.get("status", 200),
                    headers={"X-Cache": "HIT"},
                )

            # Execute endpoint
            result = await func(*args, **kwargs)

            # Cache the response
            # Handle both dict returns and JSONResponse objects
            if isinstance(result, JSONResponse):
                try:
                    body = json.loads(result.body.decode())
                    response_cache.set_json(
                        cache_key,
                        {"body": body, "status": result.status_code},
                        ttl_seconds=ttl_seconds,
                    )
                except Exception:
                    pass  # Don't break the response on cache failures
            elif isinstance(result, dict):
                response_cache.set_json(
                    cache_key,
                    {"body": result, "status": 200},
                    ttl_seconds=ttl_seconds,
                )
                # Return with cache header
                return JSONResponse(content=result, headers={"X-Cache": "MISS"})

            return result

        return wrapper

    return decorator


def invalidate_cache(prefix: str, workspace_id: Optional[str] = None) -> int:
    """
    Invalidate cached responses by prefix and optional workspace.

    Args:
        prefix: The cache prefix used in @cached_response
        workspace_id: If provided, only invalidate for this workspace

    Returns:
        Number of cache entries deleted

    Usage:
        # After sending an email:
        invalidate_cache("inbox_counts", workspace_id=context.workspace_id)
        invalidate_cache("inbox_threads", workspace_id=context.workspace_id)
    """
    if workspace_id:
        pattern = f"{prefix}:ws:{workspace_id}:*"
    else:
        pattern = f"{prefix}:*"
    return response_cache.delete_pattern(pattern)
