"""Task state machine for managing task lifecycle."""
from enum import Enum
from typing import Optional, Set, Dict
from dataclasses import dataclass
from datetime import datetime


class TaskStatus(str, Enum):
    """Valid task statuses."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


@dataclass
class StateTransition:
    """Represents a valid state transition."""

    from_status: TaskStatus
    to_status: TaskStatus
    reason: Optional[str] = None


class TaskStateMachine:
    """State machine for managing task status transitions."""

    # Define allowed transitions from each status
    ALLOWED_TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
        TaskStatus.OPEN: {
            TaskStatus.IN_PROGRESS,
            TaskStatus.BLOCKED,
            TaskStatus.CANCELLED,
        },
        TaskStatus.IN_PROGRESS: {
            TaskStatus.BLOCKED,
            TaskStatus.IN_REVIEW,
            TaskStatus.CANCELLED,
        },
        TaskStatus.BLOCKED: {
            TaskStatus.IN_PROGRESS,
            TaskStatus.CANCELLED,
        },
        TaskStatus.IN_REVIEW: {
            TaskStatus.COMPLETED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.CANCELLED,
        },
        TaskStatus.COMPLETED: set(),  # Terminal state
        TaskStatus.CANCELLED: set(),  # Terminal state
    }

    @classmethod
    def is_transition_valid(
        cls, from_status: TaskStatus, to_status: TaskStatus
    ) -> bool:
        """Check if a transition is allowed."""
        if from_status == to_status:
            return False  # Cannot transition to same state
        return to_status in cls.ALLOWED_TRANSITIONS.get(from_status, set())

    @classmethod
    def get_allowed_transitions(cls, from_status: TaskStatus) -> Set[TaskStatus]:
        """Get all allowed transitions from a given status."""
        return cls.ALLOWED_TRANSITIONS.get(from_status, set()).copy()

    @classmethod
    def can_transition_to(cls, from_status: TaskStatus, to_status: TaskStatus) -> bool:
        """Alias for is_transition_valid."""
        return cls.is_transition_valid(from_status, to_status)

    @classmethod
    def validate_transition(
        cls, from_status: TaskStatus, to_status: TaskStatus
    ) -> None:
        """Validate a transition or raise an exception."""
        if not cls.is_transition_valid(from_status, to_status):
            allowed = cls.get_allowed_transitions(from_status)
            allowed_str = ", ".join([s.value for s in allowed]) if allowed else "none"
            raise ValueError(
                f"Invalid transition from {from_status.value} to {to_status.value}. "
                f"Allowed transitions: {allowed_str}"
            )

    @classmethod
    def get_status_color(cls, status: TaskStatus) -> str:
        """Get color for UI representation of status."""
        colors = {
            TaskStatus.OPEN: "gray",
            TaskStatus.IN_PROGRESS: "blue",
            TaskStatus.BLOCKED: "red",
            TaskStatus.IN_REVIEW: "yellow",
            TaskStatus.COMPLETED: "green",
            TaskStatus.CANCELLED: "gray",
        }
        return colors.get(status, "gray")

    @classmethod
    def get_status_display_name(cls, status: TaskStatus) -> str:
        """Get display name for a status."""
        display_names = {
            TaskStatus.OPEN: "Open",
            TaskStatus.IN_PROGRESS: "In Progress",
            TaskStatus.BLOCKED: "Blocked",
            TaskStatus.IN_REVIEW: "In Review",
            TaskStatus.COMPLETED: "Completed",
            TaskStatus.CANCELLED: "Cancelled",
        }
        return display_names.get(status, status.value)

    @classmethod
    def is_terminal_state(cls, status: TaskStatus) -> bool:
        """Check if a status is a terminal state."""
        return status in (TaskStatus.COMPLETED, TaskStatus.CANCELLED)

    @classmethod
    def is_active(cls, status: TaskStatus) -> bool:
        """Check if a task is active (not completed or cancelled)."""
        return status not in (TaskStatus.COMPLETED, TaskStatus.CANCELLED)
