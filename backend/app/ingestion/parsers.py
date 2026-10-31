"""File parsers for all supported document types."""

import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt",
    ".txt", ".md", ".csv", ".json", ".yaml", ".yml",
    ".mmd", ".puml", ".plantuml",
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
}


async def parse_file(filename: str, content: bytes) -> dict:
    """Parse any supported file type to text + metadata."""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        return {
            "text": "",
            "source_ref": filename,
            "file_type": ext,
            "pages": None,
            "is_image": False,
            "error": f"Unsupported file type: {ext}. Supported types: PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JSON, YAML, Mermaid, PlantUML, PNG, JPG"
        }

    try:
        if ext == ".pdf":
            return await _parse_pdf(filename, content)
        elif ext in (".docx", ".doc"):
            return await _parse_docx(filename, content)
        elif ext in (".xlsx", ".xls"):
            return await _parse_xlsx(filename, content)
        elif ext in (".pptx", ".ppt"):
            return await _parse_pptx(filename, content)
        elif ext in (".txt", ".md", ".csv"):
            return _parse_text(filename, content, ext)
        elif ext == ".json":
            return _parse_json(filename, content)
        elif ext in (".yaml", ".yml"):
            return _parse_yaml(filename, content)
        elif ext == ".mmd":
            return _parse_text(filename, content, ext)
        elif ext in (".puml", ".plantuml"):
            return _parse_text(filename, content, ext)
        elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            return _parse_image(filename, content, ext)
        else:
            return _parse_text(filename, content, ext)
    except Exception as e:
        logger.error(f"Error parsing {filename}: {e}")
        return {
            "text": "",
            "source_ref": filename,
            "file_type": ext,
            "pages": None,
            "is_image": False,
            "error": f"Failed to parse {filename}: {str(e)}. The file may be corrupt or in an unexpected format."
        }


async def _parse_pdf(filename: str, content: bytes) -> dict:
    if not content.startswith(b"%PDF"):
        return {
            "text": "",
            "source_ref": filename,
            "file_type": ".pdf",
            "pages": None,
            "is_image": False,
            "error": f"Failed to parse {filename}: Invalid or corrupt PDF file (missing %PDF header).",
        }
    import fitz  # PyMuPDF
    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    full_text = []
    for i, page in enumerate(doc):
        text = page.get_text()
        pages.append({"page": i + 1, "text": text})
        full_text.append(f"[Page {i+1}]\n{text}")
    doc.close()
    return {
        "text": "\n\n".join(full_text),
        "source_ref": filename,
        "file_type": ".pdf",
        "pages": pages,
        "is_image": False,
    }


async def _parse_docx(filename: str, content: bytes) -> dict:
    import io
    from docx import Document
    doc = Document(io.BytesIO(content))
    paragraphs = []
    for i, para in enumerate(doc.paragraphs):
        if para.text.strip():
            paragraphs.append(para.text)
    return {
        "text": "\n\n".join(paragraphs),
        "source_ref": filename,
        "file_type": ".docx",
        "pages": None,
        "is_image": False,
    }


async def _parse_xlsx(filename: str, content: bytes) -> dict:
    import io
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    all_text = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = []
        for row in ws.iter_rows(values_only=True):
            row_text = " | ".join(str(c) if c is not None else "" for c in row)
            if row_text.strip(" |"):
                rows.append(row_text)
        if rows:
            all_text.append(f"[Sheet: {sheet_name}]\n" + "\n".join(rows))
    wb.close()
    return {
        "text": "\n\n".join(all_text),
        "source_ref": filename,
        "file_type": ".xlsx",
        "pages": None,
        "is_image": False,
    }


async def _parse_pptx(filename: str, content: bytes) -> dict:
    import io
    from pptx import Presentation
    prs = Presentation(io.BytesIO(content))
    slides = []
    for i, slide in enumerate(prs.slides):
        texts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    if para.text.strip():
                        texts.append(para.text)
        slides.append(f"[Slide {i+1}]\n" + "\n".join(texts))
    return {
        "text": "\n\n".join(slides),
        "source_ref": filename,
        "file_type": ".pptx",
        "pages": [{"page": i+1, "text": s} for i, s in enumerate(slides)],
        "is_image": False,
    }


def _parse_text(filename: str, content: bytes, ext: str) -> dict:
    text = content.decode("utf-8", errors="replace")
    return {
        "text": text,
        "source_ref": filename,
        "file_type": ext,
        "pages": None,
        "is_image": False,
    }


def _parse_json(filename: str, content: bytes) -> dict:
    text = content.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(text)
        formatted = json.dumps(parsed, indent=2)
    except json.JSONDecodeError:
        formatted = text
    return {
        "text": formatted,
        "source_ref": filename,
        "file_type": ".json",
        "pages": None,
        "is_image": False,
    }


def _parse_yaml(filename: str, content: bytes) -> dict:
    import yaml
    text = content.decode("utf-8", errors="replace")
    try:
        parsed = yaml.safe_load(text)
        formatted = yaml.dump(parsed, default_flow_style=False)
    except Exception:
        formatted = text
    return {
        "text": formatted,
        "source_ref": filename,
        "file_type": ".yaml",
        "pages": None,
        "is_image": False,
    }


def _parse_image(filename: str, content: bytes, ext: str) -> dict:
    return {
        "text": f"[Image file: {filename}] Diagrams or document images can be interpreted by vision models.",
        "source_ref": filename,
        "file_type": ext,
        "pages": None,
        "is_image": True,
        "image_data": content,
    }

