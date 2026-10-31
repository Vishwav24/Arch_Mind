"""Google Gemini API provider using native async generate_content_async."""

import asyncio
import json
import logging
from typing import Any

import google.generativeai as genai

from ...config import get_settings

logger = logging.getLogger(__name__)


async def call_gemini(
    model_name: str,
    messages: list[dict],
    response_schema: type | None = None,
) -> dict:
    """Call Google Gemini using native async API."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    genai.configure(api_key=settings.GEMINI_API_KEY)

    generation_config = {
        "temperature": 0.2,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }

    system_instruction = None
    prompt_parts: list[str] = []
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            prompt_parts.append(msg["content"])

    model = genai.GenerativeModel(
        model_name,
        generation_config=generation_config,
        system_instruction=system_instruction,
    )

    combined_prompt = "\n\n".join(prompt_parts)
    logger.info("Calling Gemini model=%s prompt_len=%d", model_name, len(combined_prompt))

    response = await asyncio.wait_for(
        model.generate_content_async(combined_prompt),
        timeout=4.0,
    )

    text = response.text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            return {"items": json.loads(text[start:end])}
        raise
