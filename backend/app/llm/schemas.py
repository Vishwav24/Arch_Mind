"""Pydantic v2 schemas for ArchMind AI domain objects."""

from pydantic import BaseModel, Field
from typing import Optional, Union
from enum import Enum


# ──────────────────────────── Enums ────────────────────────────


class RequirementType(str, Enum):
    FUNCTIONAL = "functional"
    NON_FUNCTIONAL = "non_functional"
    BUSINESS_CONSTRAINT = "business_constraint"
    TECHNICAL_CONSTRAINT = "technical_constraint"
    SECURITY = "security"
    COMPLIANCE = "compliance"


class Priority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class RequirementStatus(str, Enum):
    NEW = "new"
    CONFIRMED = "confirmed"
    AMBIGUOUS = "ambiguous"
    CONFLICTING = "conflicting"


class Provenance(str, Enum):
    SOURCE = "source"
    AI_ASSUMPTION = "ai_assumption"


class ComponentType(str, Enum):
    FRONTEND = "frontend"
    SERVICE = "service"
    DATABASE = "database"
    QUEUE = "queue"
    CACHE = "cache"
    EXTERNAL = "external"
    SECURITY = "security"
    INFRA = "infra"


class ChangeStatus(str, Enum):
    NEW = "new"
    KEPT = "kept"
    MODIFIED = "modified"
    ADDED = "added"
    REMOVED = "removed"


class IssueKind(str, Enum):
    AMBIGUITY = "ambiguity"
    MISSING = "missing"
    CONFLICT = "conflict"
    SECURITY = "security"
    SCALABILITY = "scalability"
    INCOMPLETE = "incomplete"
    TECHNICAL = "technical"


class ClarificationStatus(str, Enum):
    OPEN = "open"
    ANSWERED = "answered"
    SKIPPED = "skipped"
    UNKNOWN = "unknown"
    ASSUMPTION_APPROVED = "assumption_approved"


class ADRStatus(str, Enum):
    PROPOSED = "Proposed"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    SUPERSEDED = "Superseded"


class Severity(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class FindingType(str, Enum):
    COVERAGE = "coverage"
    MISSING_COMPONENT = "missing_component"
    NFR_GAP = "nfr_gap"
    INCONSISTENCY = "inconsistency"
    RISK = "risk"
    ASSUMPTION = "assumption"


# ──────────────────────────── Models ───────────────────────────


class SourceRef(BaseModel):
    doc: str = ""
    location: str = ""
    quote: str = ""


class Requirement(BaseModel):
    id: str = Field(..., pattern=r"^REQ-\d{3}$")
    text: str
    type: RequirementType
    priority: Priority = Priority.MEDIUM
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)
    source: SourceRef = Field(default_factory=SourceRef)
    provenance: Provenance = Provenance.SOURCE
    status: RequirementStatus = RequirementStatus.NEW
    version: int = 1


class Issue(BaseModel):
    id: str
    kind: str = "ambiguity"
    requirement_ids: list[str] = []
    explanation: str
    suggested_question: str
    priority: str = "Medium"
    category: str = "ambiguity"
    suggested_answers: list[str] = []


class Clarification(BaseModel):
    id: str
    issue_id: str
    question: str
    answer: str = ""
    status: str = "open"
    kind: str = "ambiguity"
    explanation: str = ""
    requirement_ids: list[str] = []
    priority: str = "Medium"
    category: str = "ambiguity"
    suggested_answers: list[str] = []


class Component(BaseModel):
    id: str = Field(..., pattern=r"^CMP-\d{3}$")
    name: str
    type: ComponentType
    description: str = ""
    responsibilities: list[str] = []
    satisfies: list[str] = []
    provenance: Provenance = Provenance.SOURCE
    change_status: ChangeStatus = ChangeStatus.NEW


class Connection(BaseModel):
    id: str
    source: str = Field(alias="from_component")
    target: str = Field(alias="to_component")
    protocol: str = ""
    data_description: str = ""

    model_config = {"populate_by_name": True}


class ADR(BaseModel):
    id: str
    title: str
    status: str = "Proposed"
    context: str
    decision: str
    rationale: str
    alternatives: list[str] = []
    trade_offs: list[str] = []
    related_requirement_ids: list[str] = []


class Finding(BaseModel):
    id: str
    type: FindingType
    severity: Severity = Severity.MEDIUM
    related_requirement_ids: list[str] = []
    related_component_ids: list[str] = []
    explanation: str


class ImpactReport(BaseModel):
    changed_requirement_ids: list[str] = []
    affected_component_ids: list[str] = []
    explanation: str = ""
    recommended_changes: list[str] = []


class ArchitectureOutput(BaseModel):
    style: str = ""
    components: list[Component] = []
    connections: list[Connection] = []
    rationale: str = ""
    security_notes: str = ""
    infrastructure_notes: str = ""


class RequirementsAnalysis(BaseModel):
    requirements: list[Requirement] = []


class IssuesAnalysis(BaseModel):
    issues: list[Issue] = []


class ClarificationList(BaseModel):
    clarifications: list[Clarification] = []


class ADRList(BaseModel):
    decisions: list[ADR] = []


class FindingsList(BaseModel):
    findings: list[Finding] = []
