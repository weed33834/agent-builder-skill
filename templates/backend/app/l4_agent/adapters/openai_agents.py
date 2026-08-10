"""L4 - OpenAI Agents SDK adapter (framework='openai-agents')

Implements the AgentRuntime contract on top of the OpenAI Agents SDK
(openai-agents >= 0.0.10, the successor of the deprecated Swarm).

Design notes:
  - Each runtime is built from an LLMAdapter (L1) + ToolRegistry (L5),
    keeping the rest of the 10-layer stack framework-agnostic.
  - Guardrails (input/output) and Handoffs are wired through options so
    they can be toggled from the generated config.
  - The SDK import is lazy: the module stays importable in environments
    without openai-agents installed (matching the template's policy for
    optional heavy deps).
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


@register("openai-agents")
class OpenAIAgentsRuntime(AgentRuntime):
    """AgentRuntime backed by the OpenAI Agents SDK."""

    def __init__(
        self,
        llm: Any,
        tools: Optional[dict] = None,
        system_prompt: str = "You are a helpful assistant.",
        max_turns: int = 10,
        guardrails: Optional[dict] = None,
        handoffs: Optional[list] = None,
        model: str = "gpt-4o-mini",
    ):
        self.llm = llm
        self.tools = tools or {}
        self.system_prompt = system_prompt
        self.max_turns = max_turns
        self.guardrails = guardrails or {"input": None, "output": None}
        self.handoffs = handoffs or []
        self.model = model
        self._memory: dict[str, list] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)

    def checkpoint(self, thread_id: str) -> "OpenAIAgentsRuntime":
        self._memory.setdefault(thread_id, [])
        return self

    async def run(self, messages: list, config: Optional[dict] = None) -> RuntimeResult:
        """Run the agent loop. Falls back to a manual ReAct loop when the
        openai-agents package is not installed (keeps templates testable
        in minimal environments)."""
        thread_id = (config or {}).get("thread_id", "default")
        history = self._memory.setdefault(thread_id, [])
        history.extend(messages)
        start = time.perf_counter()
        tool_calls_log: list = []

        try:
            from agents import Agent, Runner

            agent = Agent(
                name="generated_agent",
                instructions=self.system_prompt,
                model=self.model,
                handoffs=self.handoffs or None,
            )
            if self.guardrails.get("input"):
                agent.input_guardrails = self.guardrails["input"]
            if self.guardrails.get("output"):
                agent.output_guardrails = self.guardrails["output"]

            sdk_tools = []
            for name, fn in self.tools.items():
                sdk_tools.append(_wrap_sdk_tool(name, fn))
            agent.tools = sdk_tools or None

            result = await Runner.run(agent, history, max_turns=self.max_turns)
            text = result.final_output or ""
            history.append({"role": "assistant", "content": text})
            return RuntimeResult(
                text=text,
                tool_calls=tool_calls_log,
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except ImportError:
            logger.warning(
                "openai-agents not installed; using fallback ReAct loop (framework contract preserved)"
            )
            return await self._fallback_react(history, start, tool_calls_log)

    async def stream(self, messages: list, config: Optional[dict] = None) -> AsyncIterator[RuntimeEvent]:
        result = await self.run(messages, config)
        yield RuntimeEvent("agent_message", result.text)
        yield RuntimeEvent("done", {"usage": result.usage, "latency_ms": result.latency_ms})

    # ------------------------------------------------------------------
    # Fallback: framework-agnostic ReAct loop (same semantics as 'bare')
    # ------------------------------------------------------------------
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


def _wrap_sdk_tool(name: str, fn: Callable) -> Any:
    """Wrap a python callable into an SDK FunctionTool without importing
    at module scope (lazy import keeps the template importable anywhere)."""

    from agents import function_tool

    return function_tool(fn, name=name)


def build_single_agent_graph() -> OpenAIAgentsRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return OpenAIAgentsRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
