"""Data access layer for ArchMind AI."""

import json
import uuid
from datetime import datetime
from typing import Optional
from .models import get_db
import logging

logger = logging.getLogger(__name__)


def _new_id() -> str:
    return str(uuid.uuid4())[:8]


# ──────── Projects ────────

async def create_project(title: str, description: str = "", mode: str = "greenfield", owner_id: str = "demo-user") -> dict:
    db = await get_db()
    try:
        pid = _new_id()
        now = datetime.utcnow().isoformat()
        await db.execute(
            "INSERT INTO projects (id, title, description, mode, owner_id, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (pid, title, description, mode, owner_id, "created", now, now),
        )
        await db.commit()
        return {"id": pid, "title": title, "description": description, "mode": mode, "owner_id": owner_id, "status": "created", "created_at": now, "updated_at": now}
    finally:
        await db.close()


async def get_project(project_id: str, owner_id: str = "demo-user") -> Optional[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM projects WHERE id=? AND owner_id=?", (project_id, owner_id))
        row = await cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        await db.close()


async def list_projects(owner_id: str = "demo-user") -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM projects WHERE owner_id=? ORDER BY created_at DESC", (owner_id,))
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def update_project(project_id: str, **kwargs) -> Optional[dict]:
    db = await get_db()
    try:
        if not kwargs:
            return await get_project(project_id)
        sets = ", ".join(f"{k}=?" for k in kwargs)
        vals = list(kwargs.values()) + [datetime.utcnow().isoformat(), project_id]
        await db.execute(f"UPDATE projects SET {sets}, updated_at=? WHERE id=?", vals)
        await db.commit()
        return await get_project(project_id)
    finally:
        await db.close()


# ──────── Source Documents ────────

async def save_document(project_id: str, filename: str, file_type: str, extracted_text: str, metadata: dict = None) -> dict:
    db = await get_db()
    try:
        did = _new_id()
        await db.execute(
            "INSERT INTO source_documents (id, project_id, filename, file_type, extracted_text, metadata_json) VALUES (?,?,?,?,?,?)",
            (did, project_id, filename, file_type, extracted_text, json.dumps(metadata or {})),
        )
        await db.commit()
        return {"id": did, "project_id": project_id, "filename": filename, "file_type": file_type, "extracted_text": extracted_text}
    finally:
        await db.close()


async def get_documents(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM source_documents WHERE project_id=?", (project_id,))
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


# ──────── Requirements ────────

async def save_requirements(project_id: str, requirements: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        # Delete old requirements for this project
        await db.execute("DELETE FROM requirements WHERE project_id=?", (project_id,))
        saved = []
        for req in requirements:
            rid = _new_id()
            req_id = req.get("id", f"REQ-{len(saved)+1:03d}")
            await db.execute(
                "INSERT INTO requirements (id, project_id, req_id, data_json, version) VALUES (?,?,?,?,?)",
                (rid, project_id, req_id, json.dumps(req), req.get("version", 1)),
            )
            saved.append(req)
        await db.commit()
        return saved
    finally:
        await db.close()


async def get_requirements(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json FROM requirements WHERE project_id=? ORDER BY req_id", (project_id,))
        rows = await cursor.fetchall()
        return [json.loads(r["data_json"]) for r in rows]
    finally:
        await db.close()


async def update_requirement(project_id: str, req_id: str, updates: dict) -> Optional[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json, version FROM requirements WHERE project_id=? AND req_id=?", (project_id, req_id))
        row = await cursor.fetchone()
        if not row:
            return None
        data = json.loads(row["data_json"])
        data.update(updates)
        new_version = row["version"] + 1
        data["version"] = new_version
        await db.execute(
            "UPDATE requirements SET data_json=?, version=?, updated_at=? WHERE project_id=? AND req_id=?",
            (json.dumps(data), new_version, datetime.utcnow().isoformat(), project_id, req_id),
        )
        await db.commit()
        return data
    finally:
        await db.close()


# ──────── Clarifications ────────

async def save_clarifications(project_id: str, clarifications: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        await db.execute("DELETE FROM clarifications WHERE project_id=?", (project_id,))
        saved = []
        for i, cl in enumerate(clarifications):
            raw_id = cl.get("id") or f"CLR-{i+1:03d}"
            cid = f"{project_id}_{raw_id}"
            await db.execute(
                "INSERT INTO clarifications (id, project_id, issue_id, question, answer, status, data_json, kind, explanation, requirement_ids) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (cid, project_id, cl.get("issue_id", ""), cl.get("question", ""), cl.get("answer", ""),
                 cl.get("status", "open"), json.dumps(cl), cl.get("kind", ""), cl.get("explanation", ""),
                 json.dumps(cl.get("requirement_ids", []))),
            )
            saved.append(cl)
        await db.commit()
        return saved
    finally:
        await db.close()


async def get_clarifications(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM clarifications WHERE project_id=? ORDER BY created_at", (project_id,))
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                data = json.loads(d.get("data_json", "{}"))
                # Merge data_json fields into d to preserve priority, category, suggested_answers, etc.
                for k, v in data.items():
                    if k not in d or not d[k]:
                        d[k] = v
                if "id" in data:
                    d["id"] = data["id"]
            except Exception:
                pass
            try:
                d["requirement_ids"] = json.loads(d.get("requirement_ids", "[]"))
            except Exception:
                d["requirement_ids"] = []
            if not d.get("priority"):
                d["priority"] = "Medium"
            if not d.get("category"):
                d["category"] = d.get("kind", "ambiguity")
            if not d.get("suggested_answers"):
                d["suggested_answers"] = []
            result.append(d)
        return result
    finally:
        await db.close()


async def update_clarification(clarification_id: str, answer: str, status: str) -> Optional[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM clarifications WHERE id=? OR id LIKE ? ORDER BY created_at LIMIT 1",
            (clarification_id, f"%_{clarification_id}"),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        actual_id = row["id"]
        await db.execute(
            "UPDATE clarifications SET answer=?, status=? WHERE id=?",
            (answer, status, actual_id),
        )
        await db.commit()
        cursor2 = await db.execute("SELECT * FROM clarifications WHERE id=?", (actual_id,))
        row2 = await cursor2.fetchone()
        if row2:
            d = dict(row2)
            try:
                data = json.loads(d.get("data_json", "{}"))
                for k, v in data.items():
                    if k not in d or not d[k]:
                        d[k] = v
                if "id" in data:
                    d["id"] = data["id"]
            except Exception:
                pass
            try:
                d["requirement_ids"] = json.loads(d.get("requirement_ids", "[]"))
            except Exception:
                d["requirement_ids"] = []
            if not d.get("priority"):
                d["priority"] = "Medium"
            if not d.get("category"):
                d["category"] = d.get("kind", "ambiguity")
            if not d.get("suggested_answers"):
                d["suggested_answers"] = []
            return d
        return None
    finally:
        await db.close()


# ──────── Components ────────

async def save_components(project_id: str, components: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        await db.execute("DELETE FROM components WHERE project_id=?", (project_id,))
        for idx, comp in enumerate(components):
            cid = _new_id()
            comp_id = comp.get("id", f"CMP-{idx+1:03d}")
            await db.execute(
                "INSERT INTO components (id, project_id, comp_id, data_json) VALUES (?,?,?,?)",
                (cid, project_id, comp_id, json.dumps(comp)),
            )
        await db.commit()
        return components
    finally:
        await db.close()


async def get_components(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json FROM components WHERE project_id=? ORDER BY comp_id", (project_id,))
        rows = await cursor.fetchall()
        return [json.loads(r["data_json"]) for r in rows]
    finally:
        await db.close()


# ──────── Connections ────────

async def save_connections(project_id: str, connections: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        await db.execute("DELETE FROM connections WHERE project_id=?", (project_id,))
        for idx, conn in enumerate(connections):
            cid = _new_id()
            conn_id = conn.get("id", f"CONN-{idx+1:03d}")
            await db.execute(
                "INSERT INTO connections (id, project_id, conn_id, data_json) VALUES (?,?,?,?)",
                (cid, project_id, conn_id, json.dumps(conn)),
            )
        await db.commit()
        return connections
    finally:
        await db.close()


async def get_connections(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json FROM connections WHERE project_id=?", (project_id,))
        rows = await cursor.fetchall()
        return [json.loads(r["data_json"]) for r in rows]
    finally:
        await db.close()


# ──────── Decisions (ADRs) ────────

async def save_decisions(project_id: str, decisions: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        await db.execute("DELETE FROM decisions WHERE project_id=?", (project_id,))
        for idx, dec in enumerate(decisions):
            did = _new_id()
            adr_id = dec.get("id", f"ADR-{idx+1:03d}")
            if not dec.get("status"):
                dec["status"] = "Proposed"
            await db.execute(
                "INSERT INTO decisions (id, project_id, adr_id, data_json) VALUES (?,?,?,?)",
                (did, project_id, adr_id, json.dumps(dec)),
            )
        await db.commit()
        return decisions
    finally:
        await db.close()


async def get_decisions(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json FROM decisions WHERE project_id=? ORDER BY adr_id", (project_id,))
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            dec = json.loads(r["data_json"])
            if not dec.get("status"):
                dec["status"] = "Proposed"
            result.append(dec)
        return result
    finally:
        await db.close()


async def update_decision_status(project_id: str, adr_id: str, status: str) -> Optional[dict]:
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, data_json FROM decisions WHERE project_id=? AND (adr_id=? OR adr_id LIKE ?)",
            (project_id, adr_id, f"%{adr_id}%"),
        )
        row = await cursor.fetchone()
        if not row:
            cursor = await db.execute(
                "SELECT id, data_json FROM decisions WHERE id=?",
                (adr_id,),
            )
            row = await cursor.fetchone()
        if not row:
            return None

        row_id = row["id"]
        dec_data = json.loads(row["data_json"])
        dec_data["status"] = status
        await db.execute(
            "UPDATE decisions SET data_json=? WHERE id=?",
            (json.dumps(dec_data), row_id),
        )
        await db.commit()
        return dec_data
    finally:
        await db.close()


# ──────── Validation Results ────────

async def save_validation_results(project_id: str, results: list[dict]) -> list[dict]:
    db = await get_db()
    try:
        await db.execute("DELETE FROM validation_results WHERE project_id=?", (project_id,))
        for res in results:
            vid = _new_id()
            await db.execute(
                "INSERT INTO validation_results (id, project_id, data_json) VALUES (?,?,?)",
                (vid, project_id, json.dumps(res)),
            )
        await db.commit()
        return results
    finally:
        await db.close()


async def get_validation_results(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT data_json FROM validation_results WHERE project_id=?", (project_id,))
        rows = await cursor.fetchall()
        return [json.loads(r["data_json"]) for r in rows]
    finally:
        await db.close()


# ──────── Architecture Versions ────────

async def save_architecture_version(project_id: str, snapshot: dict) -> dict:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COALESCE(MAX(version_number), 0) as max_v FROM architecture_versions WHERE project_id=?", (project_id,))
        row = await cursor.fetchone()
        version = (row["max_v"] if row else 0) + 1
        vid = _new_id()
        await db.execute(
            "INSERT INTO architecture_versions (id, project_id, version_number, snapshot_json) VALUES (?,?,?,?)",
            (vid, project_id, version, json.dumps(snapshot)),
        )
        await db.commit()
        return {"id": vid, "project_id": project_id, "version_number": version}
    finally:
        await db.close()


async def get_architecture_versions(project_id: str) -> list[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM architecture_versions WHERE project_id=? ORDER BY version_number DESC", (project_id,))
        rows = await cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["snapshot"] = json.loads(d.pop("snapshot_json"))
            result.append(d)
        return result
    finally:
        await db.close()


# ──────── LLM Cache ────────

async def get_cache(cache_key: str) -> Optional[dict]:
    db = await get_db()
    try:
        cursor = await db.execute("SELECT response_json FROM llm_cache WHERE cache_key=?", (cache_key,))
        row = await cursor.fetchone()
        if row:
            return json.loads(row["response_json"])
        return None
    except Exception as e:
        logger.warning("Cache fetch error: %s", e)
        return None
    finally:
        await db.close()


async def set_cache(cache_key: str, response: dict):
    db = await get_db()
    try:
        cid = _new_id()
        await db.execute(
            "INSERT OR REPLACE INTO llm_cache (id, cache_key, response_json) VALUES (?,?,?)",
            (cid, cache_key, json.dumps(response)),
        )
        await db.commit()
    except Exception as e:
        logger.warning("Cache store error: %s", e)
    finally:
        await db.close()

