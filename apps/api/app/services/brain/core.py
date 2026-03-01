"""Unified Brain service facade with guardrails, retries, and safe logging."""

from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from typing import Any, Dict, Optional, Type, TypeVar, Union
from pydantic import BaseModel

from app.config import settings
from app.services.brain.errors import BrainError, BrainProviderError, BrainValidationError
from app.services.brain.guardrails import (
    detect_prompt_injection,
    fingerprint,
    redact_text,
    sanitize_context,
    validate_prompt,
)

from .providers.openrouter import OpenRouterProvider
from .schemas.brain_types import BrainConfig, BrainRequest, BrainResponse

logger = logging.getLogger(__name__)


T = TypeVar("T", bound=BaseModel)

class Brain:
    """Secure Brain facade used by Aaliyah and other agents."""

    def __init__(self, config: Optional[BrainConfig] = None, provider: Optional[OpenRouterProvider] = None):
        self.config = config or BrainConfig(model=settings.BRAIN_MODEL)
        self.provider = provider or OpenRouterProvider(
            api_key=settings.BRAIN_API_KEY or settings.OPENROUTER_API_KEY,
            default_model=self.config.model,
            base_url=settings.OPENROUTER_BASE_URL,
        )
        logger.info("Brain initialized model=%s", self.config.model)

    async def think(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful AI assistant.",
        context: Optional[Dict[str, Any]] = None,
        model_override: Optional[str] = None,
        temperature_override: Optional[float] = None,
        images: Optional[list[str]] = None,
    ) -> BrainResponse:
        """
        Primary LLM entrypoint.

        Security:
        - input validation
        - prompt injection detection
        - context redaction for logs

        Reliability:
        - bounded retries with exponential backoff
        """

        try:
            request = BrainRequest(
                prompt=prompt,
                system_prompt=system_prompt,
                context=context,
                model_override=model_override,
                temperature_override=temperature_override,
                images=images,
            )
        except Exception as exc:
            raise BrainValidationError(str(exc)) from exc

        validate_prompt(request.prompt, request.system_prompt)
        safe_context = sanitize_context(request.context)
        prompt_fp = fingerprint(request.prompt)

        if detect_prompt_injection(request.prompt):
            logger.warning("Prompt injection signal detected prompt_fp=%s", prompt_fp)

        # MOCK FALLBACK — only when API key is missing or placeholder
        _key = str(settings.OPENROUTER_API_KEY or "")
        _is_placeholder = not _key or _key.startswith("your_") or "****************" in _key
        if _is_placeholder:
             logger.warning("Brain running in MOCK mode due to missing/invalid API key.")
             
             # Context-aware mock: detect if we need a natural reply or structured JSON
             prompt_lower = prompt.lower()
             system_lower = (system_prompt or "").lower()
             
             # Chat/conversational prompts → return natural language
             if any(marker in prompt_lower or marker in system_lower for marker in (
                 "respond helpfully", "respond naturally", "user says:", 
                 "morning briefing", "daily briefing",
             )):
                 mock_content = (
                     "Good morning! Here's a quick overview: you have a few items in your inbox "
                     "and your calendar looks manageable today. Let me know if you'd like me to "
                     "dive into anything specific — I'm here to help. 🚀"
                 )
             # Draft prompts → return structured JSON
             elif "strict json" in system_lower or "return json" in system_lower or "return valid json" in system_lower:
                 mock_content = (
                     '```json\n'
                     '{"subject": "Re: Your Request", "body": "Thank you for reaching out. '
                     'I wanted to follow up on this — let me know if you need anything else.", '
                     '"tone_tags": ["professional", "warm"], "confidence": 0.85}\n'
                     '```'
                 )
             # Triage/classification → return classification JSON
             elif "classifier" in system_lower or "classify" in system_lower or "triage" in system_lower:
                 mock_content = (
                     '{"category": "FYI", "priority": "Medium", "is_noise": false, '
                     '"confidence": 0.75, "reasoning": "General message requiring review."}'
                 )
             # Default structured response
             else:
                 mock_content = (
                     '```json\n{"summary": "Mock Summary", "people_involved": ["Mock Person"], '
                     '"recommendation": "Mock Rec", "talking_points": ["Point 1"], "relevant_links": []}\n```'
                 )
             
             return BrainResponse(
                 content=mock_content,
                 model_used="mock-model-v1",
                 latency_ms=10,
                 usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
                 finish_reason="stop"
             )

        model = request.model_override or self.config.model
        temperature = request.temperature_override if request.temperature_override is not None else self.config.temperature

        last_error: Optional[Exception] = None
        call_start = time.time()
        
        # Phase 9: Resilience - Fallback chain
        primary_model = model
        backup_model = "google/gemini-flash-1.5" # High availability fallback
        

        for attempt in range(self.config.retry_count + 1):
            current_model = primary_model if attempt < self.config.retry_count else backup_model
            
            try:
                response = await self.provider.generate(
                    prompt=request.prompt,
                    system_prompt=request.system_prompt,
                    model=current_model,
                    temperature=temperature,
                    timeout_seconds=self.config.timeout_seconds,
                    max_tokens=self.config.max_tokens,
                    images=request.images,
                )
                
                # If we used fallback, log it clearly
                if current_model != primary_model:
                    logger.warning("Brain used fallback model successfully. Primary failed.")
                
                logger.info(
                    "Brain call success model=%s latency_ms=%s prompt_fp=%s usage=%s",
                    response.model_used,
                    response.latency_ms,
                    prompt_fp,
                    response.usage,
                )
                return response
            except BrainError as exc:
                last_error = exc
                if attempt >= self.config.retry_count:
                    break
                
                # Exponential backoff + Jitter
                base_backoff = self.config.retry_backoff_seconds * (2**attempt)
                jitter = random.uniform(0, 0.5)
                backoff = base_backoff + jitter
                
                logger.warning(
                    "Brain call retrying attempt=%s model=%s wait_s=%.2f prompt_fp=%s reason=%s",
                    attempt + 1,
                    current_model,
                    backoff,
                    prompt_fp,
                    exc.code,
                )
                await asyncio.sleep(backoff)
            except Exception as exc:  # noqa: BLE001
                last_error = BrainProviderError(f"Unhandled provider error: {exc}")
                if attempt >= self.config.retry_count:
                    break
                backoff = self.config.retry_backoff_seconds * (2**attempt) + random.uniform(0, 0.5)
                await asyncio.sleep(backoff)

        total_latency_ms = int((time.time() - call_start) * 1000)
        
        # MOCK FALLBACK: Only when API key is genuinely missing/invalid — NOT just because debug=True
        _api_key = str(settings.OPENROUTER_API_KEY or "")
        if not _api_key or _api_key.startswith("sk-or-v1-****") or _api_key == "changeme":
             logger.warning(
                 "Brain MOCK mode: no valid API key configured. Set OPENROUTER_API_KEY in .env. prompt_fp=%s",
                 prompt_fp,
             )
             return BrainResponse(
                 content="[MOCK BRAIN] This is a simulated response from Aaliyah. The OpenRouter API key is missing or invalid in this environment.",
                 model_used="mock-model-v1",
                 latency_ms=10,
                 usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
                 finish_reason="stop"
             )

        if isinstance(last_error, BrainError):
            logger.error(
                "Brain call failed code=%s latency_ms=%s prompt_fp=%s context=%s",
                last_error.code,
                total_latency_ms,
                prompt_fp,
                safe_context,
            )
            raise last_error

        logger.error(
            "Brain call failed unexpectedly latency_ms=%s prompt_fp=%s err=%s context=%s",
            total_latency_ms,
            prompt_fp,
            redact_text(str(last_error or "unknown error")),
            safe_context,
        )
        raise BrainProviderError("Unknown brain failure")

    async def think_stream(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful AI assistant.",
        model_override: Optional[str] = None,
        temperature_override: Optional[float] = None,
        images: Optional[list[str]] = None,
    ):
        """
        Streaming LLM entrypoint. Yields text chunks as they arrive.
        Used by the chat handler for real-time streamed responses.
        """
        # MOCK FALLBACK — only when API key is missing or placeholder
        _key = str(settings.OPENROUTER_API_KEY or "")
        _is_placeholder = not _key or _key.startswith("your_") or "****************" in _key
        if _is_placeholder:
            logger.warning("Brain streaming in MOCK mode due to missing/invalid API key.")
            mock_content = (
                "I'm currently running in demo mode. "
                "Connect a valid API key to unlock full capabilities."
            )
            for word in mock_content.split(" "):
                yield word + " "
                await asyncio.sleep(0.03)
            return

        model = model_override or self.config.model
        temperature = temperature_override if temperature_override is not None else self.config.temperature

        try:
            async for chunk in self.provider.generate_stream(
                prompt=prompt,
                system_prompt=system_prompt,
                model=model,
                temperature=temperature,
                images=images,
            ):
                yield chunk
        except Exception as exc:
            logger.error("Brain streaming failed: %s", exc, exc_info=True)
            yield "I encountered an issue processing your request. Please try again."

    async def reason(self, task: str, context: Dict[str, Any]) -> BrainResponse:
        """Reasoning wrapper with strict explicit instructions."""
        cot_system_prompt = (
            "You are a rigorous reasoning engine. "
            "Use concise internal analysis and then provide a direct final answer."
        )
        return await self.think(task, system_prompt=cot_system_prompt, context=context)

    async def think_json(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: str = "You are a precise JSON assistant.",
        context: Optional[Dict[str, Any]] = None,
        model_override: Optional[str] = None,
        temperature_override: Optional[float] = 0.0,
    ) -> T:
        """
        Enforce structured JSON output using a Pydantic model.
        Uses a single pass and manual parsing for provider compatibility.
        """
        schema = response_model.model_json_schema()
        json_system_prompt = (
            f"{system_prompt}\n"
            "STRICT RULES:\n"
            "1. RETURN JSON ONLY.\n"
            "2. NO EXPLANATIONS or MARKDOWN outside the JSON block.\n"
            f"3. FOLLOW THIS SCHEMA: {json.dumps(schema)}"
        )
        
        # Use a retry loop for parsing
        for _ in range(2):
            response = await self.think(
                prompt=prompt,
                system_prompt=json_system_prompt,
                context=context,
                model_override=model_override,
                temperature_override=temperature_override
            )
            
            content = response.content.strip()
            # Basic cleanup if model includes markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            try:
                # Extract first { and last } if there's noise
                if not content.startswith("{"):
                    match = re.search(r"(\{.*\})", content, re.DOTALL)
                    if match:
                        content = match.group(1)
                
                return response_model.model_validate_json(content)
            except Exception as exc:
                logger.warning("Structured output parsing failed, retrying... err=%s", exc)
                continue
        
        raise BrainError(f"Failed to produce valid structured output for {response_model.__name__}")

