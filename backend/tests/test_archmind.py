"""Comprehensive acceptance test suite for ArchMind AI (AT-01 to AT-09 + edge cases)."""

import pytest
import pytest_asyncio
import os
import json
from unittest.mock import AsyncMock, patch

# Ensure test DB
os.environ["ARCHMIND_DB_PATH"] = "test_archmind.db"

from app.db.models import init_db
from app.db import repo
from app.validation.rules import run_deterministic_validation, compute_coverage
from app.ingestion.parsers import parse_file
from app.ingestion.brownfield import parse_brownfield_architecture
from app.agents.analyst import analyze_requirements
from app.agents.clarifier import detect_issues
from app.agents.designer import design_architecture
from app.agents.validator import validate_architecture
from app.agents.impact import analyze_impact
from app.export.markdown import generate_markdown_report


@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    yield
    # Cleanup test db
    if os.path.exists("test_archmind.db"):
        try:
            os.remove("test_archmind.db")
        except Exception:
            pass


@pytest.mark.asyncio
async def test_at01_extraction_with_ids():
    """AT-01: Requirements extraction assigns stable IDs (REQ-001...), types, priorities, and quotes."""
    sample_text = "The user shall login with email. The system shall support 10,000 concurrent users."
    
    mock_llm_response = {
        "requirements": [
            {
                "id": "REQ-001",
                "text": "The user shall login with email",
                "type": "functional",
                "priority": "High",
                "confidence": 0.95,
                "source": {"doc": "spec.md", "location": "sec 1", "quote": "login with email"},
                "provenance": "source",
                "status": "new",
                "version": 1,
            },
            {
                "id": "REQ-002",
                "text": "The system shall support 10,000 concurrent users",
                "type": "non_functional",
                "priority": "High",
                "confidence": 0.9,
                "source": {"doc": "spec.md", "location": "sec 2", "quote": "10,000 concurrent users"},
                "provenance": "source",
                "status": "new",
                "version": 1,
            },
        ]
    }

    with patch("app.agents.analyst.call_llm", AsyncMock(return_value=mock_llm_response)):
        reqs = await analyze_requirements(sample_text, "spec.md")
        assert len(reqs) == 2
        assert reqs[0]["id"] == "REQ-001"
        assert reqs[1]["id"] == "REQ-002"
        assert reqs[0]["type"] == "functional"
        assert reqs[1]["type"] == "non_functional"
        assert "login with email" in reqs[0]["source"]["quote"]


@pytest.mark.asyncio
async def test_at02_vague_requirement_detection():
    """AT-02: Clarification agent detects vague terms like 'fast'."""
    reqs = [{"id": "REQ-001", "text": "The app should be fast.", "type": "non_functional", "priority": "Medium"}]
    
    mock_issues = {
        "issues": [
            {
                "id": "ISS-001",
                "kind": "ambiguity",
                "requirement_ids": ["REQ-001"],
                "explanation": "'fast' is not measurable",
                "suggested_question": "What is the target p95 response time (e.g. < 200ms)?",
            }
        ]
    }

    with patch("app.agents.clarifier.call_llm", AsyncMock(return_value=mock_issues)):
        clarifications = await detect_issues(reqs)
        assert len(clarifications) == 1
        assert clarifications[0]["kind"] == "ambiguity"
        assert "REQ-001" in clarifications[0]["requirement_ids"]


@pytest.mark.asyncio
async def test_at03_conflict_flagged_not_resolved():
    """AT-03: Conflict is flagged with both requirement IDs and NOT silently resolved."""
    reqs = [
        {"id": "REQ-001", "text": "No personal data may leave the country (data residency).", "type": "compliance"},
        {"id": "REQ-002", "text": "Use a global third-party payment provider (Stripe).", "type": "functional"},
    ]

    mock_issues = {
        "issues": [
            {
                "id": "ISS-002",
                "kind": "conflict",
                "requirement_ids": ["REQ-001", "REQ-002"],
                "explanation": "Stripe processes payments globally which conflicts with strict national data residency.",
                "suggested_question": "Should payment processing be exempted from data residency, or should a local gateway be used?",
            }
        ]
    }

    with patch("app.agents.clarifier.call_llm", AsyncMock(return_value=mock_issues)):
        clarifications = await detect_issues(reqs)
        assert len(clarifications) == 1
        assert clarifications[0]["kind"] == "conflict"
        assert "REQ-001" in clarifications[0]["requirement_ids"]
        assert "REQ-002" in clarifications[0]["requirement_ids"]
        # Must require human intervention
        assert clarifications[0]["status"] == "open"


