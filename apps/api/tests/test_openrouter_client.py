from __future__ import annotations
import pytest
import warnings
import json
from unittest.mock import patch, MagicMock

# Filter pydantic warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from app.services.llm.openrouter_client import OpenRouterClient, RateLimitError, APIError

@pytest.mark.asyncio
async def test_generate_success():
    """Test successful generation."""
    with patch("app.services.llm.openrouter_client.settings") as mock_settings:
        client = OpenRouterClient(api_key="sk-test", base_url="http://mock")
        
        # NOTE: client.generate() reads response.read() and does json.loads()
        # The mock must behave like a file handle that returns bytes
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": "Hello World"}}]
        }).encode("utf-8")
        
        # We also need __enter__/__exit__ because `with urllib.request.urlopen(...)` is used
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None

        with patch("urllib.request.urlopen", return_value=mock_response):
            result = await client.generate([{"role": "user", "content": "Hi"}])
            assert result == "Hello World"

@pytest.mark.asyncio
async def test_rate_limit_handling():
    """Test 429 rate limit raises specific error."""
    with patch("app.services.llm.openrouter_client.settings") as mock_settings:
        client = OpenRouterClient(api_key="sk-test", base_url="http://mock")
        
        from urllib.error import HTTPError
        # 429
        error = HTTPError(url="http://mock", code=429, msg="Too Many Requests", hdrs={}, fp=None)
        
        with patch("urllib.request.urlopen", side_effect=error):
            with pytest.raises(RateLimitError):
                await client.generate([{"role": "user", "content": "Hi"}])

@pytest.mark.asyncio
async def test_api_error_handling():
    """Test generic 500 error raises APIError."""
    with patch("app.services.llm.openrouter_client.settings") as mock_settings:
        client = OpenRouterClient(api_key="sk-test", base_url="http://mock")
        
        from urllib.error import HTTPError
        # 500
        error = HTTPError(url="http://mock", code=500, msg="Server Error", hdrs={}, fp=None)
        
        with patch("urllib.request.urlopen", side_effect=error):
             with pytest.raises(APIError):
                await client.generate([{"role": "user", "content": "Hi"}])
