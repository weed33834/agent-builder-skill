"""L7 - A2A Client

A2A (Agent-to-Agent) protocol client (M6.15 + M6.17).
Discovers remote agents via their Agent Card (/.well-known/agent.json),
submits tasks via JSON-RPC 2.0, and polls task status.

Follows the A2A protocol (Google) shape:
- Agent Card discovery (M6.15)
- task/send, task/get, task/cancel JSON-RPC methods
- Task lifecycle: submitted → working → completed/failed
"""

import json
import uuid
from typing import Any, Optional

from .base import AgentCard, A2ATask, A2AArtifact, TaskStatus
from ..l10_infra.errors import A2AClientError


class A2AClient:
    """Client for communicating with remote A2A agents"""

    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        self._agent_cache: dict[str, AgentCard] = {}

    # ── Agent Card discovery (M6.15) ──────────────────────────

    async def discover_agent(self, base_url: str) -> AgentCard:
        """Fetch an Agent Card from a remote agent.

        Card location per A2A spec: {base_url}/.well-known/agent.json
        """
        if base_url in self._agent_cache:
            return self._agent_cache[base_url]

        import httpx
        url = base_url.rstrip("/") + "/.well-known/agent.json"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            raise A2AClientError(f"Agent card discovery failed for {base_url}: {e}") from e

        card = AgentCard(
            name=data.get("name", base_url),
            description=data.get("description", ""),
            url=data.get("url", base_url),
            skills=data.get("skills", []),
            auth_type=data.get("auth_type", "none"),
            endpoints=data.get("endpoints", ["/a2a/rpc"]),
            version=data.get("version", "1.0.0"),
        )
        self._agent_cache[base_url] = card
        return card

    async def discover_agents(self, base_urls: list[str]) -> list[AgentCard]:
        """Discover multiple agents in parallel"""
        import asyncio
        results = await asyncio.gather(
            *(self.discover_agent(u) for u in base_urls),
            return_exceptions=True,
        )
        return [r for r in results if isinstance(r, AgentCard)]

    # ── task submission (M6.16) ───────────────────────────────

    async def send_task(
        self,
        agent_url: str,
        message: dict,
        *,
        task_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> A2ATask:
        """Submit a task to a remote agent (task/send).

        Args:
            agent_url: base URL of the remote agent
            message: {"role": "user", "parts": [{"type": "text", "text": "..."}]}
            task_id: optional client-generated task id
            metadata: optional task metadata
        Returns:
            A2ATask: the created task with its initial status
        """
        tid = task_id or f"task-{uuid.uuid4().hex[:12]}"
        payload = {
            "jsonrpc": "2.0",
            "method": "task/send",
            "params": {
                "id": tid,
                "message": message,
                "metadata": metadata or {},
            },
            "id": f"send-{tid}",
        }

        data = await self._rpc_call(agent_url, payload)
        return self._parse_task(data.get("result", data))

    async def get_task(self, agent_url: str, task_id: str) -> A2ATask:
        """Fetch the current state of a task (task/get)"""
        payload = {
            "jsonrpc": "2.0",
            "method": "task/get",
            "params": {"id": task_id},
            "id": f"get-{task_id}",
        }
        data = await self._rpc_call(agent_url, payload)
        return self._parse_task(data.get("result", data))

    async def cancel_task(self, agent_url: str, task_id: str) -> A2ATask:
        """Cancel a task (task/cancel)"""
        payload = {
            "jsonrpc": "2.0",
            "method": "task/cancel",
            "params": {"id": task_id},
            "id": f"cancel-{task_id}",
        }
        data = await self._rpc_call(agent_url, payload)
        return self._parse_task(data.get("result", data))

    # ── polling helper (M12.8 long tasks) ─────────────────────

    async def send_and_wait(
        self,
        agent_url: str,
        message: dict,
        *,
        poll_interval: float = 1.0,
        max_wait: float = 120.0,
    ) -> A2ATask:
        """Submit a task and poll until terminal state (M12.8)"""
        import asyncio
        import time

        task = await self.send_task(agent_url, message)
        deadline = time.monotonic() + max_wait

        while task.status in (TaskStatus.SUBMITTED, TaskStatus.WORKING, TaskStatus.INPUT_REQUIRED):
            if time.monotonic() > deadline:
                raise A2AClientError(
                    f"Task {task.id} did not finish within {max_wait}s (status={task.status})"
                )
            await asyncio.sleep(poll_interval)
            task = await self.get_task(agent_url, task.id)

        return task

    # ── internals ──────────────────────────────────────────────

    async def _rpc_call(self, agent_url: str, payload: dict) -> dict:
        """Send a JSON-RPC 2.0 request to the agent's RPC endpoint"""
        import httpx
        card = await self.discover_agent(agent_url)
        endpoint = card.endpoints[0] if card.endpoints else "/a2a/rpc"
        url = agent_url.rstrip("/") + endpoint

        headers = {"Content-Type": "application/json"}
        if card.auth_type == "bearer":
            token = self._get_bearer_token(card.name)
            if token:
                headers["Authorization"] = f"Bearer {token}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            raise A2AClientError(f"A2A RPC call to {url} failed: {e}") from e

        if data.get("error"):
            raise A2AClientError(f"A2A server error: {data['error']}")
        return data

    def _parse_task(self, result: dict) -> A2ATask:
        """Parse the task result into an A2ATask"""
        status_raw = result.get("status", "submitted")
        try:
            status = TaskStatus(status_raw)
        except ValueError:
            status = TaskStatus.SUBMITTED

        artifacts = [
            A2AArtifact(
                parts=a.get("parts", []),
                metadata=a.get("metadata", {}),
                index=a.get("index", i),
            )
            for i, a in enumerate(result.get("artifacts", []))
        ]

        return A2ATask(
            id=result.get("id", ""),
            status=status,
            message=result.get("message"),
            artifacts=artifacts,
            metadata=result.get("metadata", {}),
        )

    def _get_bearer_token(self, agent_name: str) -> Optional[str]:
        """Hook for bearer-token auth providers (M6.17 enterprise auth).
        Override in subclasses or set via settings.A2A_BEARER_TOKENS.
        """
        try:
            from ..l10_infra.config import settings
            tokens = getattr(settings, "A2A_BEARER_TOKENS", {}) or {}
            return tokens.get(agent_name)
        except Exception:
            return None

    def task_text(self, task: A2ATask) -> str:
        """Extract the text content of a task's artifacts (for display)"""
        parts: list[str] = []
        for artifact in task.artifacts:
            for part in artifact.parts:
                if isinstance(part, dict) and part.get("type") == "text":
                    parts.append(part.get("text", ""))
        return "\n".join(parts)
