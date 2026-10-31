"""LLM router with automatic fallback across providers and caching."""

import asyncio
import hashlib
import json
import logging
from typing import Any

from pydantic import BaseModel

from ..config import get_settings
from .providers.gemini import call_gemini
from .providers.groq import call_groq
from .providers.openrouter import call_openrouter
from ..db import repo

logger = logging.getLogger(__name__)


def _cache_key(task: str, messages: list[dict]) -> str:
    """Compute a deterministic hash for caching."""
    blob = json.dumps({"task": task, "messages": messages}, sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()


def _truncate_messages(messages: list[dict], max_chars: int = 120_000) -> list[dict]:
    """Truncate message content if total length exceeds budget."""
    total = sum(len(m.get("content", "")) for m in messages)
    if total <= max_chars:
        return messages

    ratio = max_chars / total
    truncated: list[dict] = []
    for m in messages:
        content = m.get("content", "")
        new_len = int(len(content) * ratio)
        truncated.append({**m, "content": content[:new_len]})
    return truncated


def _select_models(tier: str) -> list[tuple[str, str, Any]]:
    """Return ordered list of (provider_name, model_name, call_fn) for the tier."""
    settings = get_settings()
    providers: list[tuple[str, str, Any]] = []

    if tier == "reasoning":
        if settings.GEMINI_API_KEY:
            providers.append(("gemini", settings.PRIMARY_REASONING_MODEL, call_gemini))
        if settings.GROQ_API_KEY:
            providers.append(("groq", settings.GROQ_REASONING_MODEL, call_groq))
        if settings.OPENROUTER_API_KEY:
            providers.append(("openrouter", settings.OPENROUTER_REASONING_MODEL, call_openrouter))
    else:
        if settings.GEMINI_API_KEY:
            providers.append(("gemini", settings.PRIMARY_FAST_MODEL, call_gemini))
        if settings.GROQ_API_KEY:
            providers.append(("groq", settings.GROQ_FAST_MODEL, call_groq))
        if settings.OPENROUTER_API_KEY:
            providers.append(("openrouter", settings.OPENROUTER_FAST_MODEL, call_openrouter))

    return providers


async def call_llm(
    task: str,
    messages: list[dict],
    schema: type[BaseModel] | None = None,
    tier: str = "fast",
) -> dict:
    """Route an LLM call through providers with fallback, caching, and validation.

    Args:
        task: Descriptive label for the task (used in cache key and logging).
        messages: List of {role, content} dicts.
        schema: Optional Pydantic model to validate the parsed JSON against.
        tier: "fast" or "reasoning" to select model tier.

    Returns:
        Parsed and optionally validated JSON dict from the LLM.

    Raises:
        RuntimeError: If all providers fail.
    """
    settings = get_settings()

    # Truncate if needed
    messages = _truncate_messages(messages)

    # Check cache
    if settings.CACHE_ENABLED:
        key = _cache_key(task, messages)
        cached = await repo.get_cache(key)
        if cached is not None:
            logger.info("Cache HIT for task=%s", task)
            return cached

    providers = _select_models(tier)
    if not providers:
        raise RuntimeError("No LLM providers configured. Set at least one API key in .env")

    last_error: Exception | None = None

    for provider_name, model_name, call_fn in providers:
        for attempt in range(2):  # one retry per provider
            try:
                logger.info(
                    "Attempting %s model=%s task=%s attempt=%d",
                    provider_name, model_name, task, attempt + 1,
                )
                raw = await call_fn(model_name, messages)

                # Validate against schema if provided
                if schema is not None:
                    try:
                        schema.model_validate(raw)
                    except Exception as validation_err:
                        if attempt == 0:
                            # Retry with error feedback
                            logger.warning(
                                "Schema validation failed for %s: %s — retrying",
                                provider_name, validation_err,
                            )
                            error_msg = (
                                f"Your previous response failed validation: {validation_err}. "
                                "Please fix the JSON and respond again."
                            )
                            messages = messages + [{"role": "user", "content": error_msg}]
                            continue
                        raise

                logger.info("SUCCESS via %s model=%s for task=%s", provider_name, model_name, task)

                # Cache the result
                if settings.CACHE_ENABLED:
                    await repo.set_cache(key, raw)

                return raw

            except ValueError:
                # Missing API key — skip provider entirely
                logger.debug("Skipping %s: API key not configured", provider_name)
                break
            except (asyncio.TimeoutError, TimeoutError) as exc:
                last_error = exc
                logger.warning("Timeout from %s. Immediately falling back to next provider.", provider_name)
                break
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Error from %s (attempt %d): %s", provider_name, attempt + 1, exc
                )
                if "429" in str(exc) or "quota" in str(exc).lower():
                    logger.warning("Rate limit / quota hit on %s. Immediately falling back.", provider_name)
                    break
                if attempt == 0:
                    await asyncio.sleep(1)
                continue
        # Move to next provider after exhausting retries

    raise RuntimeError(f"All LLM providers failed for task={task}. Last error: {last_error}")
