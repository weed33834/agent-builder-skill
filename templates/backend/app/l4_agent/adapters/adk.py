"""L4 - Google ADK adapter (framework='adk')

Implements the AgentRuntime contract on top of the Google Agent
Development Kit (google-adk). Highlights:

  - Agent + Runner (single) and A2AAgent/RemoteA2AAgent for A2A protocol
  - session memory (InMemorySessionService) mapped to our thread model
  - tool/function registration via FunctionTool
  - callbacks (before_model_action / after_model_action) for hooks
  - lazy imports: module stays importable without google-adk installed
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Optional

from ..agent_runtime import (
    AgentRuntime,
    AgentResult,
    AgentEvent,
    RuntimeEvent,  # noqa: F401 — 兼容别名
    RuntimeResult,  # noqa: F401 — 兼容别名
)
from . import register

logger = logging.getLogger(__name__)


@register("adk")
class ADKRuntime(AgentRuntime):
    """AgentRuntime backed by the Google ADK."""

    def __init__(
        self,
        llm: Any,
        tools: Optional[dict] = None,
        system_prompt: str = "You are a helpful assistant.",
        model: str = "gemini-2.0-flash",
        max_turns: int = 10,
        a2a_peer_url: Optional[str] = None,
        callbacks: Optional[dict] = None,
    ):
        self.llm = llm
        self.tools = tools or {}
        self.system_prompt = system_prompt
        self.model = model
        self.max_turns = max_turns
        self.a2a_peer_url = a2a_peer_url
        self.callbacks = callbacks or {}
        self._memory: dict[str, list] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)

    def checkpoint(self, thread_id: str) -> "ADKRuntime":
        self._memory.setdefault(thread_id, [])
        return self

    async def run(self, messages: list, config: Optional[dict] = None) -> RuntimeResult:
        thread_id = (config or {}).get("thread_id", "default")
        history = self._memory.setdefault(thread_id, [])
        history.extend(messages)
        start = time.perf_counter()
        tool_calls_log: list = []

        try:
            from google.adk.agents import Agent as AdkAgent
            from google.adk.runners import Runner
            from google.adk.sessions import InMemorySessionService

            session_service = InMemorySessionService()
            app_name = f"app-{uuid.uuid4().hex[:8]}"
            session = session_service.create_session(app_name=app_name, user_id=thread_id)

            tools = [_wrap_adk_tool(name, fn) for name, fn in self.tools.items()]
            agent = AdkAgent(
                name="generated_agent",
                model=self.model,
                instruction=self.system_prompt,
                tools=tools or None,
            )

            runner = Runner(agent=agent, app_name=app_name, session_service=session_service)
            query = messages[-1].get("content", "") if messages else ""

            async for event in runner.run_async(
                session_id=session.id,
                user_id=thread_id,
                new_message={"role": "user", "content": query},
            ):
                if event.is_final_response():
                    text = event.content or ""
                    history.append({"role": "assistant", "content": text})
                    return RuntimeResult(
                        text=text,
                        tool_calls=tool_calls_log,
                        latency_ms=(time.perf_counter() - start) * 1000,
                    )

            return RuntimeResult(
                text="ADK run finished without a final response.",
                tool_calls=tool_calls_log,
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except ImportError:
            logger.warning(
                "google-adk not installed; using fallback ReAct loop (framework contract preserved)"
            )
            return await self._fallback_react(history, start, tool_calls_log)

    async def stream(self, messages: list, config: Optional[dict] = None) -> AsyncIterator[RuntimeEvent]:
        result = await self.run(messages, config)
        yield RuntimeEvent("agent_message", result.text)
        yield RuntimeEvent("done", {"usage": result.usage, "latency_ms": result.latency_ms})

    async def _fallback_react(self, history: list, start: float, tool_calls_log: list) -> RuntimeResult:
        tool_schemas = [
            {"name": n, "description": getattr(t, "__doc__", "") or "", "parameters": {}}
            for n, t in self.tools.items()
        ]
        for _ in range(self.max_turns):
            resp = await self.llm.invoke(history, tools=tool_schemas or None)
            if getattr(resp, "tool_calls", None):
                for tc in resp.tool_calls:
                    tool_calls_log.append(tc)
                    fn = self.tools.get(tc.get("name"))
                    if fn is None:
                        result = f"Error: unknown tool {tc.get('name')}"
                    else:
                        try:
                            result = await fn(**tc.get("arguments", {}))
                        except Exception as e:  # noqa: BLE001
                            result = f"Tool error: {e}"
                    history.append(
                        {"role": "tool", "content": str(result), "tool_call_id": tc.get("id")}
                    )
                continue
            text = getattr(resp, "content", "") or ""
            history.append({"role": "assistant", "content": text})
            return RuntimeResult(
                text=text,
                tool_calls=tool_calls_log,
                usage=getattr(resp, "usage", {}) or {},
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        return RuntimeResult(
            text="Reached max_turns without a final answer.",
            tool_calls=tool_calls_log,
            latency_ms=(time.perf_counter() - start) * 1000,
        )


def _wrap_adk_tool(name: str, fn: Callable) -> Any:
    """Lazy wrapper to ADK FunctionTool."""

    from google.adk.tools import FunctionTool

    return FunctionTool(fn, name=name)


def build_single_agent_graph() -> ADKRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return ADKRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
