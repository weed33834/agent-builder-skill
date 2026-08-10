"""L7 - A2A Server

A2A (Agent-to-Agent) protocol server (M6.16 + M6.17).
Exposes this agent to remote agents via JSON-RPC 2.0 endpoints:

- GET  /.well-known/agent.json  → Agent Card (discovery)
- POST /a2a/rpc                 → task/send, task/get, task/cancel

Integrates with FastAPI via A2ARouter (see l8_api/routes/a2a.py).
"""

import asyncio
import uuid
from typing import Any, Callable, Optional

from .base import AgentCard, A2ATask, A2AArtifact, TaskStatus
from ..l10_infra.errors import A2AServerError

TaskHandler = Callable[[dict, dict], Any]  # (message, metadata) -> result


class A2AServer:
    """In-process A2A task server.

    Usage:
        server = A2AServer(
            card=AgentCard(name="helper", description="...", url="http://host:8000"),
            handler=my_task_handler,
        )
        # Wire into FastAPI (see l8_api/routes/a2a.py):
        #   @router.get("/.well-known/agent.json") → server.card_dict()
        #   @router.post("/a2a/rpc")               → await server.handle_rpc(payload)
    """

    def __init__(
        self,
        card: AgentCard,
        handler: TaskHandler,
        *,
        task_store: Optional[dict[str, A2ATask]] = None,
        polling: bool = True,
    ):
        self.card = card
        self.handler = handler
        self._tasks: dict[str, A2ATask] = task_store if task_store is not None else {}
        self.polling = polling  # when True, handler runs async (task/send returns immediately)

    # ── Agent Card (discovery, M6.15) ─────────────────────────

    def card_dict(self) -> dict:
        """Agent Card as JSON (served at /.well-known/agent.json)"""
        return {
            "name": self.card.name,
            "description": self.card.description,
            "url": self.card.url,
            "skills": self.card.skills,
            "auth_type": self.card.auth_type,
            "endpoints": self.card.endpoints,
            "version": self.card.version,
        }

    # ── JSON-RPC handler (M6.16) ──────────────────────────────

    async def handle_rpc(self, payload: dict) -> dict:
        """Handle an incoming A2A JSON-RPC 2.0 request.

        Returns a JSON-RPC response dict (with result or error).
        """
        method = payload.get("method", "")
        request_id = payload.get("id", "unknown")
        params = payload.get("params", {}) or {}

        try:
            if method == "task/send":
                result = await self._handle_send(params)
            elif method == "task/get":
                result = await self._handle_get(params)
            elif method == "task/cancel":
                result = await self._handle_cancel(params)
            elif method == "agents/list":
                result = {"agents": [self.card_dict()]}
            else:
                return self._error(request_id, -32601, f"Method not found: {method}")
        except A2AServerError as e:
            return self._error(request_id, -32000, str(e))
        except Exception as e:
            return self._error(request_id, -32603, f"Internal error: {e}")

        return {"jsonrpc": "2.0", "result": result, "id": request_id}

    # ── method implementations ────────────────────────────────

    async def _handle_send(self, params: dict) -> dict:
        task_id = params.get("id") or f"task-{uuid.uuid4().hex[:12]}"
        message = params.get("message", {})
        metadata = params.get("metadata", {})

        task = A2ATask(
            id=task_id,
            status=TaskStatus.SUBMITTED,
            message=message,
            metadata=metadata,
        )
        self._tasks[task_id] = task

        if self.polling:
            # Return immediately; run handler in background (M12.8 long tasks)
            asyncio.create_task(self._run_handler(task_id, message, metadata))
            return self._task_to_dict(task)

        # Synchronous mode: run handler before responding
        return await self._run_handler(task_id, message, metadata)

    async def _run_handler(self, task_id: str, message: dict, metadata: dict) -> dict:
        task = self._tasks.get(task_id)
        if task is None:
            raise A2AServerError(f"Task {task_id} not found")

        task.status = TaskStatus.WORKING
        try:
            result = await self.handler(message, metadata)
            if isinstance(result, dict) and result.get("error"):
                task.status = TaskStatus.FAILED
                task.metadata = {**task.metadata, "error": result["error"]}
            else:
                task.status = TaskStatus.COMPLETED
                task.artifacts.append(A2AArtifact(parts=[
                    {"type": "text", "text": str(result)}
                ]))
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.metadata = {**task.metadata, "error": str(e)}

        return self._task_to_dict(task)

    async def _handle_get(self, params: dict) -> dict:
        task = self._tasks.get(params.get("id", ""))
        if task is None:
            raise A2AServerError(f"Task {params.get('id')} not found")
        return self._task_to_dict(task)

    async def _handle_cancel(self, params: dict) -> dict:
        task = self._tasks.get(params.get("id", ""))
        if task is None:
            raise A2AServerError(f"Task {params.get('id')} not found")
        task.status = TaskStatus.CANCELED
        return self._task_to_dict(task)

    # ── public REST helpers (used by l8_api/routes/a2a.py) ─────

    def get_task(self, task_id: str) -> Optional[dict]:
        """Return one task as dict (REST GET /a2a/tasks/{id})"""
        task = self._tasks.get(task_id)
        return self._task_to_dict(task) if task else None

    def cancel_task(self, task_id: str) -> Optional[dict]:
        """Cancel one task (REST POST /a2a/tasks/{id}/cancel)"""
        task = self._tasks.get(task_id)
        if task is None:
            return None
        task.status = TaskStatus.CANCELED
        return self._task_to_dict(task)

    # ── serialization ──────────────────────────────────────────

    def _task_to_dict(self, task: A2ATask) -> dict:
        return {
            "id": task.id,
            "status": task.status.value,
            "message": task.message,
            "artifacts": [
                {"parts": a.parts, "metadata": a.metadata, "index": a.index}
                for a in task.artifacts
            ],
            "metadata": task.metadata,
        }

    def _error(self, request_id: Any, code: int, message: str) -> dict:
        return {
            "jsonrpc": "2.0",
            "error": {"code": code, "message": message},
            "id": request_id,
        }

    # ── introspection ──────────────────────────────────────────

    def list_tasks(self) -> list[dict]:
        return [self._task_to_dict(t) for t in self._tasks.values()]

    def task_count(self) -> int:
        return len(self._tasks)
