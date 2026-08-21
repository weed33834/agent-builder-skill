"""L4 - AutoGen / AG2 adapter (framework='autogen')

Implements the AgentRuntime contract on top of AutoGen (pyautogen) /
AG2 (ag2). Highlights:

  - ConversableAgent + AssistantAgent + UserProxyAgent (group chat)
  - GroupChat + GroupChatManager for multi-agent discussion
  - tool/function registration via register_for_llm / register_for_execution
  - lazy imports: module stays importable without pyautogen installed
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


@register("autogen")
class AutoGenRuntime(AgentRuntime):
    """AgentRuntime backed by AutoGen / AG2."""

    def __init__(
        self,
        llm: Any,
        tools: Optional[dict] = None,
        system_prompt: str = "You are a helpful assistant.",
        model: str = "gpt-4o-mini",
        max_rounds: int = 10,
        agents: Optional[list] = None,
        group_chat: bool = False,
    ):
        self.llm = llm
        self.tools = tools or {}
        self.system_prompt = system_prompt
        self.model = model
        self.max_rounds = max_rounds
        self.agents = agents or []
        self.group_chat = group_chat
        self._memory: dict[str, list] = {}

    # ------------------------------------------------------------------
    # AgentRuntime contract
    # ------------------------------------------------------------------
    def bind_tools(self, tools: dict) -> None:
        self.tools.update(tools)

    def checkpoint(self, thread_id: str) -> "AutoGenRuntime":
        self._memory.setdefault(thread_id, [])
        return self

    async def run(self, messages: list, config: Optional[dict] = None) -> RuntimeResult:
        thread_id = (config or {}).get("thread_id", "default")
        history = self._memory.setdefault(thread_id, [])
        history.extend(messages)
        start = time.perf_counter()
        tool_calls_log: list = []
        query = messages[-1].get("content", "") if messages else ""

        try:
            from autogen import (
                AssistantAgent,
                ConversableAgent,
                GroupChat,
                GroupChatManager,
                UserProxyAgent,
                config_list_from_json,
            )

            # Build a minimal OpenAI-style config from our L1 adapter
            model_info = self.llm.get_model_info() if hasattr(self.llm, "get_model_info") else {}
            base_url = model_info.get("base_url") or "https://api.openai.com/v1"
            api_key = model_info.get("api_key") or "EMPTY"
            llm_config = {
                "config_list": [{"model": self.model, "api_key": api_key, "base_url": base_url}],
                "temperature": 0.2,
            }

            if not self.group_chat:
                assistant = AssistantAgent(
                    name="assistant",
                    system_message=self.system_prompt,
                    llm_config=llm_config,
                )
                user_proxy = UserProxyAgent(
                    name="user_proxy",
                    human_input_mode="NEVER",
                    max_consecutive_auto_reply=self.max_rounds,
                    code_execution_config=False,
                )

                # register tools
                for name, fn in self.tools.items():
                    try:
                        assistant.register_for_llm(name=name, description=getattr(fn, "__doc__", "") or "")(
                            fn
                        )
                        user_proxy.register_for_execution(name=name)(fn)
                    except Exception as e:  # noqa: BLE001
                        logger.warning("tool registration skipped for %s: %s", name, e)

                await asyncio.to_thread(
                    user_proxy.initiate_chat, assistant, message=query
                )
                text = str(assistant.last_message() or {}).strip()
            else:
                # Multi-agent group chat (M7.4)
                agents = [
                    AssistantAgent(
                        name=a.get("name", f"agent_{i}"),
                        system_message=a.get("system_message", self.system_prompt),
                        llm_config=llm_config,
                    )
                    for i, a in enumerate(self.agents)
                ]
                group_chat = GroupChat(agents=agents, messages=[], max_round=self.max_rounds)
                manager = GroupChatManager(groupchat=group_chat, llm_config=llm_config)
                await asyncio.to_thread(
                    agents[0].initiate_chat, manager, message=query
                )
                text = str(agents[-1].last_message() or {}).strip()

            history.append({"role": "assistant", "content": text})
            return RuntimeResult(
                text=text,
                tool_calls=tool_calls_log,
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        except ImportError:
            logger.warning(
                "pyautogen not installed; using fallback ReAct loop (framework contract preserved)"
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
        for _ in range(self.max_rounds):
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
            text="Reached max_rounds without a final answer.",
            tool_calls=tool_calls_log,
            latency_ms=(time.perf_counter() - start) * 1000,
        )


def build_single_agent_graph() -> AutoGenRuntime:
    """Compatibility factory (same name as LangGraph variant)."""
    from app.l1_llm.factory import create_llm
    from app.l5_tools.registry import get_registry

    llm = create_llm()
    registry = get_registry()
    return AutoGenRuntime(
        llm=llm,
        tools={t.name: t.func for t in registry.list_tools()},
    )
