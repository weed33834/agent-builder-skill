"""L10 - Circuit Breaker (deep-spec 25-performance-engineering E.3)

Real circuit breaker with trip / half-open probe / reset semantics:
  - Trips to OPEN after N consecutive failures within a window
  - Half-open allows a probe request to verify recovery
  - On success transitions to CLOSED; on failure back to OPEN
Persists state in-memory (per process); configurable via thresholds.
"""

from __future__ import annotations

import time
from threading import Lock
from typing import Optional


class CircuitBreaker:
    """Per-key circuit breaker (keyed by provider/model/dependency name)."""

    def __init__(
        self,
        failure_threshold: int = 5,
        window_seconds: float = 30.0,
        cooldown_seconds: float = 10.0,
        success_threshold: int = 1,
    ):
        self.failure_threshold = failure_threshold
        self.window_seconds = window_seconds
        self.cooldown_seconds = cooldown_seconds
        self.success_threshold = success_threshold
        self._state = "CLOSED"
        self._failures = 0
        self._window_start = time.monotonic()
        self._opened_at = 0.0
        self._successes = 0
        self._lock = Lock()

    def allow_request(self) -> bool:
        with self._lock:
            now = time.monotonic()
            if self._state == "CLOSED":
                # 窗口过期则重置失败计数
                if now - self._window_start > self.window_seconds:
                    self._failures = 0
                    self._window_start = now
                return True
            if self._state == "OPEN":
                if now - self._opened_at >= self.cooldown_seconds:
                    self._state = "HALF_OPEN"
                    self._successes = 0
                    return True  # 探针请求
                return False
            # HALF_OPEN：只允许探针
            return self._successes < self.success_threshold

    def record_success(self) -> None:
        with self._lock:
            if self._state == "HALF_OPEN":
                self._successes += 1
                if self._successes >= self.success_threshold:
                    self._state = "CLOSED"
                    self._failures = 0
                    self._window_start = time.monotonic()
            elif self._state == "CLOSED":
                self._failures = 0
                self._window_start = time.monotonic()

    def record_failure(self) -> None:
        with self._lock:
            now = time.monotonic()
            if self._state in ("HALF_OPEN", "CLOSED"):
                self._failures += 1
                self._window_start = now
                if self._failures >= self.failure_threshold:
                    self._state = "OPEN"
                    self._opened_at = now
            # OPEN 状态下失败保持 OPEN

    @property
    def state(self) -> str:
        with self._lock:
            return self._state

    def reset(self) -> None:
        with self._lock:
            self._state = "CLOSED"
            self._failures = 0
            self._successes = 0

    def status(self) -> dict:
        return {
            "key": getattr(self, "name", "unknown"),
            "state": self.state,
            "failures": self._failures,
            "failure_threshold": self.failure_threshold,
            "window_seconds": self.window_seconds,
        }


class CircuitBreakerRegistry:
    """管理一组以名称区分的熔断器。"""

    def __init__(self):
        self._breakers: dict[str, CircuitBreaker] = {}
        self._lock = Lock()

    def get(self, name: str) -> CircuitBreaker:
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker()
                self._breakers[name].name = name
            return self._breakers[name]

    def list(self) -> list[dict]:
        with self._lock:
            return [b.status() for b in self._breakers.values()]

    def reset_all(self) -> None:
        with self._lock:
            for b in self._breakers.values():
                b.reset()


_registry = CircuitBreakerRegistry()


def get_circuit_breakers() -> CircuitBreakerRegistry:
    return _registry
