"""L10 - Monitoring & Metrics

Prometheus-compatible metrics collection (M13).
Tracks: request counts, latencies, error rates, LLM calls, token usage, tool calls, cost.

Exposed via the /api/metrics endpoint (M7.12).
"""

import time
import threading
from typing import Optional, Callable
from dataclasses import dataclass, field


@dataclass
class _Counter:
    """Thread-safe monotonic counter"""
    value: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def inc(self, amount: int = 1):
        with self._lock:
            self.value += amount

    def snapshot(self) -> int:
        with self._lock:
            return self.value


@dataclass
class _Histogram:
    """Thread-safe latency histogram with pre-defined buckets"""
    buckets: tuple = (0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0)
    _counts: dict = field(default_factory=dict)
    _sum: float = 0.0
    _total: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def __post_init__(self):
        self._counts = {b: 0 for b in self.buckets}

    def observe(self, value: float):
        with self._lock:
            self._sum += value
            self._total += 1
            for b in self.buckets:
                if value <= b:
                    self._counts[b] += 1

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "buckets": {str(b): c for b, c in self._counts.items()},
                "sum": self._sum,
                "count": self._total,
            }


class MetricsRegistry:
    """Global metrics registry.

    Usage:
        MetricsRegistry.request_total.inc()
        MetricsRegistry.request_latency.observe(elapsed)
    """

    # HTTP / API level
    request_total: _Counter = _Counter()
    request_latency: _Histogram = _Histogram()
    request_error_total: _Counter = _Counter()
    rate_limit_hits: _Counter = _Counter()

    # Agent level
    agent_runs_total: _Counter = _Counter()
    agent_run_latency: _Histogram = _Histogram()
    agent_errors_total: _Counter = _Counter()
    agent_steps_total: _Counter = _Counter()

    # LLM level
    llm_calls_total: _Counter = _Counter()
    llm_tokens_total: _Counter = _Counter()
    llm_prompt_tokens_total: _Counter = _Counter()
    llm_completion_tokens_total: _Counter = _Counter()
    llm_latency: _Histogram = _Histogram()
    llm_errors_total: _Counter = _Counter()

    # Tool level
    tool_calls_total: _Counter = _Counter()
    tool_errors_total: _Counter = _Counter()
    tool_latency: _Histogram = _Histogram()

    # Memory level
    memory_retrievals_total: _Counter = _Counter()
    memory_writes_total: _Counter = _Counter()

    # Cost tracking (USD estimated)
    cost_total_usd: _Counter = _Counter()

    # ── helpers ────────────────────────────────────────────────

    @classmethod
    def track_llm_call(
        cls,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        latency: Optional[float] = None,
        error: bool = False,
        cost_usd: float = 0.0,
    ):
        """Record one LLM call (M1.12 cost tracking + M13.7)"""
        cls.llm_calls_total.inc()
        cls.llm_prompt_tokens_total.inc(prompt_tokens)
        cls.llm_completion_tokens_total.inc(completion_tokens)
        cls.llm_tokens_total.inc(prompt_tokens + completion_tokens)
        if latency is not None:
            cls.llm_latency.observe(latency)
        if error:
            cls.llm_errors_total.inc()
        if cost_usd > 0:
            cls.cost_total_usd.inc(round(cost_usd, 6))

    @classmethod
    def track_tool_call(cls, latency: Optional[float] = None, error: bool = False):
        """Record one tool call (M13.4)"""
        cls.tool_calls_total.inc()
        if latency is not None:
            cls.tool_latency.observe(latency)
        if error:
            cls.tool_errors_total.inc()

    # ── Prometheus text format export (M7.12) ─────────────────

    @classmethod
    def export_prometheus(cls) -> str:
        """Export all metrics in Prometheus text exposition format"""
        lines: list[str] = []

        def emit_counter(name: str, counter: _Counter, help_text: str):
            lines.append(f"# HELP {name} {help_text}")
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name} {counter.snapshot()}")

        def emit_histogram(name: str, hist: _Histogram, help_text: str):
            snap = hist.snapshot()
            lines.append(f"# HELP {name} {help_text}")
            lines.append(f"# TYPE {name} histogram")
            for bucket, count in snap["buckets"].items():
                lines.append(f'{name}_bucket{{le="{bucket}"}} {count}')
            lines.append(f"{name}_bucket{{le=\"+Inf\"}} {snap['count']}")
            lines.append(f"{name}_sum {snap['sum']}")
            lines.append(f"{name}_count {snap['count']}")

        emit_counter("agent_request_total", cls.request_total, "Total HTTP requests")
        emit_counter("agent_request_error_total", cls.request_error_total, "Total HTTP errors")
        emit_counter("agent_rate_limit_hits", cls.rate_limit_hits, "Rate limit rejections")
        emit_counter("agent_runs_total", cls.agent_runs_total, "Total agent runs")
        emit_counter("agent_errors_total", cls.agent_errors_total, "Total agent errors")
        emit_counter("agent_steps_total", cls.agent_steps_total, "Total agent steps")
        emit_counter("llm_calls_total", cls.llm_calls_total, "Total LLM calls")
        emit_counter("llm_tokens_total", cls.llm_tokens_total, "Total LLM tokens")
        emit_counter("llm_prompt_tokens_total", cls.llm_prompt_tokens_total, "Prompt tokens")
        emit_counter("llm_completion_tokens_total", cls.llm_completion_tokens_total, "Completion tokens")
        emit_counter("llm_errors_total", cls.llm_errors_total, "LLM errors")
        emit_counter("tool_calls_total", cls.tool_calls_total, "Total tool calls")
        emit_counter("tool_errors_total", cls.tool_errors_total, "Tool errors")
        emit_counter("memory_retrievals_total", cls.memory_retrievals_total, "Memory retrievals")
        emit_counter("memory_writes_total", cls.memory_writes_total, "Memory writes")
        emit_counter("agent_cost_total_usd", cls.cost_total_usd, "Estimated cost in USD")

        emit_histogram("agent_request_latency_seconds", cls.request_latency, "HTTP request latency")
        emit_histogram("agent_run_latency_seconds", cls.agent_run_latency, "Agent run latency")
        emit_histogram("llm_latency_seconds", cls.llm_latency, "LLM call latency")
        emit_histogram("tool_latency_seconds", cls.tool_latency, "Tool call latency")

        return "\n".join(lines) + "\n"


# Global instance
metrics = MetricsRegistry


# ── Timing decorator ────────────────────────────────────────────

class Timer:
    """Simple context manager for measuring elapsed time"""

    def __enter__(self) -> "Timer":
        self.start = time.perf_counter()
        return self

    def __exit__(self, *exc) -> None:
        self.elapsed = time.perf_counter() - self.start


def timed(metric: str = "custom") -> Callable:
    """Decorator that records function latency into a histogram"""
    _hist = _Histogram()

    def decorator(fn: Callable):
        def wrapper(*args, **kwargs):
            t0 = time.perf_counter()
            try:
                return fn(*args, **kwargs)
            finally:
                _hist.observe(time.perf_counter() - t0)
        return wrapper
    return decorator
