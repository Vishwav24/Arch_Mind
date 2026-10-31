"""Clarification routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import repo

router = APIRouter(tags=["clarifications"])


@router.get("/projects/{project_id}/clarifications")
async def get_clarifications(project_id: str):
    return await repo.get_clarifications(project_id)


class AnswerRequest(BaseModel):
    answer: str
    status: str = "answered"


@router.post("/clarifications/{clarification_id}/answer")
async def answer_clarification(clarification_id: str, request: AnswerRequest):
    result = await repo.update_clarification(clarification_id, request.answer, request.status)
    if not result:
        raise HTTPException(status_code=404, detail="Clarification not found")
    return result

