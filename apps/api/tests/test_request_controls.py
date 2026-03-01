import unittest

from app.agents.aaliyah.core.request_controls import InMemoryIdempotencyStore, InMemoryRateLimiter


class RequestControlsTests(unittest.TestCase):
    def test_rate_limiter_blocks_after_limit(self):
        limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60)
        self.assertEqual(limiter.check("u1")[0], True)
        self.assertEqual(limiter.check("u1")[0], True)
        allowed, retry_after = limiter.check("u1")
        self.assertEqual(allowed, False)
        self.assertGreaterEqual(retry_after, 1)

    def test_idempotency_store_roundtrip(self):
        store = InMemoryIdempotencyStore(ttl_seconds=60)
        self.assertIsNone(store.get("k1"))
        store.set("k1", {"ok": True})
        self.assertEqual(store.get("k1"), {"ok": True})


if __name__ == "__main__":
    unittest.main()
