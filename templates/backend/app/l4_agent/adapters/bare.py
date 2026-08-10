"""L4 - Bare framework adapter (framework='bare') — 零依赖 while-loop ReAct。

自研最小运行时: 不依赖任何 Agent 框架, 只有 LLMAdapter (L1) + ToolRegistry (L5)。
语义与其它适配器一致 (AgentRuntime 契约), 适合最小部署/离线调试/教学。
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, AsyncIterator, Optional

from ..agent_runtime import AgentRuntime, AgentResult, AgentEvent
from . import register

logger = logging.getLogger(__name__)


@register("bare")
class BareRuntime(AgentRuntime):
    """Zero-dependency while-loop ReAct agent.

    Loop semantics:
      1. LLM decide: 返回文本 (直接结束) 或 tool_calls
      2. 依次执行工具, 结果作为 tool 消息回填
      3. 重复直到 max_iterations 或出现最终答案
    """

    def __init__(
        self,
        llm: Any = None,
        tools: Optional[dict] = None,
        system_prompt: str = "You are a helpful assistant.",
        max_iterations: int = 10,
        model: str = "gpt-4o-mini",
    ):
        self.llm = llm
        self.tools = tools or {}
        self.system_prompt = system_prompt
        self.max_iterations = max_iterations
        self.model = model
        self._memory: dict[str, list] = {}
        self._hooks: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)

    def checkpoint(self, thread_id: str) -> "BareRuntime":
        self._memory.setdefault(thread_id, [])
        return self

    def hooks(self, **hooks: Any) -> None:
        self._hooks.update(hooks)

    async def _emit(self, hook: str, *args: Any) -> None:
        fn = self._hooks.get(hook)
        if fn is None:
            return
        result = fn(*args)
        if asyncio.iscoroutine(result):
            await result

    async def run(self, messages: list, config: Optional[dict] = None) -> AgentResult:
        """Execute the ReAct loop until a final answer or max iterations."""
        config = config or {}
        thread_id = config.get("thread_id", "default")
        max_iter = int(config.get("max_iterations", self.max_iterations))
        history = self._memory.setdefault(thread_id, [])
        history.extend(messages)
        start = time.perf_counter()
        tool_calls_log: list = []

        for _ in range(max_iter):
            await self._emit("on_llm_start", history)
            resp = await self.llm.invoke(history, tools=self._schemas() or None)
            if getattr(resp, "tool_calls", None):
                for tc in resp.tool_calls:
                    tool_calls_log.append(tc)
                    await self._emit("on_tool_start", tc)
                    name = tc.get("name")
                    fn = self.tools.get(name)
                    if fn is None:
                        result = f"Error: unknown tool {name}"
                    else:
                        try:
                            result = await fn(**tc.get("arguments", {}))
                        except Exception as e:  # noqa: BLE001
                            result = f"Tool error: {e}"
                    await self._emit("on_tool_end", name, result)
                    history.append(
                        {"role": "tool", "content": str(result), "tool_call_id": tc.get("id")}
                    )
                continue
            text = getattr(resp, "content", "") or ""
            history.append({"role": "assistant", "content": text})
            await self._emit("on_agent_end", text)
            return AgentResult(
                text=text,
                tool_calls=tool_calls_log,
                usage=getattr(resp, "usage", {}) or {},
                latency_ms=(time.perf_counter() - start) * 1000,
            )

        return AgentResult(
            text=f"Reached max_iterations ({max_iter}) without a final answer.",
            tool_calls=tool_calls_log,
            latency_ms=(time.perf_counter() - start) * 1000,
        )

    def _schemas(self) -> list:
        return [
            {"name": n, "description": getattr(t, "__doc__", "") or "", "parameters": {}}
            for n, t in self.tools.items()
        ]

    async def stream(self, messages: list, config: Optional[dict] = None) -> AsyncIterator[AgentEvent]:
        """Stream events from the ReAct loop (text 增量需要 LLM 流式支持)。"""
        if self.llm is not None and hasattr(self.llm, "stream"):
            history = self._memory.setdefault((config or {}).get("thread_id", "default"), [])
            history.extend(messages)
            async for chunk in self.llm.stream(history, tools=self._schemas() or None):
                yield AgentEvent("text", chunk)
            yield AgentEvent("done", None)
            return

        # 无流式 LLM: 退化为先跑完整 loop, 再按事件回放
        result = await self.run(messages, config)
        for tc in result.tool_calls:
            yield AgentEvent("tool_call", tc)
        yield AgentEvent("agent_message", result.text)
        yield AgentEvent("done", {"usage": result.usage, "latency_ms": result.latency_ms})


def build_single_agent_graph() -> BareRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return BareRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
