"""Change impact analysis routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import repo
from ..agents.impact import analyze_impact
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["impact"])


class ChangeItem(BaseModel):
    req_id: str
    new_text: str


class ImpactRequest(BaseModel):
    changes: list[ChangeItem]


@router.post("/projects/{project_id}/impact")
async def run_impact_analysis(project_id: str, request: ImpactRequest):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = await repo.get_requirements(project_id)
    components = await repo.get_components(project_id)
    connections = await repo.get_connections(project_id)

    if not components:
        raise HTTPException(status_code=400, detail="No architecture to analyze impact against.")

    try:
        changes_dicts = [c.model_dump() for c in request.changes]
        result = await analyze_impact(changes_dicts, requirements, components, connections)

        # Update requirements in database with new version
        for change in request.changes:
            await repo.update_requirement(project_id, change.req_id, {"text": change.new_text})

        return result
    except Exception as e:
        logger.error("Impact analysis error: %s", e)
        raise HTTPException(status_code=500, detail=f"Impact analysis failed: {str(e)}")

