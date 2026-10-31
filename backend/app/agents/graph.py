"""LangGraph stateful workflow definition for ArchMind AI."""

import logging
from typing import TypedDict, Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class WorkflowState(str, Enum):
    INPUT_RECEIVED = "INPUT_RECEIVED"
    REQUIREMENTS_EXTRACTED = "REQUIREMENTS_EXTRACTED"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    REQUIREMENTS_CONFIRMED = "REQUIREMENTS_CONFIRMED"
    ARCHITECTURE_GENERATED = "ARCHITECTURE_GENERATED"
    VALIDATION_COMPLETE = "VALIDATION_COMPLETE"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    ARCHITECTURE_UPDATED = "ARCHITECTURE_UPDATED"


class AgentState(TypedDict, total=False):
    """Workflow state dictionary."""
    project_id: str
    state: str
    extracted_text: str
    source_refs: List[Dict[str, Any]]
    requirements: List[Dict[str, Any]]
    clarifications: List[Dict[str, Any]]
    components: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    coverage_percent: float
    impact_report: Dict[str, Any]
    error: Optional[str]
    brownfield_components: List[Dict[str, Any]]
    brownfield_connections: List[Dict[str, Any]]
    mode: str


def get_initial_state(project_id: str, mode: str = "greenfield") -> AgentState:
    """Create the initial workflow state."""
    return AgentState(
        project_id=project_id,
        state=WorkflowState.INPUT_RECEIVED,
        extracted_text="",
        source_refs=[],
        requirements=[],
        clarifications=[],
        components=[],
        connections=[],
        decisions=[],
        findings=[],
        coverage_percent=0.0,
        impact_report={},
        error=None,
        brownfield_components=[],
        brownfield_connections=[],
        mode=mode,
    )


def transition_state(current: str, action: str) -> str:
    """State transition helper."""
    transitions = {
        (WorkflowState.INPUT_RECEIVED, "extract"): WorkflowState.REQUIREMENTS_EXTRACTED,
        (WorkflowState.REQUIREMENTS_EXTRACTED, "clarify"): WorkflowState.CLARIFICATION_REQUIRED,
        (WorkflowState.REQUIREMENTS_EXTRACTED, "skip_clarify"): WorkflowState.REQUIREMENTS_CONFIRMED,
        (WorkflowState.CLARIFICATION_REQUIRED, "confirm"): WorkflowState.REQUIREMENTS_CONFIRMED,
        (WorkflowState.REQUIREMENTS_CONFIRMED, "design"): WorkflowState.ARCHITECTURE_GENERATED,
        (WorkflowState.ARCHITECTURE_GENERATED, "validate"): WorkflowState.VALIDATION_COMPLETE,
        (WorkflowState.VALIDATION_COMPLETE, "review"): WorkflowState.HUMAN_REVIEW,
        (WorkflowState.HUMAN_REVIEW, "approve"): WorkflowState.ARCHITECTURE_UPDATED,
        (WorkflowState.HUMAN_REVIEW, "revise"): WorkflowState.ARCHITECTURE_GENERATED,
    }
    return transitions.get((current, action), current)