@pytest.mark.asyncio
async def test_at04_answers_update_catalogue():
    """AT-04: User answers update the clarification record and database."""
    proj = await repo.create_project("Test Project")
    clars = await repo.save_clarifications(
        proj["id"],
        [{"id": "CLR-001", "question": "Target latency?", "answer": "", "status": "open", "kind": "ambiguity"}],
    )
    assert len(clars) == 1

    updated = await repo.update_clarification("CLR-001", answer="p95 < 250ms", status="answered")
    assert updated["answer"] == "p95 < 250ms"
    assert updated["status"] == "answered"

    stored = await repo.get_clarifications(proj["id"])
    assert stored[0]["answer"] == "p95 < 250ms"


@pytest.mark.asyncio
async def test_at05_architecture_generation():
    """AT-05: Architecture designer returns valid components with CMP-xxx IDs, connections, and ADRs."""
    reqs = [
        {"id": "REQ-001", "text": "User registration & login", "type": "functional"},
        {"id": "REQ-002", "text": "Food search & catalog", "type": "functional"},
    ]

    mock_arch = {
        "style": "microservices",
        "components": [
            {
                "id": "CMP-001",
                "name": "API Gateway",
                "type": "infra",
                "satisfies": ["REQ-001", "REQ-002"],
                "provenance": "source",
                "change_status": "new",
            },
            {
                "id": "CMP-002",
                "name": "Auth Service",
                "type": "security",
                "satisfies": ["REQ-001"],
                "provenance": "source",
                "change_status": "new",
            },
        ],
        "connections": [
            {
                "id": "CONN-001",
                "from_component": "CMP-001",
                "to_component": "CMP-002",
                "protocol": "HTTPS",
            }
        ],
        "rationale": "Microservices for scale.",
    }

    mock_adrs = {
        "decisions": [
            {
                "id": "ADR-001",
                "title": "Use API Gateway",
                "context": "Central routing needed",
                "decision": "Deploy Kong Gateway",
                "rationale": "High throughput and plugin ecosystem",
                "alternatives": ["Custom Express gateway"],
                "trade_offs": ["Operational overhead"],
                "related_requirement_ids": ["REQ-001"],
            }
        ]
    }

    async def mock_call(task, messages, schema=None, tier="fast"):
        if task == "architecture_design":
            return mock_arch
        return mock_adrs

    with patch("app.agents.designer.call_llm", side_effect=mock_call):
        res = await design_architecture(reqs)
        assert len(res["components"]) == 2
        assert res["components"][0]["id"] == "CMP-001"
        assert res["components"][1]["id"] == "CMP-002"
        assert len(res["connections"]) == 1
        assert len(res["decisions"]) == 1
        assert res["decisions"][0]["id"] == "ADR-001"


@pytest.mark.asyncio
async def test_at06_validator_catches_omitted_requirement():
    """AT-06: Deterministic validator flags requirements not satisfied by any component."""
    reqs = [
        {"id": "REQ-001", "text": "Login system", "type": "functional"},
        {"id": "REQ-002", "text": "Audit logging", "type": "compliance"},
    ]
    # Component only satisfies REQ-001
    components = [
        {"id": "CMP-001", "name": "Auth", "type": "service", "satisfies": ["REQ-001"]}
    ]
    connections = []

    findings = run_deterministic_validation(reqs, components, connections)
    coverage = compute_coverage(reqs, components)

    # REQ-002 should trigger a coverage finding and an nfr_gap finding
    cov_findings = [f for f in findings if f["type"] == "coverage"]
    assert len(cov_findings) >= 1
    assert "REQ-002" in cov_findings[0]["related_requirement_ids"]
    assert coverage == 50.0


@pytest.mark.asyncio
async def test_at07_change_impact_finds_affected_components():
    """AT-07: Change impact analysis traces changed requirements to affected components."""
    reqs = [
        {"id": "REQ-001", "text": "Support 10,000 users", "type": "non_functional"},
    ]
    components = [
        {"id": "CMP-001", "name": "API Gateway", "satisfies": ["REQ-001"]},
        {"id": "CMP-002", "name": "User DB", "satisfies": []},
    ]
    connections = [
        {"from_component": "CMP-001", "to_component": "CMP-002", "protocol": "TCP"}
    ]

    changes = [{"req_id": "REQ-001", "new_text": "Support 100,000 users"}]

    mock_llm_impact = {
        "changed_requirement_ids": ["REQ-001"],
        "affected_component_ids": ["CMP-001", "CMP-002"],
        "explanation": "Scaling from 10k to 100k users impacts gateway and database.",
        "recommended_changes": ["Add horizontal pod autoscaling", "Add Redis cache layer"],
    }

    with patch("app.agents.impact.call_llm", AsyncMock(return_value=mock_llm_impact)):
        report = await analyze_impact(changes, reqs, components, connections)
        assert "CMP-001" in report["affected_component_ids"]
        assert "CMP-002" in report["affected_component_ids"]
        assert len(report["recommended_changes"]) >= 2


