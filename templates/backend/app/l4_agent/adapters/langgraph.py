"""L4 - LangGraph adapter (framework='langgraph') — 默认参考实现。

包装现有 l4_agent/graph.py 的 StateGraph (LangGraph 1.0 新 API:
add_edge(START) / Command / create_react_agent)。其它层通过
AgentRuntime 契约使用, 不直接依赖 LangGraph。
"""
from __future__ import annotations

import logging
import time
from typing import Any, AsyncIterator, Optional

from ..agent_runtime import AgentRuntime, AgentResult, AgentEvent
from . import register

logger = logging.getLogger(__name__)


@register("langgraph")
class LangGraphRuntime(AgentRuntime):
    """LangGraph 1.0 StateGraph wrapper (默认参考实现)。

    graph 通过 graph_type 选择:
      - 'single'   -> build_single_agent_graph()   (单智能体 ReAct)
      - 'react'    -> build_react_agent_graph()    (create_react_agent)
      - 'supervisor'-> build_supervisor_graph()    (监督者模式)
    """

    def __init__(
        self,
        llm: Any = None,
        tools: Optional[dict] = None,
        graph_type: str = "single",
        system_prompt: str = "You are a helpful assistant.",
        model: str = "gpt-4o-mini",
    ):
        self.llm = llm
        self.tools = tools or {}
        self.graph_type = graph_type
        self.system_prompt = system_prompt
        self.model = model
        self._graph = None
        self._hooks: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)
        self._graph = None  # force rebuild

    def checkpoint(self, thread_id: str) -> "LangGraphRuntime":
        # LangGraph 的 checkpointer 在 compile 时注入 (见 graph.py MemorySaver),
        # thread_id 通过 config['configurable']['thread_id'] 传入 run/stream。
        return self

    def hooks(self, **hooks: Any) -> None:
        self._hooks.update(hooks)

    def _ensure_graph(self):
        if self._graph is None:
            from ..graph import (
                build_single_agent_graph,
                build_react_agent_graph,
                build_supervisor_graph,
            )

            builder = {
                "single": build_single_agent_graph,
                "react": build_react_agent_graph,
                "supervisor": build_supervisor_graph,
            }.get(self.graph_type, build_single_agent_graph)()
            self._graph = builder.compile() if hasattr(builder, "compile") else builder
        return self._graph

    def _config(self, config: Optional[dict]) -> dict:
        thread_id = (config or {}).get("thread_id", "default")
        return {"configurable": {"thread_id": thread_id}}

    async def run(self, messages: list, config: Optional[dict] = None) -> AgentResult:
        graph = self._ensure_graph()
        start = time.perf_counter()
        inputs = {"messages": messages}
        if self.tools:
            inputs["tools"] = list(self.tools.values())
        result = await graph.ainvoke(inputs, config=self._config(config))
        last = result.get("messages", [])[-1] if result.get("messages") else None
        text = last.content if last is not None else str(result)
        return AgentResult(
            text=text,
            raw=result,
            latency_ms=(time.perf_counter() - start) * 1000,
        )

    async def stream(self, messages: list, config: Optional[dict] = None) -> AsyncIterator[AgentEvent]:
        graph = self._ensure_graph()
        inputs = {"messages": messages}
        if self.tools:
            inputs["tools"] = list(self.tools.values())
        if hasattr(graph, "astream_events"):
            async for event in graph.astream_events(inputs, config=self._config(config), version="v2"):
                kind = event.get("event")
                if kind == "on_chat_model_stream":
                    for chunk in event.get("data", {}).get("chunk", []):
                        content = getattr(chunk, "content", "")
                        if content:
                            yield AgentEvent("text", content)
                elif kind == "on_tool_start":
                    yield AgentEvent("tool_call", event.get("name"))
        else:
            async for chunk in graph.astream(inputs, config=self._config(config)):
                last = chunk.get("messages", [])[-1] if chunk.get("messages") else None
                if last is not None and getattr(last, "content", ""):
                    yield AgentEvent("text", last.content)
        yield AgentEvent("done", None)


def build_single_agent_graph() -> LangGraphRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return LangGraphRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
