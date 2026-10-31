"""Validation and traceability routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import repo
from ..agents.validator import validate_architecture
from ..validation.rules import compute_coverage
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["validation"])


@router.post("/projects/{project_id}/validate")
async def run_validation(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = await repo.get_requirements(project_id)
    components = await repo.get_components(project_id)
    connections = await repo.get_connections(project_id)

    if not components:
        raise HTTPException(status_code=400, detail="No architecture generated yet.")

    try:
        result = await validate_architecture(requirements, components, connections)
        await repo.save_validation_results(project_id, result.get("findings", []))
        await repo.update_project(project_id, status="validated")
        return result
    except Exception as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/projects/{project_id}/traceability")
async def get_traceability(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = await repo.get_requirements(project_id)
    components = await repo.get_components(project_id)

    coverage = compute_coverage(requirements, components)

    matrix = []
    for req in requirements:
        row = {"requirement_id": req.get("id"), "requirement_text": req.get("text", "")[:100]}
        satisfying_components = []
        for comp in components:
            if req.get("id") in comp.get("satisfies", []):
                satisfying_components.append(comp.get("id"))
        row["satisfied_by"] = satisfying_components
        row["is_covered"] = len(satisfying_components) > 0
        matrix.append(row)

    return {
        "coverage_percent": coverage,
        "total_requirements": len(requirements),
        "covered_requirements": sum(1 for m in matrix if m["is_covered"]),
        "matrix": matrix,
        "components": [{"id": c.get("id"), "name": c.get("name")} for c in components],
    }


@router.get("/projects/{project_id}/decisions")
async def get_decisions(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await repo.get_decisions(project_id)


class DecisionStatusRequest(BaseModel):
    status: str = "Proposed"


@router.post("/projects/{project_id}/decisions/{adr_id}/status")
async def update_decision_status(project_id: str, adr_id: str, request: DecisionStatusRequest):
    result = await repo.update_decision_status(project_id, adr_id, request.status)
    if not result:
        raise HTTPException(status_code=404, detail="Decision not found")
    return result


@router.post("/decisions/{adr_id}/status")
async def update_decision_status_fallback(adr_id: str, request: DecisionStatusRequest):
    result = await repo.update_decision_status("", adr_id, request.status)
    if not result:
        raise HTTPException(status_code=404, detail="Decision not found")
    return result

