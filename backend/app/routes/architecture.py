"""Architecture generation and retrieval routes."""

from fastapi import APIRouter, HTTPException
from ..db import repo
from ..agents.designer import design_architecture
from ..ingestion.brownfield import parse_brownfield_architecture
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["architecture"])


@router.post("/projects/{project_id}/architecture/generate")
async def generate_architecture(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = await repo.get_requirements(project_id)
    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements found. Please analyze documents first.")

    clarifications = await repo.get_clarifications(project_id)

    brownfield_components = None
    brownfield_connections = None
    if project.get("mode") == "brownfield":
        docs = await repo.get_documents(project_id)
        for doc in docs:
            text = doc.get("extracted_text", "")
            if text:
                bf_result = parse_brownfield_architecture(text, doc.get("filename", "existing architecture"))
                if bf_result.get("components"):
                    brownfield_components = bf_result["components"]
                    brownfield_connections = bf_result.get("connections", [])
                    break

    try:
        result = await design_architecture(
            requirements=requirements,
            clarifications=clarifications,
            brownfield_components=brownfield_components,
            brownfield_connections=brownfield_connections,
        )

        await repo.save_components(project_id, result.get("components", []))
        await repo.save_connections(project_id, result.get("connections", []))

        if result.get("decisions"):
            await repo.save_decisions(project_id, result["decisions"])

        await repo.save_architecture_version(project_id, result)
        await repo.update_project(project_id, status="architecture_generated")

        return result

    except Exception as e:
        logger.error("Architecture generation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Architecture generation failed: {str(e)}")


@router.get("/projects/{project_id}/architecture")
async def get_architecture(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    components = await repo.get_components(project_id)
    connections = await repo.get_connections(project_id)

    return {
        "components": components,
        "connections": connections,
    }

