"""Architecture Validator - deterministic rules + LLM review."""

import json
import logging
from ..llm.router import call_llm
from ..llm.schemas import FindingsList
from ..llm.prompts.validator import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from ..validation.rules import run_deterministic_validation, compute_coverage

logger = logging.getLogger(__name__)


async def validate_architecture(
    requirements: list[dict],
    components: list[dict],
    connections: list[dict],
) -> dict:
    """Run validation: deterministic rules first, then LLM review."""

    # Step 1: Deterministic validation
    det_findings = run_deterministic_validation(requirements, components, connections)

    # Step 2: LLM-based review
    llm_findings = await _llm_review(requirements, components, connections, det_findings)

    # Merge findings avoiding exact duplicate explanations
    all_findings = list(det_findings)
    seen_exps = {f.get("explanation", "").lower() for f in det_findings}
    for f in llm_findings:
        if f.get("explanation", "").lower() not in seen_exps:
            all_findings.append(f)
            seen_exps.add(f.get("explanation", "").lower())

    # Compute coverage
    coverage = compute_coverage(requirements, components)

    return {
        "findings": all_findings,
        "coverage_percent": coverage,
        "total_requirements": len(requirements),
        "covered_requirements": int(coverage * len(requirements) / 100) if requirements else 0,
    }


async def _llm_review(
    requirements: list[dict],
    components: list[dict],
    connections: list[dict],
    deterministic_findings: list[dict],
) -> list[dict]:
    """LLM-based architecture review for risks and assumptions."""
    arch_data = {"components": components, "connections": connections}
    user_prompt = USER_PROMPT_TEMPLATE.format(
        requirements_json=json.dumps(requirements, indent=2),
        architecture_json=json.dumps(arch_data, indent=2),
        deterministic_findings_json=json.dumps(deterministic_findings, indent=2),
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        result = await call_llm(
            task="architecture_validation",
            messages=messages,
            schema=FindingsList,
            tier="reasoning",
        )
        findings = result.get("findings", [])
        for i, f in enumerate(findings):
            if not f.get("id", "").startswith("FND-LLM"):
                f["id"] = f"FND-LLM-{i+1:03d}"
        return findings
    except Exception as e:
        logger.error("LLM review error: %s", e)
        return []

