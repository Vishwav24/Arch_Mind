"""Document upload and parsing routes."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from ..db import repo
from ..ingestion.parsers import parse_file
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["documents"])


@router.post("/projects/{project_id}/documents")
async def upload_documents(project_id: str, files: List[UploadFile] = File(...)):
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results = []
    for file in files:
        try:
            content = await file.read()
            parsed = await parse_file(file.filename or "unknown", content)

            if parsed.get("error"):
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": parsed["error"],
                })
                continue

            doc = await repo.save_document(
                project_id=project_id,
                filename=file.filename or "unknown",
                file_type=parsed.get("file_type", ""),
                extracted_text=parsed.get("text", ""),
                metadata={"pages": parsed.get("pages"), "is_image": parsed.get("is_image", False)},
            )
            results.append({
                "filename": file.filename,
                "status": "success",
                "extracted_text": parsed.get("text", "")[:500] + ("..." if len(parsed.get("text", "")) > 500 else ""),
                "file_type": parsed.get("file_type", ""),
                "doc_id": doc["id"],
            })
        except Exception as e:
            logger.error("Error processing %s: %s", file.filename, e)
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e),
            })

    return {"documents": results}

