"""In-memory request controls for idempotency and rate limiting."""

from __future__ import annotations

import threading
import time
from typing import Any, Optional


class InMemoryRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = threading.Lock()
        self._buckets: dict[str, list[float]] = {}

    def check(self, key: str) -> tuple[bool, int]:
        now = time.time()
        with self._lock:
            bucket = self._buckets.setdefault(key, [])
            cutoff = now - self.window_seconds
            bucket[:] = [ts for ts in bucket if ts >= cutoff]
            if len(bucket) >= self.max_requests:
                retry_after = int(max(1, self.window_seconds - (now - bucket[0])))
                return False, retry_after
            bucket.append(now)
        return True, 0


class InMemoryIdempotencyStore:
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._values: dict[str, tuple[float, Any]] = {}

    def _cleanup(self, now: float) -> None:
        expired = [k for k, (exp, _) in self._values.items() if exp <= now]
        for key in expired:
            self._values.pop(key, None)

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            self._cleanup(now)
            item = self._values.get(key)
            if not item:
                return None
            return item[1]

    def set(self, key: str, value: Any) -> None:
        now = time.time()
        with self._lock:
            self._cleanup(now)
            self._values[key] = (now + self.ttl_seconds, value)
