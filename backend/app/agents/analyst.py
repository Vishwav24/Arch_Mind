"""Requirements Analyst agent - extracts and classifies requirements."""

import json
import logging
from ..llm.router import call_llm
from ..llm.schemas import RequirementsAnalysis
from ..llm.prompts.analyst import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


def _fallback_extract_requirements(text: str, source_ref: str, start_idx: int = 0) -> list[dict]:
    """Deterministic heuristic requirement extraction when LLM is unavailable or fails."""
    reqs = []
    current_sec = "Overview"
    counter = start_idx

    for line in text.split("\n"):
        line_str = line.strip()
        if line_str.startswith("## ") or line_str.startswith("### "):
            current_sec = line_str.lstrip("#").strip()
        elif line_str.startswith("- ") or line_str.startswith("* ") or (
            len(line_str) > 10 and any(w in line_str.lower() for w in ["shall", "must", "should"])
        ):
            req_text = line_str.lstrip("-* ").strip()
            if len(req_text) > 8:
                counter += 1
                low = req_text.lower()
                sec_low = current_sec.lower()

                if "residency" in low or "gdpr" in low or "compliance" in sec_low:
                    rtype = "compliance"
                elif "security" in sec_low or "authentication" in low or "password" in low or "social login" in low:
                    rtype = "security"
                elif (
                    any(k in sec_low for k in ["non-functional", "performance", "reliability"])
                    or any(k in low for k in ["concurrent", "uptime", "seconds", "fast", "latency", "sla"])
                ):
                    rtype = "non_functional"
                elif "business" in sec_low or any(k in low for k in ["launch", "budget", "team", "cost", "mvp"]):
                    rtype = "business_constraint"
                elif "constraint" in sec_low:
                    rtype = "technical_constraint"
                else:
                    rtype = "functional"

                if "shall" in low or "must" in low or rtype in ("compliance", "security"):
                    priority = "High"
                    confidence = 0.95
                elif "should" in low:
                    priority = "Medium"
                    confidence = 0.85
                else:
                    priority = "Low"
                    confidence = 0.8

                reqs.append({
                    "id": f"REQ-{counter:03d}",
                    "text": req_text,
                    "type": rtype,
                    "priority": priority,
                    "confidence": confidence,
                    "source": {
                        "doc": source_ref,
                        "location": current_sec,
                        "quote": req_text[:80],
                    },
                    "provenance": "source",
                    "status": "new",
                    "version": 1,
                })

    return reqs


async def analyze_requirements(extracted_text: str, source_ref: str = "uploaded document") -> list[dict]:
    """Extract and classify requirements from text. Uses fast tier with heuristic fallback."""
    if not extracted_text.strip():
        return []

    chunks = _chunk_text(extracted_text, max_chars=6000)
    all_requirements = []
    req_counter = 0

    for i, chunk in enumerate(chunks):
        user_prompt = USER_PROMPT_TEMPLATE.format(filename=source_ref, content=chunk)
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        try:
            result = await call_llm(
                task="requirements_analysis",
                messages=messages,
                schema=RequirementsAnalysis,
                tier="fast",
            )

            reqs = result.get("requirements", [])
            for req in reqs:
                req_counter += 1
                req["id"] = f"REQ-{req_counter:03d}"
                if "source" not in req or not isinstance(req.get("source"), dict):
                    req["source"] = {
                        "doc": source_ref,
                        "location": f"section {i+1}",
                        "quote": req.get("text", "")[:50],
                    }
                elif not req["source"].get("doc"):
                    req["source"]["doc"] = source_ref
                if "provenance" not in req:
                    req["provenance"] = "source"
                all_requirements.append(req)

        except Exception as e:
            logger.warning(
                "LLM extraction error for chunk %d (%s). Activating deterministic fallback parser.",
                i + 1, e,
            )
            fallback_reqs = _fallback_extract_requirements(chunk, source_ref, start_idx=req_counter)
            for req in fallback_reqs:
                req_counter += 1
                all_requirements.append(req)

    return all_requirements


def _chunk_text(text: str, max_chars: int = 6000) -> list[str]:
    """Split text into chunks, trying to break at paragraph boundaries."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    paragraphs = text.split("\n\n")
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = para
        else:
            current_chunk += "\n\n" + para

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:max_chars]]
