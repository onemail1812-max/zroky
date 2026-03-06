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
    _openai_clients: Dict[str, Any] = {} # Keyed by base_url + api_key

    def __init__(self, api_key: str, default_model: str, base_url: Optional[str] = None):
        if not api_key:
            raise BrainConfigurationError("OPENROUTER_API_KEY is missing")
        if not default_model:
            raise BrainConfigurationError("Default model is missing")

        self.api_key = api_key
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL or "https://openrouter.ai/api/v1").rstrip("/")
        self.default_model = default_model

    async def _get_client(self, model: str) -> tuple[Any, str]: # Changed AsyncOpenAI to Any to avoid circular import if not needed at top
        """Get or create an AsyncOpenAI client, potentially routing to native Groq."""
        from openai import AsyncOpenAI
        actual_model = model or self.default_model
        base_url = self.base_url
        auth_token = self.api_key

        if (actual_model.startswith("groq/") or "llama-3" in actual_model.lower()) and settings.GROQ_API_KEY:
            logger.info("⚡ Enterprise Routing: Diverting to native Groq for model %s", actual_model)
            base_url = "https://api.groq.com/openai/v1"
            auth_token = settings.GROQ_API_KEY
            if actual_model.startswith("groq/"):
                actual_model = actual_model.replace("groq/", "", 1)
            # Ensure compatible model names for Groq natively
            if "llama-3.3-70b" in actual_model.lower():
                actual_model = "llama-3.3-70b-versatile"
            elif "llama-3.1-8b" in actual_model.lower():
                actual_model = "llama-3.1-8b-instant"

        client_key = f"{base_url}|{auth_token}"
        if client_key not in OpenRouterProvider._openai_clients:
            OpenRouterProvider._openai_clients[client_key] = AsyncOpenAI(
                base_url=base_url,
                api_key=auth_token,
                default_headers={
                    "HTTP-Referer": settings.OPENROUTER_APP_URL,
                    "X-Title": settings.OPENROUTER_APP_NAME,
                } if "openrouter.ai" in base_url else None,
            )
        return OpenRouterProvider._openai_clients[client_key], actual_model

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
        client, actual_model = await self._get_client(model)
        
        user_content: Any = prompt
        if images:
            user_content = [{"type": "text", "text": prompt}]
            for img in images:
                img_url = img
                if not img.startswith("http") and not img.startswith("data:"):
                    img_url = f"data:image/jpeg;base64,{img}"
                user_content.append({"type": "image_url", "image_url": {"url": img_url}})

        start = time.time()
        try:
            response = await client.chat.completions.create(
                model=actual_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=float(temperature),
                max_tokens=int(max_tokens),
                timeout=float(timeout_seconds),
            )

            content = response.choices[0].message.content or ""
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }
            finish_reason = response.choices[0].finish_reason or "stop"

            return BrainResponse(
                content=content,
                usage=usage,
                model_used=actual_model,
                latency_ms=int((time.time() - start) * 1000),
                finish_reason=finish_reason,
            )
        except Exception as exc:
            logger.error("Provider call failed model=%s err=%s", actual_model, exc)
            if "timeout" in str(exc).lower():
                raise BrainTimeoutError(str(exc)) from exc
            raise BrainProviderError(str(exc)) from exc

    async def generate_stream(
        self,
        *,
        prompt: str,
        system_prompt: str,
        model: str,
        temperature: float,
        timeout_seconds: int = 30,
        chunk_timeout_seconds: int = 10,
        images: Optional[list[str]] = None,
    ):
        """Streaming version of generate, specifically for chat streaming."""
        client, actual_model = await self._get_client(model)

        user_content: Any = prompt
        if images:
            user_content = [{"type": "text", "text": prompt}]
            for img in images:
                img_url = img
                if not img.startswith("http") and not img.startswith("data:"):
                    img_url = f"data:image/jpeg;base64,{img}"
                user_content.append({"type": "image_url", "image_url": {"url": img_url}})

        stream = await client.chat.completions.create(
            model=actual_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            stream=True,
            temperature=temperature,
            timeout=float(timeout_seconds),
        )
        
        iterator = stream.__aiter__()
        while True:
            try:
                # Enforce per-chunk timeout
                chunk = await asyncio.wait_for(iterator.__anext__(), timeout=float(chunk_timeout_seconds))
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield delta.content
            except StopAsyncIteration:
                break
            except asyncio.TimeoutError:
                logger.error("Brain stream chunk timeout model=%s after %ss", actual_model, chunk_timeout_seconds)
                raise BrainTimeoutError(f"Stream chunk timeout after {chunk_timeout_seconds}s")
            except Exception as exc:
                logger.error("Brain stream error model=%s err=%s", actual_model, exc)
                raise BrainProviderError(str(exc))
