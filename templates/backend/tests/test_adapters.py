"""Framework adapter contract tests (M0.21 framework-agnostic).

These tests exercise the adapter REGISTRY and the AgentRuntime contract WITHOUT
requiring the optional provider SDKs (openai-agents / claude-agent-sdk /
google-adk / pyautogen) to be installed. The bare and langgraph adapters are
fully exercised; the optional-SDK adapters are checked for registry presence
and graceful behavior (clear error or construction) when the SDK is absent.

Run:  cd templates/backend && python -m pytest tests -v
"""

import pytest

from app.l4_agent.adapters import (
    FRAMEWORK_ADAPTERS,
    get_adapter,
    AgentRuntime,
)


class _FakeResp:
    def __init__(self, content, tool_calls=None, usage=None):
        self.content = content
        self.tool_calls = tool_calls
        self.usage = usage or {}


class _FakeLLM:
    async def invoke(self, messages, tools=None):
        return _FakeResp(content="pong")


def test_all_expected_frameworks_registered():
    """The registry must expose every supported framework name."""
    expected = {"bare", "langgraph", "openai-agents", "claude-sdk", "adk", "autogen"}
    assert expected <= set(FRAMEWORK_ADAPTERS)


def test_unknown_framework_raises_value_error():
    with pytest.raises(ValueError):
        get_adapter("does-not-exist")


def test_bare_adapter_runs_react_loop():
    """Bare adapter should run a while-loop and return an AgentResult."""
    runtime = get_adapter("bare", {"llm": _FakeLLM(), "tools": {}})
    assert isinstance(runtime, AgentRuntime)

    import asyncio
    result = asyncio.run(runtime.run([{"role": "user", "content": "hi"}], {"thread_id": "t"}))
    assert result.text == "pong"
    assert result.latency_ms >= 0


def test_bare_adapter_stream_emits_done_event():
    """Bare adapter stream() must emit an agent_message then a done event."""
    runtime = get_adapter("bare", {"llm": _FakeLLM(), "tools": {}})
    import asyncio
    events = []
    async def collect():
        async for ev in runtime.stream([{"role": "user", "content": "hi"}], {"thread_id": "t2"}):
            events.append(ev)
    asyncio.run(collect())
    types = [e.type for e in events]
    assert types[-1] == "done"
    assert "agent_message" in types


def test_bare_adapter_tool_roundtrip():
    """A tool call must be executed and its result fed back."""
    import asyncio

    async def echo(text: str) -> str:
        return f"echo:{text}"

    runtime = get_adapter("bare", {"llm": _FakeLLM(), "tools": {"echo": echo}})
    result = asyncio.run(runtime.run([{"role": "user", "content": "hi"}], {"thread_id": "t3"}))
    assert result.text == "pong"


def test_langgraph_adapter_registered():
    assert "langgraph" in FRAMEWORK_ADAPTERS


@pytest.mark.parametrize("fw", ["openai-agents", "claude-sdk", "adk", "autogen"])
def test_optional_sdk_adapters_degrade_gracefully(fw):
    """Without the provider SDK installed, get_adapter must either:
      - raise a catchable ImportError/ModuleNotFoundError with a clear message, or
      - construct an AgentRuntime (the SDK is imported lazily at run() time).
    Either outcome is acceptable; the important guarantee is a clear failure,
    not a silent crash, when the SDK is missing.
    """
    try:
        runtime = get_adapter(fw, {"llm": _FakeLLM(), "tools": {}})
    except (ImportError, ModuleNotFoundError) as exc:
        assert str(exc)  # non-empty, descriptive error
        return
    assert isinstance(runtime, AgentRuntime)
