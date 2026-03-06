import json
import logging
from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
from threading import RLock

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Redis connection lazy loader (mirrors hot_state.py)
# ---------------------------------------------------------------------------
_redis_client: Any = None
_redis_init_attempted: bool = False

def _get_redis() -> Any:
    global _redis_client, _redis_init_attempted
    if _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True

    redis_url = getattr(settings, "REDIS_URL", None) or ""
    if not redis_url.strip():
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
    except Exception as exc:
        logger.warning("SearchCache: Redis connection failed (%s) — using in-memory only", exc)
        _redis_client = None
    return _redis_client

class TTLCache:
    """A thread-safe cache with Time-To-Live (TTL) and Redis persistence fallback."""
    def __init__(self, name: str, maxsize: int = 1000, ttl_seconds: int = 3600):
        self.name = name
        self._cache: Dict[Any, Tuple[Any, datetime]] = {}
        self._maxsize = maxsize
        self._ttl_delta = timedelta(seconds=ttl_seconds)
        self._ttl_seconds = ttl_seconds
        self._lock = RLock()
        
    def _get_redis_key(self, key: Any) -> str:
        # Convert tuple keys (workspace_id, query) to strings
        if isinstance(key, (tuple, list)):
            key_str = ":".join(str(k) for k in key)
        else:
            key_str = str(key)
        return f"aaliyah:cache:{self.name}:{key_str}"

    def get(self, key: Any) -> Any:
        # 1. Try Redis first
        redis = _get_redis()
        if redis:
            try:
                rkey = self._get_redis_key(key)
                raw = redis.get(rkey)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"SearchCache({self.name}) redis get error: {e}")

        # 2. Fallback to in-memory
        with self._lock:
            if key not in self._cache:
                return None
            
            value, timestamp = self._cache[key]
            if datetime.now(timezone.utc) - timestamp > self._ttl_delta:
                del self._cache[key]
                return None
                
            return value
            
    def set(self, key: Any, value: Any) -> None:
        # 1. Save to Redis
        redis = _get_redis()
        if redis:
            try:
                rkey = self._get_redis_key(key)
                redis.setex(rkey, self._ttl_seconds, json.dumps(value, default=str))
            except Exception as e:
                logger.warning(f"SearchCache({self.name}) redis set error: {e}")

        # 2. Save to in-memory
        with self._lock:
            if len(self._cache) >= self._maxsize:
                self._evict_oldest()
            self._cache[key] = (value, datetime.now(timezone.utc))
            
    def _evict_oldest(self) -> None:
        if not self._cache: return
        items_to_remove = max(1, self._maxsize // 10)
        sorted_items = sorted(self._cache.items(), key=lambda x: x[1][1])
        for k, _ in sorted_items[:items_to_remove]:
            del self._cache[k]
            
    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
        redis = _get_redis()
        if redis:
            try:
                # Note: Pattern delete is slow but clear() is rare
                keys = redis.keys(f"aaliyah:cache:{self.name}:*")
                if keys: redis.delete(*keys)
            except Exception: pass

# Global instances
SEARCH_CACHE = TTLCache(name="search", maxsize=500, ttl_seconds=60)
CONTENT_CACHE = TTLCache(name="content", maxsize=1000, ttl_seconds=3600)
