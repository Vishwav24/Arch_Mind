"""Project CRUD routes."""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..db import repo

logger = logging.getLogger(__name__)
router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    title: str
    description: str = ""
    mode: str = "greenfield"


@router.post("/projects")
async def create_project(request: CreateProjectRequest):
    if not request.title or not request.title.strip():
        raise HTTPException(status_code=400, detail="Project title is required")
    project = await repo.create_project(
        title=request.title.strip(),
        description=request.description,
        mode=request.mode,
    )
    return project


@router.get("/projects")
async def list_projects():
    projects = await repo.list_projects()
    return projects


@router.post("/projects/sample")
async def load_sample_project():
    """Load the sample food delivery project with document."""
    project = await repo.create_project(
        title="Food Delivery App",
        description="A modern food delivery platform connecting customers with restaurants and delivery partners.",
        mode="greenfield",
    )

    sample_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", "sample_data", "food_delivery.md"),
        os.path.join(os.path.dirname(__file__), "..", "sample_data", "food_delivery.md"),
        "backend/sample_data/food_delivery.md",
        "sample_data/food_delivery.md",
    ]
    sample_text = None
    for p in sample_paths:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p):
            with open(abs_p, "r", encoding="utf-8") as f:
                sample_text = f.read()
            break

    if sample_text:
        await repo.save_document(
            project_id=project["id"],
            filename="food_delivery.md",
            file_type=".md",
            extracted_text=sample_text,
        )
        logger.info("Sample document food_delivery.md saved for project %s", project["id"])

        # Also seed demo cache for this sample text
        try:
            from ..db.seed import seed_demo_cache
            await seed_demo_cache(sample_text)
        except Exception as e:
            logger.warning("Could not pre-seed demo cache: %s", e)
    else:
        logger.error("Could not find food_delivery.md in any candidate path: %s", sample_paths)

    return project


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
