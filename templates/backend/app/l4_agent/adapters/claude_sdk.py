"""L4 - Claude Agent SDK adapter (framework='claude-sdk')

Implements the AgentRuntime contract on top of the Anthropic Claude Agent
SDK (successor of the Claude Code SDK, 2026).

Highlights wired here:
  - tools via @tool decorator / Tool collections
  - subagents (Agent.from_agent) for hierarchical decomposition
  - lifecycle hooks (on_tool_use_start / on_tool_use_end / on_update)
  - output schemas for structured extraction
  - lazy imports: the module stays importable without the SDK installed
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


@register("claude-sdk")
class ClaudeSDKRuntime(AgentRuntime):
    """AgentRuntime backed by the Claude Agent SDK."""

    def __init__(
        self,
        llm: Any,
        tools: Optional[dict] = None,
        system_prompt: str = "You are a helpful assistant.",
        model: str = "claude-sonnet-4-5",
        max_turns: int = 10,
        subagents: Optional[dict] = None,
        hooks: Optional[dict] = None,
        output_schema: Optional[dict] = None,
    ):
        self.llm = llm
        self.tools = tools or {}
        self.system_prompt = system_prompt
        self.model = model
        self.max_turns = max_turns
        self.subagents = subagents or {}
        self.hooks = hooks or {}
        self.output_schema = output_schema
        self._memory: dict[str, list] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)

    def checkpoint(self, thread_id: str) -> "ClaudeSDKRuntime":
        self._memory.setdefault(thread_id, [])
        return self

    async def run(self, messages: list, config: Optional[dict] = None) -> RuntimeResult:
        thread_id = (config or {}).get("thread_id", "default")
        history = self._memory.setdefault(thread_id, [])
        history.extend(messages)
        start = time.perf_counter()
        tool_calls_log: list = []

        try:
            from claude_agent_sdk import Agent, Tool, ToolCollection

            tools = ToolCollection()
            for name, fn in self.tools.items():
                tools.add(_wrap_claude_tool(name, fn))
            if not tools.tools:
                tools = None

            agent = Agent(
                name="generated_agent",
                instructions=self.system_prompt,
                model=self.model,
                tools=tools,
                max_turns=self.max_turns,
            )

            # subagents: hierarchical decomposition
            for name, sub in self.subagents.items():
                sub_agent = Agent.from_agent(agent, name=name, instructions=sub.get("instructions"))
                sub_agent.parent = agent

            # lifecycle hooks
            for event, fn in self.hooks.items():
                agent.add_hook(event, fn)

            if self.output_schema:
                agent.output_schema = self.output_schema

            result = await agent.run(history)
            text = result.output_text or ""
            history.append({"role": "assistant", "content": text})
            return RuntimeResult(
                text=text,
                tool_calls=tool_calls_log,
                usage=getattr(result, "usage", {}) or {},
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except ImportError:
            logger.warning(
                "claude_agent_sdk not installed; using fallback ReAct loop (framework contract preserved)"
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


def _wrap_claude_tool(name: str, fn: Callable) -> Any:
    """Lazy wrapper to the SDK Tool decorator."""

    from claude_agent_sdk import tool

    return tool(fn, name=name)


def build_single_agent_graph() -> ClaudeSDKRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return ClaudeSDKRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
