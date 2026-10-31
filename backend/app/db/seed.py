"""Pre-seeds LLM cache for standard demo tasks so repeated runs cost zero quota."""

import json
import logging
from ..llm.router import _cache_key
from ..llm.prompts.analyst import SYSTEM_PROMPT as ANALYST_SYS, USER_PROMPT_TEMPLATE as ANALYST_USER
from ..llm.prompts.clarifier import SYSTEM_PROMPT as CLAR_SYS, USER_PROMPT_TEMPLATE as CLAR_USER
from . import repo

logger = logging.getLogger(__name__)


async def seed_demo_cache(sample_text: str):
    """Seed cache for food_delivery.md demo project."""
    try:
        # 1. Requirements Analyst
        analyst_user_prompt = ANALYST_USER.format(filename="food_delivery.md", content=sample_text.strip())
        analyst_messages = [
            {"role": "system", "content": ANALYST_SYS},
            {"role": "user", "content": analyst_user_prompt},
        ]
        analyst_key = _cache_key("requirements_analysis", analyst_messages)

        cached_analyst = await repo.get_cache(analyst_key)
        if not cached_analyst:
            from ..agents.analyst import _fallback_extract_requirements
            sample_reqs = _fallback_extract_requirements(sample_text, "food_delivery.md")
            await repo.set_cache(analyst_key, {"requirements": sample_reqs})
            logger.info("Seeded LLM cache for requirements_analysis (%s)", analyst_key)

        # 2. Clarifier
        from ..agents.analyst import _fallback_extract_requirements
        sample_reqs = _fallback_extract_requirements(sample_text, "food_delivery.md")
        clar_user_prompt = CLAR_USER.format(requirements_json=json.dumps(sample_reqs, indent=2))
        clar_messages = [
            {"role": "system", "content": CLAR_SYS},
            {"role": "user", "content": clar_user_prompt},
        ]
        clar_key = _cache_key("clarification_detection", clar_messages)

        cached_clar = await repo.get_cache(clar_key)
        if not cached_clar:
            from ..agents.clarifier import _fallback_detect_issues
            sample_issues = _fallback_detect_issues(sample_reqs)
            issues_payload = {
                "issues": [
                    {
                        "id": cl["issue_id"],
                        "kind": cl["kind"],
                        "requirement_ids": cl["requirement_ids"],
                        "explanation": cl["explanation"],
                        "suggested_question": cl["question"],
                    }
                    for cl in sample_issues
                ]
            }
            await repo.set_cache(clar_key, issues_payload)
            logger.info("Seeded LLM cache for clarification_detection (%s)", clar_key)

    except Exception as e:
        logger.warning("Cache seeding failed: %s", e)

