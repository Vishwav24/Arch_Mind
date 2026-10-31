"""Analysis pipeline routes with SSE progress."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from ..db import repo
from ..agents.analyst import analyze_requirements
from ..agents.clarifier import detect_issues
from ..agents.designer import design_architecture
import json
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analysis"])


async def _sse_progress(project_id: str):
    """Run analysis pipeline and yield SSE progress events."""

    async def event(step: str, message: str, progress: int = 0):
        data = json.dumps({"step": step, "message": message, "progress": progress})
        return f"data: {data}\n\n"

    yield await event("start", "Starting analysis...", 5)

    docs = await repo.get_documents(project_id)
    if not docs:
        yield await event("error", "No documents found. Please upload documents first.", 0)
        return

    all_text = "\n\n".join(d.get("extracted_text", "") for d in docs if d.get("extracted_text"))
    if not all_text.strip():
        yield await event("error", "No text could be extracted from the uploaded documents.", 0)
        return

    yield await event("reading", "Reading your files...", 20)
    await asyncio.sleep(0.2)

    yield await event("extracting", "Finding requirements...", 40)
    try:
        requirements = await analyze_requirements(all_text, docs[0].get("filename", "document"))
        if not requirements or len(requirements) == 0:
            logger.error("Analysis produced 0 requirements for project %s", project_id)
            yield await event("error", "No requirements could be extracted from the uploaded documentation.", 0)
            return

        await repo.save_requirements(project_id, requirements)
        logger.info("Saved %d requirements for project %s", len(requirements), project_id)
        yield await event("extracted", f"Extracted {len(requirements)} requirements", 60)
    except Exception as e:
        logger.error("Extraction error: %s", e)
        yield await event("error", f"Error extracting requirements: {str(e)}", 0)
        return

    yield await event("clarifying", "Checking for conflicts and ambiguity...", 75)
    clarifications = []
    try:
        clarifications = await detect_issues(requirements)
        if clarifications:
            await repo.save_clarifications(project_id, clarifications)
        yield await event("clarified", f"Identified {len(clarifications)} clarification questions", 85)
    except Exception as e:
        logger.error("Clarification error: %s", e)
        yield await event("warning", f"Clarification check notice: {str(e)}", 80)

    yield await event("architecting", "Synthesizing baseline architecture & decision records (ADRs)...", 90)
    try:
        arch_result = await design_architecture(requirements=requirements, clarifications=clarifications)
        if arch_result:
            if arch_result.get("components"):
                await repo.save_components(project_id, arch_result["components"])
            if arch_result.get("connections"):
                await repo.save_connections(project_id, arch_result["connections"])
            if arch_result.get("decisions"):
                await repo.save_decisions(project_id, arch_result["decisions"])
            await repo.save_architecture_version(project_id, arch_result)
            logger.info("Saved architecture & %d ADRs during analysis for project %s", len(arch_result.get("decisions", [])), project_id)
        yield await event("architected", f"Generated architecture and {len(arch_result.get('decisions', []))} ADRs", 98)
    except Exception as e:
        logger.error("Auto architecture/ADR synthesis error: %s", e)
        yield await event("warning", f"Architecture synthesis notice: {str(e)}", 95)

    await repo.update_project(project_id, status="analyzed")
    yield await event("done", "Analysis complete! Ready for review.", 100)


@router.post("/projects/{project_id}/analyze")
async def analyze_project(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return StreamingResponse(
        _sse_progress(project_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("/projects/{project_id}/requirements")
async def get_requirements(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await repo.get_requirements(project_id)


class UpdateRequirementRequest(BaseModel):
    req_id: str
    text: Optional[str] = None
    priority: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None


@router.patch("/projects/{project_id}/requirements")
async def update_requirement(project_id: str, request: UpdateRequirementRequest):
    updates = {k: v for k, v in request.model_dump().items() if v is not None and k != "req_id"}
    result = await repo.update_requirement(project_id, request.req_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return result


class PasteRequest(BaseModel):
    text: str


@router.post("/projects/{project_id}/paste")
async def paste_requirements(project_id: str, request: PasteRequest):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    doc = await repo.save_document(
        project_id=project_id,
        filename="pasted_requirements.md",
        file_type=".md",
        extracted_text=request.text,
    )
    return {"status": "success", "doc_id": doc["id"]}

