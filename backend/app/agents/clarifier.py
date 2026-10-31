"""Clarification Agent - detects ambiguity, missing info, and conflicts."""

import json
import logging
from ..llm.router import call_llm
from ..llm.schemas import IssuesAnalysis
from ..llm.prompts.clarifier import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)


def _fallback_detect_issues(requirements: list[dict]) -> list[dict]:
    """Deterministic ambiguity, missing information, and conflict detection grounded in requirements."""
    issues = []
    issue_counter = 0

    # 1. Ambiguity detection on specific requirements
    vague_patterns = [
        (
            ["fast", "responsive", "low latency", "quick"],
            "Ambiguity in performance criterion: '{term}' lacks an objective percentile latency threshold (e.g. p95/p99 under load). Without a target SLA, caching, CDN, and connection pooling cannot be sized properly.",
            "What is the exact target p95 and p99 response time SLA for this operation under standard and peak loads?",
            "Medium",
            "ambiguity",
            [
                "p95 latency < 200ms, p99 latency < 500ms under 5,000 concurrent users",
                "p95 latency < 100ms for read endpoints, < 400ms for writes",
                "Best-effort latency with asynchronous queueing for operations exceeding 1 second",
            ],
        ),
        (
            ["scalable", "high volume", "concurrent", "extensible"],
            "Unquantified capacity target: '{term}' does not specify numerical peak concurrent users, requests per second (RPS), or data volume growth, impacting horizontal auto-scaling design.",
            "What are the targeted peak concurrent active users and sustained requests per second (RPS) for the system?",
            "High",
            "scalability",
            [
                "10,000+ peak concurrent users with 5,000 peak RPS",
                "25,000 peak concurrent users with auto-scaling Kubernetes HPA triggered at 70% CPU",
                "50,000+ distributed global sessions with multi-region active-active read replicas",
            ],
        ),
        (
            ["user-friendly", "intuitive", "easy to use", "seamless"],
            "Subjective usability specification: '{term}' cannot be verified objectively during acceptance testing or user interface validation.",
            "What specific measurable usability target or checkout funnel step constraint applies to this flow?",
            "Low",
            "ambiguity",
            [
                "Checkout completed within 3 steps or under 45 seconds total elapsed time",
                "Strict adherence to WCAG 2.1 AA accessibility compliance across mobile and web",
                "Single-click repeat order capability with stored payment tokens",
            ],
        ),
        (
            ["secure", "safe", "safeguard", "protected"],
            "Unspecified security mechanism: '{term}' lacks encryption standards, key rotation policy, or token management details.",
            "What specific cryptographic algorithms, key management system (KMS), and authentication tokens are required?",
            "High",
            "security",
            [
                "TLS 1.3 in transit and AES-256 envelope encryption with KMS key rotation every 90 days",
                "Zero-trust mTLS for all inter-service mesh communication with SPIFFE/SPIRE IDs",
                "Standard cloud-managed encryption-at-rest with customer-managed keys (CMK)",
            ],
        ),
    ]

    for r in requirements:
        low = r.get("text", "").lower()
        r_id = r.get("id", "REQ-000")

        for terms, explanation_tmpl, question, priority, category, answers in vague_patterns:
            matched_term = next((t for t in terms if t in low), None)
            if matched_term and not any(k in low for k in ("<", "ms", "rps", "aes-256", "tls 1.3")):
                issue_counter += 1
                issues.append({
                    "id": f"CLR-{issue_counter:03d}",
                    "issue_id": f"ISS-{issue_counter:03d}",
                    "question": question,
                    "answer": "",
                    "status": "open",
                    "kind": category,
                    "priority": priority,
                    "category": category,
                    "explanation": f"Requirement {r_id}: " + explanation_tmpl.format(term=matched_term),
                    "requirement_ids": [r_id],
                    "suggested_answers": answers,
                })
                break  # one ambiguity per requirement is sufficient

    # 2. Conflict: Data Residency vs Global SaaS Providers
    residency_reqs = [
        r["id"] for r in requirements
        if any(k in r.get("text", "").lower() for k in ["residency", "leave the country", "sovereignty", "domestic", "jurisdiction"])
    ]
    third_party_reqs = [
        r["id"] for r in requirements
        if any(k in r.get("text", "").lower() for k in ["stripe", "google maps", "facebook", "apple", "twilio", "aws global", "cdn"])
    ]

    if residency_reqs and third_party_reqs:
        issue_counter += 1
        issues.append({
            "id": f"CLR-{issue_counter:03d}",
            "issue_id": f"ISS-{issue_counter:03d}",
            "question": (
                f"Data residency mandate ({', '.join(residency_reqs)}) prohibits personal data from leaving national borders, "
                f"yet global SaaS integrations ({', '.join(third_party_reqs[:2])}) process customer telemetry across multinational clusters. "
                "How should customer location coordinates and payment details be isolated to preserve compliance?"
            ),
            "answer": "",
            "status": "open",
            "kind": "conflict",
            "priority": "High",
            "category": "conflict",
            "explanation": (
                f"Direct regulatory contradiction between sovereign data residency ({', '.join(residency_reqs)}) "
                f"and external cloud providers ({', '.join(third_party_reqs[:2])})."
            ),
            "requirement_ids": residency_reqs + third_party_reqs[:2],
            "suggested_answers": [
                "Deploy a sovereign Payment & Tokenization Proxy (CMP-004) that anonymizes PII domestically before delegating tokens abroad",
                "Switch to a certified domestic payment and mapping provider hosted strictly within local data centers",
                "Obtain regulatory safe-harbor compliance approval for tokenized payment requests passing through PCI-DSS certified rails",
            ],
        })

    # 3. Missing info: Authentication / Authorization Strategy
    auth_reqs = [
        r["id"] for r in requirements
        if any(k in r.get("text", "").lower() for k in ["login", "user", "customer", "account", "profile", "admin", "driver", "restaurant"])
    ]
    has_explicit_auth = any(
        any(k in r.get("text", "").lower() for k in ["oauth", "jwt", "saml", "oidc", "rbac", "mfa", "2fa"])
        for r in requirements
    )
    if auth_reqs and not has_explicit_auth:
        issue_counter += 1
        issues.append({
            "id": f"CLR-{issue_counter:03d}",
            "issue_id": f"ISS-{issue_counter:03d}",
            "question": (
                f"Multiple requirements ({', '.join(auth_reqs[:3])}) govern distinct customer, vendor, and administrative roles, "
                "but no authentication protocol, token lifecycle, or role-based access control (RBAC) standard is defined. "
                "Which authentication framework should be implemented?"
            ),
            "answer": "",
            "status": "open",
            "kind": "missing",
            "priority": "High",
            "category": "missing",
            "explanation": "Critical security gap: Without a defined authentication and authorization standard, the API Gateway and microservices cannot enforce authorization scopes or role separation.",
            "requirement_ids": auth_reqs[:3],
            "suggested_answers": [
                "OAuth 2.0 + OpenID Connect (OIDC) with stateless RS256-signed JWTs and Redis-backed refresh token revocation",
                "Session-based stateful authentication utilizing encrypted Redis cookies and API Gateway session termination",
                "SAML 2.0 / Enterprise SSO with multi-tenant RBAC policies enforced at the service mesh layer",
            ],
        })

    # 4. Missing info: Disaster Recovery & Backup Strategy
    data_reqs = [
        r["id"] for r in requirements
        if any(k in r.get("text", "").lower() for k in ["order", "payment", "transaction", "database", "record", "history", "store"])
    ]
    has_dr = any(
        any(k in r.get("text", "").lower() for k in ["backup", "disaster recovery", "rto", "rpo", "replication", "failover"])
        for r in requirements
    )
    if data_reqs and not has_dr:
        issue_counter += 1
        issues.append({
            "id": f"CLR-{issue_counter:03d}",
            "issue_id": f"ISS-{issue_counter:03d}",
            "question": (
                f"Financial and operational transactions ({', '.join(data_reqs[:2])}) require persistent storage, "
                "but no Recovery Point Objective (RPO), Recovery Time Objective (RTO), or database backup retention schedule is specified. "
                "What are the target business continuity requirements?"
            ),
            "answer": "",
            "status": "open",
            "kind": "missing",
            "priority": "Medium",
            "category": "missing",
            "explanation": "Missing operational recovery targets: Database replication topology and cold storage backup automation cannot be provisioned without defined RTO/RPO metrics.",
            "requirement_ids": data_reqs[:2],
            "suggested_answers": [
                "RPO < 5 minutes (continuous WAL streaming) and RTO < 30 minutes with automated multi-AZ database failover",
                "RPO < 1 hour (snapshot-based) and RTO < 4 hours with daily off-site encrypted backups retained for 90 days",
                "Daily automated midnight cold backup with 30-day retention and manual disaster restoration runbook",
            ],
        })

    return issues


