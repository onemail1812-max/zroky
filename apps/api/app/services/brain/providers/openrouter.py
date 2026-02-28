"""OpenRouter provider adapter for the Brain service."""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import aiohttp

from app.config import settings
from app.services.brain.errors import BrainConfigurationError, BrainProviderError, BrainTimeoutError
from app.services.brain.guardrails import safe_json_excerpt

from ..schemas.brain_types import BrainResponse

logger = logging.getLogger(__name__)


class OpenRouterProvider:
    _session: Optional[aiohttp.ClientSession] = None

    def __init__(self, api_key: str, default_model: str, base_url: Optional[str] = None):
        if not api_key:
            raise BrainConfigurationError("OPENROUTER_API_KEY is missing")
        if not default_model:
            raise BrainConfigurationError("Default model is missing")

        self.api_key = api_key
        self.base_url = (base_url or settings.openrouter_base_url or "https://openrouter.ai/api/v1").rstrip("/")
        self.default_model = default_model

    async def _get_session(self) -> aiohttp.ClientSession:
        """Reuse a single aiohttp session for connection pooling."""
        if OpenRouterProvider._session is None or OpenRouterProvider._session.closed:
            connector = aiohttp.TCPConnector(limit=10, ttl_dns_cache=300)
            OpenRouterProvider._session = aiohttp.ClientSession(connector=connector)
        return OpenRouterProvider._session

    async def generate(
        self,
        *,
        prompt: str,
        system_prompt: str,
        model: str,
        temperature: float,
        timeout_seconds: int,
        max_tokens: int,
        images: Optional[list[str]] = None,
    ) -> BrainResponse:
        actual_model = model or self.default_model
        request_url = f"{self.base_url}/chat/completions"
        auth_token = self.api_key

        if (actual_model.startswith("groq/") or "llama-3" in actual_model.lower()) and settings.groq_api_key:
            logger.info("⚡ Enterprise Routing: Diverting to native Groq for model %s", actual_model)
            request_url = "https://api.groq.com/openai/v1/chat/completions"
            auth_token = settings.groq_api_key
            if actual_model.startswith("groq/"):
                actual_model = actual_model.replace("groq/", "", 1)
            # Ensure compatible model names for Groq natively
            if "llama-3.3-70b" in actual_model.lower():
                actual_model = "llama-3.3-70b-versatile"
            elif "llama-3.1-8b" in actual_model.lower():
                actual_model = "llama-3.1-8b-instant"

        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json",
        }
        
        # Openrouter specific headers 
        if "openrouter.ai" in request_url:
            headers["HTTP-Referer"] = settings.openrouter_app_url
            headers["X-Title"] = settings.openrouter_app_name

        user_content: Any = prompt
        if images:
            user_content = [{"type": "text", "text": prompt}]
            for img in images:
                # Ensure it has the data:image prefix if it's base64 and missing it
                img_url = img
                if not img.startswith("http") and not img.startswith("data:"):
                    img_url = f"data:image/jpeg;base64,{img}"
                
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": img_url}
                })

        payload: Dict[str, Any] = {
            "model": actual_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": float(temperature),
            "max_tokens": int(max_tokens),
        }

        start = time.time()
        timeout = aiohttp.ClientTimeout(total=timeout_seconds)

        try:
            session = await self._get_session()
            async with session.post(
                request_url,
                headers=headers,
                json=payload,
                timeout=timeout,
            ) as resp:

                response_text = await resp.text()
                if resp.status >= 400:
                    excerpt = safe_json_excerpt(response_text, limit=180)
                    logger.warning("OpenRouter error status=%s body=%s", resp.status, excerpt)
                    raise BrainProviderError(f"OpenRouter returned status {resp.status}")

                try:
                    data = await resp.json()
                except Exception as exc:
                    excerpt = safe_json_excerpt(response_text, limit=180)
                    logger.warning("OpenRouter returned non-JSON response: %s", excerpt)
                    raise BrainProviderError("OpenRouter returned invalid JSON") from exc

                choices = data.get("choices") or []
                if not choices:
                    raise BrainProviderError("OpenRouter response did not include choices")

                message = (choices[0] or {}).get("message") or {}
                content = str(message.get("content") or "")
                usage = data.get("usage") or {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                }
                finish_reason = str((choices[0] or {}).get("finish_reason") or "stop")

                return BrainResponse(
                    content=content,
                    usage=usage,
                    model_used=str(model or self.default_model),
                    latency_ms=int((time.time() - start) * 1000),
                    finish_reason=finish_reason,
                )
        except aiohttp.ClientError as exc:
            raise BrainProviderError(f"Network error while calling OpenRouter: {exc}") from exc
        except TimeoutError as exc:
            raise BrainTimeoutError("Timeout while calling OpenRouter") from exc

    async def generate_stream(
        self,
        *,
        prompt: str,
        system_prompt: str,
        model: str,
        temperature: float,
        images: Optional[list[str]] = None,
    ):
        """Streaming version of generate, specifically for chat streaming."""
        from openai import AsyncOpenAI
        
        actual_model = model or self.default_model
        base_url = self.base_url
        auth_token = self.api_key

        if (actual_model.startswith("groq/") or "llama-3" in actual_model.lower()) and settings.groq_api_key:
            logger.info("⚡ Enterprise Routing (Stream): Diverting to native Groq for model %s", actual_model)
            base_url = "https://api.groq.com/openai/v1"
            auth_token = settings.groq_api_key
            if actual_model.startswith("groq/"):
                actual_model = actual_model.replace("groq/", "", 1)
            if "llama-3.3-70b" in actual_model.lower():
                actual_model = "llama-3.3-70b-versatile"
            elif "llama-3.1-8b" in actual_model.lower():
                actual_model = "llama-3.1-8b-instant"

        client = AsyncOpenAI(
            base_url=base_url,
            api_key=auth_token,
            default_headers={
                "HTTP-Referer": settings.openrouter_app_url,
                "X-Title": settings.openrouter_app_name,
            } if "openrouter.ai" in base_url else None,
        )

        user_content: Any = prompt
        if images:
            user_content = [{"type": "text", "text": prompt}]
            for img in images:
                img_url = img
                if not img.startswith("http") and not img.startswith("data:"):
                    img_url = f"data:image/jpeg;base64,{img}"
                
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": img_url}
                })

        stream = await client.chat.completions.create(
            model=actual_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            stream=True,
            temperature=temperature,
        )
        
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
