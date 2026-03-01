from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError
import urllib.request
import urllib.parse
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import settings

# Setup logger
logger = logging.getLogger(__name__)

class OpenRouterError(Exception):
    """Base exception for OpenRouter client errors."""
    pass

class RateLimitError(OpenRouterError):
    """Rate limit exceeded."""
    pass

class ContextLengthError(OpenRouterError):
    """Context window exceeded."""
    pass

class APIError(OpenRouterError):
    """General API error."""
    pass


class OpenRouterClient:
    """Robust client for OpenRouter LLM API."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = base_url or settings.OPENROUTER_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": settings.OPENROUTER_APP_URL,
            "X-Title": settings.OPENROUTER_APP_NAME,
            "Content-Type": "application/json",
        }
        
    def _redact_sensitive_content(self, text: str) -> str:
        """Naive redaction for logs - in production use guardrails."""
        if not text:
            return ""
        # Don't log full emails in raw debug logs if possible
        if len(text) > 100:
            return text[:40] + "...[REDACTED]..." + text[-40:]
        return text

    @retry(
        retry=retry_if_exception_type((APIError, RateLimitError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = "google/gemini-2.5-flash-lite",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate completion from OpenRouter.
        
        Args:
            messages: List of {"role": "user", "content": "..."}
            model: Model ID (e.g. google/gemini-2.5-flash-lite)
            temperature: 0.0 to 1.0
            max_tokens: Max output tokens
            response_format: Optional {"type": "json_object"}
            
        Returns:
            Generated text content.
        """
        if not self.api_key:
            raise ValueError("Missing OpenRouter API Key")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if response_format:
            payload["response_format"] = response_format

        # Use sync urllib in threadpool if strictly async needed, but for simple use case
        # standard robust sync call inside async def works fine for low concurrency.
        # Ideally use aiohttp, but we want 0 external deps if possible or stick to standard lib.
        # Actually requirements.txt has `httpx` and `aiohttp` - let's use `httpx` if available or standard lib.
        # We'll use standard lib for zero-dep resilience in this focused client ensuring no version conflicts.
        
        url = f"{self.base_url}/chat/completions"
        data = json.dumps(payload).encode("utf-8")
        
        req = urllib.request.Request(url, data=data, headers=self.headers, method="POST")

        try:
            # We run the blocking IO in a thread to be async-friendly
            response_body = await asyncio.to_thread(self._make_request, req)
            data = json.loads(response_body)
            
            if "error" in data:
                error = data["error"]
                code = error.get("code")
                msg = error.get("message", "Unknown error")
                
                if code == 429: # OpenRouter specific or standard
                    raise RateLimitError(f"Rate limit: {msg}")
                if "context_length_exceeded" in str(code):
                     raise ContextLengthError(f"Context exceeded: {msg}")
                raise APIError(f"OpenRouter Error {code}: {msg}")

            choices = data.get("choices", [])
            if not choices:
                return ""
            
            content = choices[0].get("message", {}).get("content", "")
            return content

        except HTTPError as e:
            if e.code == 429:
                raise RateLimitError(f"Rate limit exceeded: {e.reason}")
            raise APIError(f"HTTP {e.code}: {e.reason}")
        except Exception as e:
            logger.error(f"LLM Call Failed: {str(e)}")
            raise APIError(f"Connection failed: {str(e)}")

    def _make_request(self, req: urllib.request.Request) -> bytes:
        with urllib.request.urlopen(req, timeout=30) as f:
            return f.read()

# Singleton instance
openrouter_client = OpenRouterClient()

def get_openrouter_client() -> OpenRouterClient:
    return openrouter_client