async def detect_issues(requirements: list[dict]) -> list[dict]:
    """Detect ambiguity, missing info, and conflicts in requirements."""
    if not requirements:
        return []

    req_json = json.dumps(requirements, indent=2)
    user_prompt = USER_PROMPT_TEMPLATE.format(requirements_json=req_json)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        result = await call_llm(
            task="clarification_detection",
            messages=messages,
            schema=IssuesAnalysis,
            tier="fast",
        )

        issues = result.get("issues", [])
        if not issues:
            logger.info("LLM returned 0 issues, falling back to deterministic requirements analysis")
            return _fallback_detect_issues(requirements)

        clarifications = []
        for i, issue in enumerate(issues):
            raw_req_ids = issue.get("requirement_ids", [])
            # Validate that requirement_ids match real requirements
            valid_req_ids = [
                rid for rid in raw_req_ids
                if any(r.get("id") == rid for r in requirements)
            ]
            if not valid_req_ids and requirements:
                # If LLM didn't link a valid ID, attach the first relevant requirement
                valid_req_ids = [requirements[0].get("id", "REQ-001")]

            category = issue.get("category", issue.get("kind", "ambiguity"))
            priority = issue.get("priority", "Medium")
            if priority not in ("High", "Medium", "Low"):
                priority = "Medium"

            clar = {
                "id": f"CLR-{i+1:03d}",
                "issue_id": issue.get("id", f"ISS-{i+1:03d}"),
                "question": issue.get("suggested_question", issue.get("question", "")),
                "answer": "",
                "status": "open",
                "kind": category,
                "priority": priority,
                "category": category,
                "explanation": issue.get("explanation", ""),
                "requirement_ids": valid_req_ids,
                "suggested_answers": issue.get("suggested_answers", []),
            }
            clarifications.append(clar)

        return clarifications

    except Exception as e:
        logger.warning(
            "LLM clarification error: %s. Activating deterministic issue detection fallback.",
            e,
        )
        return _fallback_detect_issues(requirements)
