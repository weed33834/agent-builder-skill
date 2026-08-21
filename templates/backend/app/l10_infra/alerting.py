"""M13 - Alerting (告警)

与 monitoring.py 配合：监控指标 → 告警规则 → 通知渠道（日志/webhook/邮件占位）。
对齐生产规范：规则可配置、去抖（cooldown）、静默期、手动触发。
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

Notifier = Callable[[str, dict], Awaitable]


@dataclass
class AlertRule:
    """A threshold rule over a named metric"""

    name: str
    metric: str
    operator: str = ">"  # >, <, >=, <=, ==
    threshold: float = 0.0
    cooldown_seconds: float = 300.0
    severity: str = "warning"  # info | warning | critical
    message: str = ""
    _last_fired: float = 0.0

    def evaluate(self, value: float) -> bool:
        ops = {
            ">": lambda v, t: v > t,
            "<": lambda v, t: v < t,
            ">=": lambda v, t: v >= t,
            "<=": lambda v, t: v <= t,
            "==": lambda v, t: v == t,
        }
        return ops[self.operator](value, self.threshold)

    def can_fire(self, now: float) -> bool:
        return now - self._last_fired >= self.cooldown_seconds


class AlertManager:
    """Evaluates rules against metric snapshots and dispatches notifications"""

    def __init__(self, notifiers: Optional[list[Notifier]] = None):
        self.rules: list[AlertRule] = []
        self.notifiers: list[Notifier] = list(notifiers or [])
        self.fired: list[dict] = []

    def add_rule(self, rule: AlertRule) -> AlertRule:
        self.rules.append(rule)
        return rule

    def add_notifier(self, fn: Notifier) -> None:
        self.notifiers.append(fn)

    async def evaluate(self, metrics: dict[str, float]) -> list[dict]:
        """Check all rules against a metric snapshot; fire + notify on breach"""
        now = time.time()
        triggered: list[dict] = []
        for rule in self.rules:
            value = metrics.get(rule.metric)
            if value is None:
                continue
            if rule.evaluate(value) and rule.can_fire(now):
                rule._last_fired = now
                event = {
                    "rule": rule.name,
                    "metric": rule.metric,
                    "value": value,
                    "threshold": rule.threshold,
                    "severity": rule.severity,
                    "time": now,
                    "message": rule.message or f"{rule.metric} {rule.operator} {rule.threshold} (got {value})",
                }
                self.fired.append(event)
                triggered.append(event)
                for notifier in self.notifiers:
                    try:
                        await notifier(rule.severity, event)
                    except Exception as exc:  # noqa: BLE001
                        logger.error("Notifier failed: %s", exc)
        return triggered

    def history(self, limit: int = 50) -> list[dict]:
        return self.fired[-limit:]


async def webhook_notifier(url: str) -> Notifier:
    """Factory: notifier that POSTs JSON to a webhook URL"""

    async def _notify(severity: str, event: dict) -> None:
        try:
            import httpx

            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(url, json={"severity": severity, "event": event})
        except ImportError:
            logger.warning("httpx unavailable; cannot POST alert to %s", url)

    return _notify


def logging_notifier(severity: str, event: dict) -> Awaitable:
    """Notifier that writes to the log (works as a plain callable too)"""

    async def _run() -> None:
        level = {"critical": 50, "warning": 30, "info": 20}.get(severity, 30)
        logger.log(level, "[ALERT %s] %s", severity.upper(), event["message"])

    return _run()
