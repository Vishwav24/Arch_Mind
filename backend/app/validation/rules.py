"""Deterministic validation rules for architecture checking."""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def run_deterministic_validation(requirements: list[dict], components: list[dict], connections: list[dict]) -> list[dict]:
    """Run all deterministic validation rules. Returns list of Finding dicts."""
    findings = []
    findings.extend(_check_requirement_coverage(requirements, components))
    findings.extend(_check_orphan_components(requirements, components))
    findings.extend(_check_nfr_coverage(requirements, components))
    findings.extend(_check_dangling_connections(components, connections))
    findings.extend(_check_keyword_presence(requirements, components))
    findings.extend(_check_id_uniqueness(requirements, components, connections))
    return findings


def compute_coverage(requirements: list[dict], components: list[dict]) -> float:
    """Compute coverage_percent = covered_requirements / total_requirements."""
    if not requirements:
        return 100.0
    covered_req_ids = set()
    for comp in components:
        for req_id in comp.get("satisfies", []):
            covered_req_ids.add(req_id)
    total = len(requirements)
    covered = sum(1 for r in requirements if r.get("id") in covered_req_ids)
    return round((covered / total) * 100, 1) if total > 0 else 100.0


def _check_requirement_coverage(requirements: list[dict], components: list[dict]) -> list[dict]:
    """Every requirement maps to at least one component."""
    findings = []
    covered_req_ids = set()
    for comp in components:
        for req_id in comp.get("satisfies", []):
            covered_req_ids.add(req_id)

    for req in requirements:
        req_id = req.get("id", "")
        if req_id not in covered_req_ids:
            findings.append({
                "id": f"FND-COV-{req_id}",
                "type": "coverage",
                "severity": "High",
                "related_requirement_ids": [req_id],
                "related_component_ids": [],
                "explanation": f"Requirement {req_id} ('{req.get('text', '')[:80]}...') is not satisfied by any component.",
            })
    return findings


def _check_orphan_components(requirements: list[dict], components: list[dict]) -> list[dict]:
    """Every component has at least one requirement or is flagged."""
    findings = []
    req_ids = {r.get("id") for r in requirements}
    for comp in components:
        satisfies = comp.get("satisfies", [])
        if not satisfies or not any(s in req_ids for s in satisfies):
            findings.append({
                "id": f"FND-ORPHAN-{comp.get('id', '')}",
                "type": "assumption",
                "severity": "Medium",
                "related_requirement_ids": [],
                "related_component_ids": [comp.get("id", "")],
                "explanation": f"Component {comp.get('id', '')} ('{comp.get('name', '')}') does not satisfy any requirement. It may be an unsupported assumption.",
            })
    return findings


def _check_nfr_coverage(requirements: list[dict], components: list[dict]) -> list[dict]:
    """Every non-functional requirement has a component addressing it."""
    findings = []
    nfr_types = {"non_functional", "security", "compliance"}
    covered_req_ids = set()
    for comp in components:
        for req_id in comp.get("satisfies", []):
            covered_req_ids.add(req_id)

    for req in requirements:
        if req.get("type") in nfr_types and req.get("id") not in covered_req_ids:
            findings.append({
                "id": f"FND-NFR-{req.get('id', '')}",
                "type": "nfr_gap",
                "severity": "High",
                "related_requirement_ids": [req.get("id", "")],
                "related_component_ids": [],
                "explanation": f"Non-functional requirement {req.get('id', '')} ('{req.get('text', '')[:80]}') has no component or note addressing it.",
            })
    return findings


