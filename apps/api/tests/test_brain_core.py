import os
import unittest

# Required env vars before importing app modules.
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("AALIYAH_API_KEY", "test-key")
os.environ.setdefault("BRAIN_API_KEY", "test-key")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key")
os.environ.setdefault("OAUTH_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")

from app.services.brain.core import Brain
from app.services.brain.errors import BrainProviderError, BrainValidationError
from app.services.brain.schemas.brain_types import BrainConfig, BrainResponse


class FlakyProvider:
    def __init__(self, failures_before_success: int = 1):
        self.failures_before_success = failures_before_success
        self.calls = 0

    async def generate(self, **_kwargs):
        self.calls += 1
        if self.calls <= self.failures_before_success:
            raise BrainProviderError("temporary provider failure")
        return BrainResponse(
            content="ok",
            usage={"total_tokens": 10},
            model_used="test-model",
            latency_ms=3,
            finish_reason="stop",
        )


class BrainCoreTests(unittest.IsolatedAsyncioTestCase):
    async def test_brain_retries_and_succeeds(self):
        provider = FlakyProvider(failures_before_success=1)
        brain = Brain(
            config=BrainConfig(model="test-model", retry_count=2, retry_backoff_seconds=0.1),
            provider=provider,
        )
        response = await brain.think("Draft a short reply", "You are helpful")
        self.assertEqual(response.content, "ok")
        self.assertEqual(provider.calls, 2)

    async def test_brain_validation_rejects_blank_prompt(self):
        brain = Brain(config=BrainConfig(model="test-model"), provider=FlakyProvider(failures_before_success=0))
        with self.assertRaises(BrainValidationError):
            await brain.think("", "You are helpful")


if __name__ == "__main__":
    unittest.main()
