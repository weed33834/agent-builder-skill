"""L4 - Framework adapters registry (M0.21 框架中立架构)

Maps framework name -> adapter class implementing AgentRuntime.
上层通过 AgentRuntime.from_config(config) 或 get_adapter(name, config) 获取运行时,
与具体框架解耦。参见 docs/framework-selection.md §2.1。

可用框架:
  bare          -> 零依赖 while-loop ReAct (自研最小运行时)
  langgraph     -> LangGraph 1.0 StateGraph (默认参考实现)
  openai-agents -> OpenAI Agents SDK (Agent + Handoffs + Guardrails)
  claude-sdk    -> Claude Agent SDK (Agent Loop + Subagent + hooks)
  adk           -> Google ADK (LlmAgent + RemoteA2AAgent)
  autogen       -> AutoGen/AG2 GroupChat 多智能体
"""
from __future__ import annotations

from typing import Optional

from ..agent_runtime import AgentRuntime, AgentResult, AgentEvent

FRAMEWORK_ADAPTERS: dict[str, type] = {}


def register(name: str):
    """Class decorator: register an adapter class under a framework name."""

    def deco(cls):
        FRAMEWORK_ADAPTERS[name] = cls
        return cls

    return deco


def get_adapter(framework: str, config: Optional[dict] = None) -> AgentRuntime:
    """Get an AgentRuntime instance for the given framework name.

    config 支持两种形态:
      - 直接传框架参数 dict (llm/tools/graph_type/model/...)
      - 完整生成配置 dict (framework / agent_framework / llm / tools ...)
    """
    if framework not in FRAMEWORK_ADAPTERS:
        raise ValueError(
            f"Unknown framework: {framework!r}. Available: {sorted(FRAMEWORK_ADAPTERS)}"
        )
    cfg = config or {}

    # 从完整生成配置中提取框架相关字段
    agent_cfg = cfg.get("agent_framework") if isinstance(cfg.get("agent_framework"), dict) else {}
    llm_cfg = cfg.get("llm") if isinstance(cfg.get("llm"), dict) else {}
    runtime_kwargs: dict = {}
    if "llm" in cfg and not isinstance(cfg.get("llm"), dict):
        # 直接传了 LLM 实例
        runtime_kwargs.setdefault("llm", cfg["llm"])
    elif "instance" in llm_cfg:
        runtime_kwargs.setdefault("llm", llm_cfg["instance"])
    runtime_kwargs.setdefault("model", agent_cfg.get("model") or llm_cfg.get("model", "gpt-4o-mini"))
    runtime_kwargs.setdefault("graph_type", agent_cfg.get("graph_type", "single"))
    runtime_kwargs.setdefault("max_iterations", agent_cfg.get("max_iterations", 10))
    runtime_kwargs.setdefault("system_prompt", cfg.get("system_prompt", "You are a helpful assistant."))
    tools = cfg.get("tools") if isinstance(cfg.get("tools"), dict) else None
    if tools:
        runtime_kwargs.setdefault("tools", tools)

    # 按适配器实际签名过滤参数 (不同框架构造函数不同)
    import inspect

    cls = FRAMEWORK_ADAPTERS[framework]
    sig = inspect.signature(cls.__init__)
    known = set(sig.parameters) - {"self", "kwargs"}
    accepted = {k: v for k, v in runtime_kwargs.items() if k in known}
    return cls(**accepted)


# Import adapters so they register themselves
from . import bare, langgraph, openai_agents, claude_sdk, adk, autogen  # noqa: E402,F401

__all__ = [
    "AgentRuntime",
    "AgentResult",
    "AgentEvent",
    "FRAMEWORK_ADAPTERS",
    "register",
    "get_adapter",
    "bare",
    "langgraph",
    "openai_agents",
    "claude_sdk",
    "adk",
    "autogen",
]
