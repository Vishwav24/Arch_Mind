"""OpenRouter API provider using httpx (OpenAI-compatible endpoint)."""

import json
import logging
from typing import Any

import httpx

from ...config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


async def call_openrouter(
    model_name: str,
    messages: list[dict],
    response_schema: type | None = None,
) -> dict:
    """Call OpenRouter's chat completion API.

    Args:
        model_name: OpenRouter model identifier.
        messages: List of {role, content} dicts.
        response_schema: Optional Pydantic model (unused, for interface parity).

    Returns:
        Parsed JSON dictionary from the model response.

    Raises:
        ValueError: If OPENROUTER_API_KEY is not configured.
        httpx.HTTPStatusError: On non-2xx responses.
    """
    settings = get_settings()
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://archmind.ai",
        "X-Title": "ArchMind AI",
    }

    payload: dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 8192,
        "response_format": {"type": "json_object"},
    }

    logger.info("Calling OpenRouter model=%s", model_name)

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
        resp.raise_for_status()

    data = resp.json()
    content = data["choices"][0]["message"]["content"]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON object
        start = content.find("{")
        end = content.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(content[start:end])
        # Try to extract JSON array
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            return {"items": json.loads(content[start:end])}
        raise
