"""L4 - AgentRuntime 抽象契约 (框架中立, M0.21)

上层 (L7 orchestrator / L8 API / L9 UI) 只依赖本模块定义的接口,
不关心底层跑的是哪个 Agent 框架。各框架适配器实现此契约:

  bare          -> 零依赖 while-loop ReAct (自研最小运行时)
  langgraph     -> LangGraph 1.0 StateGraph (默认参考实现, l4_agent/graph.py)
  openai-agents -> OpenAI Agents SDK (Agent + Handoffs + Guardrails)
  claude-sdk    -> Claude Agent SDK (Agent Loop + Subagent + hooks)
  adk           -> Google ADK (LlmAgent + RemoteA2AAgent)
  autogen       -> AutoGen/AG2 GroupChat 多智能体

五接口: run / stream / bind_tools / checkpoint / hooks
选型文档: docs/framework-selection.md §2
"""
from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Optional


# ---------------------------------------------------------------------------
# 统一数据形状 (与 L8 API / 前端 SSE 事件解耦)
# ---------------------------------------------------------------------------
@dataclass
class AgentEvent:
    """流式事件 (与路由/前端解耦)。

    type: 'text' | 'tool_call' | 'tool_result' | 'agent_message' | 'done' | 'error'
    """

    type: str
    content: Any = None
    timestamp: float = field(default_factory=time.time)


@dataclass
class AgentResult:
    """Agent 单次运行结果。"""

    text: str
    tool_calls: list = field(default_factory=list)
    usage: dict = field(default_factory=dict)
    latency_ms: float = 0.0
    trace_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    raw: Any = None


# 兼容别名: 早期适配器使用 RuntimeEvent/RuntimeResult 命名, 保留以平滑迁移
RuntimeEvent = AgentEvent
RuntimeResult = AgentResult


class AgentRuntime(ABC):
    """框架中立运行时接口 — 所有适配器的统一契约。"""

    @abstractmethod
    async def run(self, messages: list, config: Optional[dict] = None) -> AgentResult:
        """单次运行: 输入消息列表, 返回最终结果。"""

    @abstractmethod
    def stream(self, messages: list, config: Optional[dict] = None) -> AsyncIterator[AgentEvent]:
        """流式运行: 逐事件产出 (文本增量/工具调用/结束)。"""

    @abstractmethod
    def bind_tools(self, tools: dict) -> None:
        """绑定工具 {name: callable}。"""

    @abstractmethod
    def checkpoint(self, thread_id: str) -> Any:
        """恢复/创建会话检查点 (LangGraph checkpointer / 内存字典 / SDK thread)。"""

    def hooks(self, **hooks: Any) -> None:
        """可选钩子: on_llm_start / on_tool_start / on_tool_end / on_agent_end。"""

    # ------------------------------------------------------------------
    # 工厂: 从 config 创建对应框架的 runtime
    # ------------------------------------------------------------------
    @classmethod
    def from_config(cls, config: dict) -> "AgentRuntime":
        framework = config.get("framework") or (
            config.get("agent_framework") or {}
        ).get("name", "langgraph")
        from .adapters import get_adapter

        return get_adapter(framework, config)
