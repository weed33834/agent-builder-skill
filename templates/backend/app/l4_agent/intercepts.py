"""L4 - Intercepts & Lifecycle Hooks

Agent lifecycle hooks (M3.16), mirroring Claude Agent SDK hooks:
on_start / on_message / on_tool_call / on_tool_result / on_error / on_end.

Hooks are registered globally and fired by nodes.py during graph execution.
Enables: logging (M13.1), metrics (M13), tracing (M13.2), HITL gates (M3.11).
"""

import time
import inspect
from typing import Any, Awaitable, Callable, Optional

from ..l10_infra.monitoring import metrics


HookFn = Callable[..., Any]
AsyncHookFn = Callable[..., Awaitable[Any]]


class AgentIntercepts:
    """Registry of agent lifecycle hooks.

    Usage:
        intercepts = AgentIntercepts()

        @intercepts.on("tool_call")
        async def log_tool(name, arguments):
            logger.info(f"tool: {name}")

        # Or sync:
        @intercepts.on("tool_call")
        def log_tool(name, arguments): ...
    """

    def __init__(self):
        self._hooks: dict[str, list[HookFn]] = {
            "start": [],
            "message": [],
            "tool_call": [],
            "tool_result": [],
            "llm_call": [],
            "error": [],
            "end": [],
        }

    # ── registration ───────────────────────────────────────────

    def on(self, event: str) -> Callable[[HookFn], HookFn]:
        """Decorator: register a hook for an event.

        Events: start, message, tool_call, tool_result, llm_call, error, end
        """
        if event not in self._hooks:
            raise ValueError(f"Unknown event: {event}. Available: {list(self._hooks)}")

        def decorator(fn: HookFn) -> HookFn:
            self._hooks[event].append(fn)
            return fn
        return decorator

    def register(self, event: str, fn: HookFn):
        """Programmatic registration"""
        if event not in self._hooks:
            raise ValueError(f"Unknown event: {event}")
        self._hooks[event].append(fn)

    def clear(self, event: Optional[str] = None):
        if event:
            self._hooks[event] = []
        else:
            for k in self._hooks:
                self._hooks[k] = []

    # ── firing ─────────────────────────────────────────────────

    async def fire(self, event: str, *args, **kwargs) -> None:
        """Fire all hooks for an event (async-aware)"""
        for hook in self._hooks[event]:
            try:
                result = hook(*args, **kwargs)
                if inspect.isawaitable(result):
                    await result
            except Exception:
                # Hooks must never break the agent loop (best-effort)
                metrics.agent_errors_total.inc()
                continue

    # ── convenience wrappers (used by nodes.py) ────────────────

    async def on_agent_start(self, state: dict):
        metrics.agent_runs_total.inc()
        await self.fire("start", state=state)

    async def on_agent_message(self, message: Any):
        await self.fire("message", message=message)

    async def on_tool_call(self, name: str, arguments: dict):
        metrics.tool_calls_total.inc()
        await self.fire("tool_call", name=name, arguments=arguments)

    async def on_tool_result(self, name: str, result: Any, error: bool = False):
        if error:
            metrics.tool_errors_total.inc()
        await self.fire("tool_result", name=name, result=result, error=error)

    async def on_llm_call(self, prompt_tokens: int = 0, completion_tokens: int = 0,
                          latency: Optional[float] = None, error: bool = False):
        metrics.track_llm_call(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency=latency,
            error=error,
        )
        await self.fire("llm_call", prompt_tokens=prompt_tokens,
                        completion_tokens=completion_tokens, latency=latency, error=error)

    async def on_error(self, error: Exception):
        metrics.agent_errors_total.inc()
        await self.fire("error", error=error)

    async def on_agent_end(self, state: dict):
        await self.fire("end", state=state)


# Global instance used across the app
intercepts = AgentIntercepts()


class Timer:
    """Elapsed-time context manager for hook latency tracking"""

    def __enter__(self) -> "Timer":
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc) -> None:
        self.elapsed = time.perf_counter() - self.start
