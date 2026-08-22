"""M12 - Scheduled Tasks (定时任务)

基于 asyncio 的轻量调度器，支持 cron 表达式与间隔任务。
设计对齐生产要求：任务注册 → 调度执行 → 失败重试 → 结果钩子。
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

logger = logging.getLogger(__name__)

JobCallback = Callable[..., Awaitable]


def parse_cron(expr: str) -> tuple[set, set, set, set, set]:
    """Parse a 5-field cron expression (min hour dom month dow).

    Supports: * , - / numbers (subset of standard cron).
    Values outside each field's range and zero steps ("*/0") are REJECTED at
    parse time — previously "*/0" crashed range() inside the scheduler loop
    and silently killed every scheduled job.
    Returns (minutes, hours, days, months, weekdays) as sets.
    """
    fields = expr.split()
    if len(fields) != 5:
        raise ValueError(f"Invalid cron expression: {expr!r} (need 5 fields)")

    ranges = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 6)]

    def _expand(field: str, lo: int, hi: int) -> set:
        result: set = set()
        for part in field.split(","):
            if part == "*":
                result.update(range(lo, hi + 1))
                continue
            if "/" in part:
                base, step = part.split("/")
                step_i = int(step)
                if step_i <= 0:
                    raise ValueError(f"Invalid cron step in {field!r}: step must be >= 1")
                start = lo if base in ("*", "") else int(base)
                result.update(range(start, hi + 1, step_i))
                continue
            if "-" in part:
                a, b = part.split("-")
                ai, bi = int(a), int(b)
                if ai > bi:
                    raise ValueError(f"Invalid cron range in {field!r}: {a}-{b}")
                result.update(range(ai, bi + 1))
                continue
            value = int(part)
            if not lo <= value <= hi:
                raise ValueError(f"Cron value out of range in {field!r}: {value} (allowed {lo}-{hi})")
            result.add(value)
        if not result:
            raise ValueError(f"Cron field {field!r} expanded to nothing")
        return result

    return tuple(_expand(f, lo, hi) for f, (lo, hi) in zip(fields, ranges))  # type: ignore


def cron_matches(parsed: tuple, t: time.struct_time) -> bool:
    minutes, hours, days, months, weekdays = parsed
    if t.tm_min not in minutes or t.tm_hour not in hours:
        return False
    if t.tm_mday not in days or t.tm_mon not in months:
        return False
    if t.tm_wday not in weekdays:
        return False
    return True


@dataclass
class ScheduledJob:
    """A registered scheduled task"""

    name: str
    callback: JobCallback
    cron: Optional[str] = None
    interval_seconds: Optional[float] = None
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    max_retries: int = 3
    last_run: float = 0.0
    last_status: str = "pending"
    runs: int = 0
    failures: int = 0

    def is_due(self, now: float, t: time.struct_time) -> bool:
        if self.interval_seconds is not None:
            return now - self.last_run >= self.interval_seconds
        if self.cron is not None:
            return cron_matches(parse_cron(self.cron), t)
        return False


class Scheduler:
    """Async scheduler running registered jobs every tick"""

    def __init__(self, tick_seconds: float = 30.0):
        self.tick_seconds = tick_seconds
        self.jobs: dict[str, ScheduledJob] = {}
        self._task: Optional[asyncio.Task] = None
        self._running = False

    def register(
        self,
        name: str,
        callback: JobCallback,
        *,
        cron: Optional[str] = None,
        interval_seconds: Optional[float] = None,
        max_retries: int = 3,
        **kwargs,
    ) -> ScheduledJob:
        if cron is None and interval_seconds is None:
            raise ValueError("Either cron or interval_seconds is required")
        job = ScheduledJob(
            name=name,
            callback=callback,
            cron=cron,
            interval_seconds=interval_seconds,
            max_retries=max_retries,
            **kwargs,
        )
        self.jobs[name] = job
        logger.info("Registered scheduled job %s (cron=%s interval=%s)", name, cron, interval_seconds)
        return job

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _loop(self) -> None:
        # Per-minute de-dup: with tick_seconds=30 a "* * * * *" job would
        # otherwise fire twice within the same minute.
        last_fired_minute: dict[str, tuple] = {}
        while self._running:
            now = time.time()
            lt = time.localtime()
            for job in list(self.jobs.values()):
                minute_key = (lt.tm_year, lt.tm_mon, lt.tm_mday, lt.tm_hour, lt.tm_min)
                try:
                    due = job.is_due(now, lt)
                except Exception as exc:  # noqa: BLE001
                    # A bad cron must never kill the whole scheduler loop.
                    job.last_status = f"error: cron eval failed: {exc}"
                    logger.warning("Job %s cron evaluation failed: %s", job.name, exc)
                    continue
                if job.cron is not None and last_fired_minute.get(job.name) == minute_key:
                    continue
                if due:
                    await self._run_job(job)
                    if job.cron is not None:
                        last_fired_minute[job.name] = minute_key
            await asyncio.sleep(self.tick_seconds)

    async def _run_job(self, job: ScheduledJob) -> None:
        job.last_run = time.time()
        job.runs += 1
        for attempt in range(1, job.max_retries + 1):
            try:
                await job.callback(*job.args, **job.kwargs)
                job.last_status = "success"
                return
            except Exception as exc:  # noqa: BLE001
                job.failures += 1
                job.last_status = f"error: {exc}"
                logger.warning("Job %s failed (attempt %d/%d): %s", job.name, attempt, job.max_retries, exc)
                if attempt < job.max_retries:
                    await asyncio.sleep(attempt)  # linear backoff

    def status(self) -> list[dict]:
        return [
            {
                "name": j.name,
                "cron": j.cron,
                "interval": j.interval_seconds,
                "runs": j.runs,
                "failures": j.failures,
                "last_status": j.last_status,
            }
            for j in self.jobs.values()
        ]
