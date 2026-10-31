"""Change Impact Agent - analyzes requirement changes and their effects."""

import json
import logging
from ..llm.router import call_llm
from ..llm.schemas import ImpactReport
from ..llm.prompts.impact import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


async def analyze_impact(
    changes: list[dict],
    requirements: list[dict],
    components: list[dict],
    connections: list[dict],
) -> dict:
    """Analyze the impact of requirement changes on the architecture."""

    changed_req_ids = [c.get("req_id") for c in changes]

    # Step 1: Trace directly affected components
    directly_affected = set()
    for comp in components:
        for req_id in comp.get("satisfies", []):
            if req_id in changed_req_ids:
                directly_affected.add(comp.get("id", ""))

    # Step 2: Ripple effect via connections
    indirectly_affected = set()
    for conn in connections:
        src = conn.get("from_component", conn.get("source", ""))
        tgt = conn.get("to_component", conn.get("target", ""))
        if src in directly_affected and tgt:
            indirectly_affected.add(tgt)
        if tgt in directly_affected and src:
            indirectly_affected.add(src)

    all_affected = directly_affected | indirectly_affected

    # Create new requirements representation
    old_req_map = {r.get("id"): r for r in requirements}
    new_requirements = []
    for r in requirements:
        req_copy = dict(r)
        for c in changes:
            if c.get("req_id") == req_copy.get("id"):
                req_copy["text"] = c.get("new_text", req_copy.get("text", ""))
        new_requirements.append(req_copy)

    arch_data = {"components": components, "connections": connections}
    user_prompt = USER_PROMPT_TEMPLATE.format(
        old_requirements_json=json.dumps(requirements, indent=2),
        new_requirements_json=json.dumps(new_requirements, indent=2),
        architecture_json=json.dumps(arch_data, indent=2),
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        result = await call_llm(
            task="impact_analysis",
            messages=messages,
            schema=ImpactReport,
            tier="reasoning",
        )

        merged_affected = list(all_affected.union(set(result.get("affected_component_ids", []))))

        return {
            "changed_requirement_ids": changed_req_ids,
            "affected_component_ids": merged_affected,
            "explanation": result.get("explanation", "Analysis completed."),
            "recommended_changes": result.get("recommended_changes", []),
        }
    except Exception as e:
        logger.error("Impact analysis error: %s", e)
        return {
            "changed_requirement_ids": changed_req_ids,
            "affected_component_ids": list(all_affected),
            "explanation": f"Traceability traversal found affected components: {list(all_affected)}",
            "recommended_changes": ["Review component configurations for updated requirements."],
        }

