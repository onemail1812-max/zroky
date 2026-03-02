
import logging
import asyncio
from app.services.cache import RedisCache, _inmemory_store
import pytest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@pytest.mark.asyncio
async def test_cache_fallback():
    print("--- [1] Checking Redis Connection ---")
    cache = RedisCache("test")
    # We expect this to fail gracefully and use in-memory
    val = cache.get_json("test_key")
    logger.info(f"Initial get (should be None): {val}")
    
    print("--- [2] Setting Value ---")
    DATA = {"foo": "bar", "val": 123}
    cache.set_json("test_key", DATA)
    
    print("--- [3] Getting Value ---")
    retrieved = cache.get_json("test_key")
    if retrieved == DATA:
        logger.info("✅ SUCCESS: Cache (fallback) correctly stored and retrieved JSON.")
    else:
        logger.error(f"❌ FAILURE: Expected {DATA}, got {retrieved}")
        exit(1)

    print("--- [4] Verifying In-Memory Store ---")
    # Verify it's actually in _inmemory_store
    full_key = "test:test_key"
    if full_key in _inmemory_store:
        logger.info(f"✅ SUCCESS: Found key '{full_key}' in _inmemory_store.")
    else:
        logger.error(f"❌ FAILURE: Key '{full_key}' NOT present in _inmemory_store.")
        exit(1)
        
    print("--- [5] Deleting Value ---")
    cache.delete("test_key")
    val_after = cache.get_json("test_key")
    if val_after is None:
        logger.info("✅ SUCCESS: Value correctly deleted.")
    else:
        logger.error("❌ FAILURE: Value still exists after delete.")
        exit(1)

if __name__ == "__main__":
    asyncio.run(test_cache_fallback())
