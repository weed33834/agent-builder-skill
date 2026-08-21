"""L7 - Orchestrator Base

Defines the base interfaces and data structures for the orchestration layer.
Includes A2A (Agent-to-Agent) protocol support.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional
from dataclasses import dataclass, field
from enum import Enum


# ─── Core orchestration data classes ───────────────────────────────────────

@dataclass
class SubTask:
    """Subtask definition"""
    id: str
    description: str
    agent_type: str
    input_data: dict
    dependencies: list[str] = field(default_factory=list)
    status: str = "pending"  # pending | running | completed | failed
    result: Any = None
    error: str = ""


@dataclass
class TaskResult:
    """Task execution result"""
    task_id: str
    success: bool
    output: Any
    error: str = ""


# ─── A2A protocol data classes ────────────────────────────────────────

class TaskStatus(str, Enum):
    """A2A task status (lifecycle)"""
    SUBMITTED = "submitted"
    WORKING = "working"
    INPUT_REQUIRED = "input-required"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


@dataclass
class AgentCard:
    """Agent discovery card (A2A /.well-known/agent.json)

    Used for Agent registration and discovery, describing the Agent's capabilities and access methods.
    """
    name: str
    description: str
    url: str
    skills: list[str] = field(default_factory=list)
    auth_type: str = "none"  # none | bearer | oauth2
    endpoints: list[str] = field(default_factory=lambda: ["/a2a/rpc"])
    version: str = "1.0.0"


@dataclass
class A2AArtifact:
    """A2A task artifact"""
    parts: list[dict] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    index: int = 0


@dataclass
class A2ATask:
    """A2A task description

    Follows the A2A protocol specification, managing the full lifecycle state of a task.
    """
    id: str
    status: TaskStatus = TaskStatus.SUBMITTED
    message: Optional[dict] = None
    artifacts: list[A2AArtifact] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


# ─── Orchestrator base classes ────────────────────────────────────────────

class OrchestratorBase(ABC):
    """Orchestrator base class"""

    @abstractmethod
    async def run(self, user_input: str) -> str:
        """Execute the orchestration flow"""
        ...

    @abstractmethod
    async def decompose_task(self, task: str) -> list[SubTask]:
        """Decompose a task into subtasks"""
        ...

    @abstractmethod
    async def aggregate_results(self, results: list[TaskResult]) -> str:
        """Aggregate subtask results"""
        ...


class A2AOrchestratorBase(ABC):
    """A2A orchestrator base class (supports Agent-to-Agent protocol)"""

    @abstractmethod
    async def discover_agents(self) -> list[AgentCard]:
        """Discover available remote Agents"""
        ...

    @abstractmethod
    async def delegate_to_agent(self, agent: AgentCard, task: A2ATask) -> A2ATask:
        """Delegate a task to a remote Agent for execution"""
        ...

    @abstractmethod
    async def send_task(self, agent_url: str, task: A2ATask) -> A2ATask:
        """Send a task to an Agent via JSON-RPC 2.0"""
        ...
