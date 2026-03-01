from typing import Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from threading import RLock

class TTLCache:
    """A thread-safe in-memory cache with Time-To-Live (TTL) and max size eviction.
    Isolates entries by workspace_id implicitly if the key contains it.
    """
    def __init__(self, maxsize: int = 1000, ttl_seconds: int = 3600):
        self._cache: Dict[Any, Tuple[Any, datetime]] = {}
        self._maxsize = maxsize
        self._ttl = timedelta(seconds=ttl_seconds)
        self._lock = RLock()
        
    def get(self, key: Any) -> Any:
        with self._lock:
            if key not in self._cache:
                return None
            
            value, timestamp = self._cache[key]
            if datetime.now(timezone.utc) - timestamp > self._ttl:
                # Expired
                del self._cache[key]
                return None
                
            return value
            
    def set(self, key: Any, value: Any) -> None:
        with self._lock:
            # Eviction policy if full: remove oldest 10%
            if len(self._cache) >= self._maxsize:
                self._evict_oldest()
                
            self._cache[key] = (value, datetime.now(timezone.utc))
            
    def _evict_oldest(self) -> None:
        """Removes the oldest entries to free up space (10% of maxsize)."""
        if not self._cache:
            return
            
        items_to_remove = max(1, self._maxsize // 10)
        
        # Sort by timestamp (oldest first)
        sorted_items = sorted(self._cache.items(), key=lambda x: x[1][1])
        
        for key, _ in sorted_items[:items_to_remove]:
            del self._cache[key]
            
    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

# Global instances (thread-safe, size-capped, and TTL-enforced)
SEARCH_CACHE = TTLCache(maxsize=500, ttl_seconds=60)
CONTENT_CACHE = TTLCache(maxsize=1000, ttl_seconds=3600)