def _check_dangling_connections(components: list[dict], connections: list[dict]) -> list[dict]:
    """No dangling connections (both endpoints exist)."""
    findings = []
    comp_ids = {c.get("id") for c in components}
    for conn in connections:
        from_id = conn.get("from_component", conn.get("source", ""))
        to_id = conn.get("to_component", conn.get("target", ""))
        if from_id not in comp_ids:
            findings.append({
                "id": f"FND-DANGLE-{conn.get('id', '')}-src",
                "type": "inconsistency",
                "severity": "High",
                "related_requirement_ids": [],
                "related_component_ids": [from_id],
                "explanation": f"Connection {conn.get('id', '')} references non-existent source component '{from_id}'.",
            })
        if to_id not in comp_ids:
            findings.append({
                "id": f"FND-DANGLE-{conn.get('id', '')}-tgt",
                "type": "inconsistency",
                "severity": "High",
                "related_requirement_ids": [],
                "related_component_ids": [to_id],
                "explanation": f"Connection {conn.get('id', '')} references non-existent target component '{to_id}'.",
            })
    return findings


def _check_keyword_presence(requirements: list[dict], components: list[dict]) -> list[dict]:
    """Presence checks driven by requirement keywords."""
    findings = []
    all_text = " ".join(r.get("text", "").lower() for r in requirements)
    comp_names_lower = " ".join(c.get("name", "").lower() + " " + c.get("type", "").lower() + " " + c.get("description", "").lower() for c in components)

    checks = [
        {
            "keywords": ["authentication", "login", "sign in", "sign up", "register", "registration"],
            "expected": ["auth", "identity", "login", "iam", "security"],
            "finding_text": "Requirements mention authentication/login but no identity/auth component is present.",
        },
        {
            "keywords": ["payment", "pay", "checkout", "billing", "stripe", "paypal"],
            "expected": ["payment", "billing", "stripe", "pay"],
            "finding_text": "Requirements mention payments but no payment gateway component is present.",
        },
        {
            "keywords": ["real-time", "realtime", "real time", "tracking", "live", "websocket"],
            "expected": ["websocket", "real-time", "realtime", "tracking", "messaging", "notification", "push", "socket", "sse"],
            "finding_text": "Requirements mention real-time features but no messaging/websocket component is present.",
        },
        {
            "keywords": ["concurrent", "10000", "10,000", "100000", "100,000", "high load", "scalab"],
            "expected": ["load balancer", "cache", "scaling", "balancer", "cdn", "horizontal"],
            "finding_text": "Requirements mention high concurrency/load but no load balancer, caching, or scaling component is present.",
        },
        {
            "keywords": ["search", "find", "filter", "query", "elasticsearch", "full-text"],
            "expected": ["search", "elastic", "index", "solr", "algolia"],
            "finding_text": "Requirements mention search functionality but no search/index component is present.",
        },
        {
            "keywords": ["notification", "notify", "alert", "email", "sms", "push notification"],
            "expected": ["notification", "email", "sms", "push", "alert"],
            "finding_text": "Requirements mention notifications but no notification service is present.",
        },
    ]

    for check in checks:
        if any(kw in all_text for kw in check["keywords"]):
            if not any(exp in comp_names_lower for exp in check["expected"]):
                findings.append({
                    "id": f"FND-KEYWORD-{check['keywords'][0].replace(' ', '_').upper()[:20]}",
                    "type": "missing_component",
                    "severity": "Medium",
                    "related_requirement_ids": [r.get("id") for r in requirements if any(kw in r.get("text", "").lower() for kw in check["keywords"])],
                    "related_component_ids": [],
                    "explanation": check["finding_text"],
                })

    return findings


def _check_id_uniqueness(requirements: list[dict], components: list[dict], connections: list[dict]) -> list[dict]:
    """IDs unique and stable."""
    findings = []
    req_ids = [r.get("id") for r in requirements if r.get("id")]
    comp_ids = [c.get("id") for c in components if c.get("id")]
    conn_ids = [c.get("id") for c in connections if c.get("id")]

    for label, ids in [("requirement", req_ids), ("component", comp_ids), ("connection", conn_ids)]:
        seen = set()
        for id_val in ids:
            if id_val in seen:
                findings.append({
                    "id": f"FND-DUP-{label}-{id_val}",
                    "type": "inconsistency",
                    "severity": "High",
                    "related_requirement_ids": [],
                    "related_component_ids": [],
                    "explanation": f"Duplicate {label} ID found: {id_val}",
                })
            seen.add(id_val)

    return findings

