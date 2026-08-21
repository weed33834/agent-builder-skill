"""L7 - Multi-Agent Orchestrator

Coordinates the execution of multiple Agents, managing task allocation, result collection, and error handling.
Supports the A2A (Agent-to-Agent) protocol for cross-Agent communication and collaboration.

A2A protocol features:
  - AgentCard: Agent discovery and registration (/.well-known/agent.json)
  - A2ATask: Task lifecycle management (submitted→working→completed/failed)
  - JSON-RPC 2.0 over HTTP: Remote Agent communication
  - SSE: Streaming for long-running tasks
"""

import json
import uuid
import asyncio
from typing import Optional
from dataclasses import asdict

import httpx

from .base import (
    OrchestratorBase,
    A2AOrchestratorBase,
    SubTask,
    TaskResult,
    AgentCard,
    A2ATask,
    A2AArtifact,
    TaskStatus,
)
from .decomposer import TaskDecomposer
from .aggregator import ResultAggregator


class AgentOrchestrator(OrchestratorBase, A2AOrchestratorBase):
    """Multi-Agent Orchestrator (supports A2A protocol)

    Responsibilities:
    1. Receive user input
    2. Decompose into subtasks
    3. Delegate to appropriate Agents (local or remote)
    4. Collect results
    5. Aggregate output

    A2A capabilities:
    - Register/discover via AgentCard
    - Communicate with remote Agents via JSON-RPC 2.0
    - Support SSE streaming results
    """

    def __init__(self):
        self.decomposer = TaskDecomposer()
        self.aggregator = ResultAggregator()
        self._subtasks: list[SubTask] = []
        self._results: list[TaskResult] = []
        # Known remote Agent list
        self._known_agents: dict[str, AgentCard] = {}
        # Active A2A tasks
        self._active_tasks: dict[str, A2ATask] = {}

    # ── Core orchestration logic ──────────────────────────────────────

    async def run(self, user_input: str) -> str:
        """Execute the complete orchestration flow"""
        # 1. Task decomposition
        self._subtasks = await self.decompose_task(user_input)

        # 2. Execute subtasks in dependency order
        self._results = []
        executed = set()

        max_rounds = len(self._subtasks) + 1
        rounds = 0
        while len(executed) < len(self._subtasks):
            progress = False
            for task in self._subtasks:
                if task.id in executed:
                    continue
                # Check if dependencies are satisfied
                if all(dep in executed for dep in task.dependencies):
                    result = await self._execute_subtask(task)
                    self._results.append(result)
                    executed.add(task.id)
                    progress = True
            if not progress:
                break
            rounds += 1
            if rounds >= max_rounds:
                break

        # 3. Result aggregation
        return await self.aggregate_results(self._results)

    async def decompose_task(self, task: str) -> list[SubTask]:
        """Decompose a task"""
        return await self.decomposer.decompose(task)

    async def _execute_subtask(self, task: SubTask) -> TaskResult:
        """Execute a single subtask

        First checks whether a remote Agent can handle this task type,
        otherwise falls back to local L4 Agent execution.
        """
        task.status = "running"

        # Check if a remote Agent can handle this task
        remote_agent = self._find_agent_for_task(task)
        if remote_agent:
            try:
                a2a_task = A2ATask(
                    id=task.id,
                    status=TaskStatus.SUBMITTED,
                    message={"role": "user", "content": task.description},
                )
                result = await self.delegate_to_agent(remote_agent, a2a_task)
                if result.status == TaskStatus.COMPLETED:
                    task.status = "completed"
                    output = ""
                    if result.artifacts:
                        for part in result.artifacts[-1].parts:
                            if "text" in part:
                                output += part["text"]
                    return TaskResult(
                        task_id=task.id,
                        success=True,
                        output=output or "Task completed",
                    )
                else:
                    raise Exception(f"Remote Agent returned status: {result.status.value}")
            except Exception as e:
                # Remote execution failed, fall back to local
                logger.warning("Remote agent %s failed (%s); falling back to local execution", task.agent, e)

        # Local execution
        return await self._execute_local(task)

    async def _execute_local(self, task: SubTask) -> TaskResult:
        """Execute a subtask via the local L4 Agent"""
        try:
            from ..l4_agent.graph import get_graph, get_graph_config
            graph = get_graph()
            config = get_graph_config(task.id)

            result = await graph.ainvoke(
                {"messages": [("human", task.description)]},
                config,
            )

            task.status = "completed"
            return TaskResult(
                task_id=task.id,
                success=True,
                output=result["messages"][-1].content,
            )
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            return TaskResult(
                task_id=task.id,
                success=False,
                output="",
                error=str(e),
            )

    def _find_agent_for_task(self, task: SubTask) -> Optional[AgentCard]:
        """Find a remote Agent that can handle the task"""
        for agent in self._known_agents.values():
            if task.agent_type in agent.skills or task.agent_type in agent.description:
                return agent
        return None

    async def aggregate_results(self, results: list[TaskResult]) -> str:
        """Aggregate results"""
        return await self.aggregator.aggregate(results)

    def get_status(self) -> dict:
        """Get the current orchestration status"""
        return {
            "total_subtasks": len(self._subtasks),
            "completed": sum(1 for r in self._results if r.success),
            "failed": sum(1 for r in self._results if not r.success),
            "subtasks": [
                {
                    "id": t.id,
                    "description": t.description,
                    "status": t.status,
                    "agent_type": t.agent_type,
                }
                for t in self._subtasks
            ],
        }

    # ── A2A protocol implementation ──────────────────────────────────────

    async def discover_agents(self) -> list[AgentCard]:
        """Discover available remote Agents

        Iterates over known Agent endpoints, querying their /.well-known/agent.json to obtain AgentCards.
        """
        discovered = []
        for agent_url in self._known_agents:
            try:
                card = await self._fetch_agent_card(agent_url)
                if card:
                    self._known_agents[agent_url] = card
                    discovered.append(card)
            except Exception:
                continue
        return discovered

    async def _fetch_agent_card(self, agent_url: str) -> Optional[AgentCard]:
        """Fetch AgentCard from the Agent's /.well-known/agent.json"""
        well_known_url = f"{agent_url.rstrip('/')}/.well-known/agent.json"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(well_known_url, timeout=5.0)
                resp.raise_for_status()
                data = resp.json()
                return AgentCard(
                    name=data.get("name", "unknown"),
                    description=data.get("description", ""),
                    url=data.get("url", agent_url),
                    skills=data.get("skills", []),
                    auth_type=data.get("auth_type", "none"),
                    endpoints=data.get("endpoints", ["/a2a/rpc"]),
                )
            except Exception:
                return None

    async def delegate_to_agent(self, agent: AgentCard, task: A2ATask) -> A2ATask:
        """Delegate a task to a remote Agent for execution

        Sends the task using the JSON-RPC 2.0 over HTTP protocol.
        Supports both synchronous and SSE streaming modes.
        """
        # Use the first endpoint by default
        endpoint = agent.endpoints[0] if agent.endpoints else "/a2a/rpc"
        agent_rpc_url = f"{agent.url.rstrip('/')}{endpoint}"

        # Send the task
        task.status = TaskStatus.WORKING
        self._active_tasks[task.id] = task

        try:
            result = await self.send_task(agent_rpc_url, task)
            return result
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.metadata["error"] = str(e)
            return task

    async def send_task(self, agent_url: str, task: A2ATask) -> A2ATask:
        """Send a task to an Agent via JSON-RPC 2.0

        Supports two modes:
        1. Synchronous mode: returns the result directly
        2. SSE streaming mode: receives progress via Server-Sent Events
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/send",
            "params": {
                "id": task.id,
                "message": task.message,
                "metadata": task.metadata,
            },
            "id": task.id,
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    agent_url,
                    json=payload,
                    timeout=30.0,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                data = resp.json()

                # Handle the JSON-RPC response
                if "error" in data:
                    task.status = TaskStatus.FAILED
                    task.metadata["error"] = data["error"]["message"]
                    return task

                result = data.get("result", {})
                task.status = TaskStatus(result.get("status", "completed"))
                task.artifacts = [
                    A2AArtifact(
                        parts=artifact.get("parts", []),
                        metadata=artifact.get("metadata", {}),
                        index=artifact.get("index", 0),
                    )
                    for artifact in result.get("artifacts", [])
                ]
                return task

            except httpx.TimeoutException:
                task.status = TaskStatus.FAILED
                task.metadata["error"] = "Request timed out"
                return task
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.metadata["error"] = str(e)
                return task

    async def send_task_stream(self, agent_url: str, task: A2ATask) -> A2ATask:
        """Receive task results via SSE streaming

        Suitable for long-running tasks, pushing progress updates in real time.
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "tasks/sendSubscribe",
            "params": {
                "id": task.id,
                "message": task.message,
                "metadata": task.metadata,
            },
            "id": task.id,
        }

        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    agent_url,
                    json=payload,
                    timeout=60.0,
                    headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = json.loads(line[6:])
                            event_type = data.get("type", "")

                            if event_type == "status":
                                task.status = TaskStatus(data.get("status", "working"))
                            elif event_type == "artifact":
                                artifact = A2AArtifact(
                                    parts=data.get("parts", []),
                                    metadata=data.get("metadata", {}),
                                    index=data.get("index", 0),
                                )
                                task.artifacts.append(artifact)
                            elif event_type == "error":
                                task.status = TaskStatus.FAILED
                                task.metadata["error"] = data.get("error", "Unknown error")
                            elif event_type == "completed":
                                task.status = TaskStatus.COMPLETED
                                break

                    return task

            except Exception as e:
                task.status = TaskStatus.FAILED
                task.metadata["error"] = str(e)
                return task

    def register_agent(self, agent: AgentCard):
        """Register a remote Agent"""
        self._known_agents[agent.url] = agent

    def get_agent_card(self) -> AgentCard:
        """Get this Agent's AgentCard (for discovery by other Agents)"""
        return AgentCard(
            name="mindmirror-orchestrator",
            description="MindMirror multi-agent orchestrator with task decomposition and result aggregation",
            url="",
            skills=["task_decomposition", "result_aggregation", "orchestration"],
            auth_type="none",
            endpoints=["/a2a/rpc"],
        )