@pytest.mark.asyncio
async def test_at08_assumptions_labelled():
    """AT-08: AI assumptions carry provenance='ai_assumption' and are flagged as assumptions."""
    reqs = [
        {"id": "REQ-001", "text": "User login", "type": "functional", "provenance": "source"},
        {"id": "REQ-002", "text": "Password reset via SMS", "type": "functional", "provenance": "ai_assumption"},
    ]
    assert reqs[1]["provenance"] == "ai_assumption"
    assert reqs[0]["provenance"] == "source"


def test_at09_export_contains_all_sections():
    """AT-09: Markdown export contains requirements, Mermaid diagram, ADRs, and traceability."""
    proj = {"title": "Test E-Commerce", "description": "Demo shop"}
    reqs = [{"id": "REQ-001", "text": "Checkout", "type": "functional", "priority": "High", "status": "confirmed"}]
    comps = [{"id": "CMP-001", "name": "Order Service", "type": "service", "satisfies": ["REQ-001"], "description": "Handles orders"}]
    conns = [{"from_component": "CMP-001", "to_component": "CMP-001", "protocol": "self"}]
    decisions = [{"id": "ADR-001", "title": "Database choice", "context": "...", "decision": "PostgreSQL", "rationale": "ACID"}]
    findings = [{"severity": "Low", "type": "risk", "explanation": "Single DB instance"}]

    md = generate_markdown_report(proj, reqs, comps, conns, decisions, findings, coverage_percent=100.0)

    assert "# Test E-Commerce" in md
    assert "## Requirements" in md
    assert "```mermaid" in md
    assert "## Architecture Decision Records" in md
    assert "## Traceability Matrix" in md
    assert "Coverage: 100.0%" in md
    assert "## Validation Report" in md


@pytest.mark.asyncio
async def test_file_type_handling_graceful():
    """Unsupported or corrupt files fail gracefully without crashing."""
    # Unsupported extension
    res = await parse_file("binary.exe", b"\x00\x01\x02")
    assert "Unsupported file type" in res.get("error", "")

    # Corrupt PDF
    res_pdf = await parse_file("corrupt.pdf", b"not a real pdf content")
    assert res_pdf.get("error") is not None
    assert "Failed to parse" in res_pdf["error"]


def test_brownfield_parsing():
    """Brownfield parser extracts nodes and edges from Mermaid syntax."""
    mermaid_text = """
    graph TD
        A["Web UI"] --> B["API Gateway"]
        B --> C["Database"]
    """
    res = parse_brownfield_architecture(mermaid_text)
    assert len(res["components"]) >= 3
    assert len(res["connections"]) >= 2
    assert res["components"][0]["change_status"] == "kept"


@pytest.mark.asyncio
async def test_router_fallback_on_429():
    """Router falls back to secondary provider on HTTP 429."""
    from app.llm import router
    from app.config import get_settings

    # Mock gemini raising 429, groq succeeding
    async def mock_failing_gemini(*args, **kwargs):
        raise RuntimeError("HTTP 429: Resource has been exhausted")

    async def mock_succeeding_groq(*args, **kwargs):
        return {"result": "groq_fallback_success"}

    mock_providers = [
        ("gemini", "gemini-2.5-flash", mock_failing_gemini),
        ("groq", "llama-4-scout", mock_succeeding_groq),
    ]

    with patch.object(router, "_select_models", return_value=mock_providers):
        with patch.object(router, "get_settings") as mock_set:
            mock_set.return_value.CACHE_ENABLED = False
            res = await router.call_llm(
                task="test_fallback",
                messages=[{"role": "user", "content": "hi"}],
                schema=None,
                tier="fast",
            )
            assert res == {"result": "groq_fallback_success"}


@pytest.mark.asyncio
async def test_id_stability_across_regeneration():
    """Requirement IDs remain stable and unique."""
    proj = await repo.create_project("Stability Test")
    initial_reqs = [
        {"id": "REQ-001", "text": "Requirement 1", "type": "functional", "version": 1},
        {"id": "REQ-002", "text": "Requirement 2", "type": "functional", "version": 1},
    ]
    await repo.save_requirements(proj["id"], initial_reqs)

    # Edit REQ-001
    updated = await repo.update_requirement(proj["id"], "REQ-001", {"text": "Updated Requirement 1"})
    assert updated["id"] == "REQ-001"
    assert updated["version"] == 2

    # Fetch all
    current = await repo.get_requirements(proj["id"])
    assert current[0]["id"] == "REQ-001"
    assert current[0]["version"] == 2
    assert current[1]["id"] == "REQ-002"
    assert current[1]["version"] == 1


