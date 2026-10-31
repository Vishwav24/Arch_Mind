"""Export routes."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..db import repo
from ..export.markdown import generate_markdown_report
from ..export.pdf import generate_pdf
from ..validation.rules import compute_coverage
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["export"])


@router.get("/projects/{project_id}/export")
async def export_project(project_id: str, format: str = "md"):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    requirements = await repo.get_requirements(project_id)
    components = await repo.get_components(project_id)
    connections = await repo.get_connections(project_id)
    decisions = await repo.get_decisions(project_id)
    findings = await repo.get_validation_results(project_id)
    coverage = compute_coverage(requirements, components)

    title_safe = project.get("title", "archmind_report").replace(" ", "_").lower()

    if format == "pdf":
        pdf_bytes = generate_pdf(project, requirements, components, connections, decisions, findings, coverage)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={title_safe}.pdf"},
        )
    else:
        md = generate_markdown_report(project, requirements, components, connections, decisions, findings, coverage)
        return Response(
            content=md.encode("utf-8"),
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename={title_safe}.md"},
        )

