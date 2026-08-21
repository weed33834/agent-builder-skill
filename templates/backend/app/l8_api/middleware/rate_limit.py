"""L8 - Rate Limiting Middleware

Token-bucket rate limiting per client (M7.9).
Prevents abuse and protects LLM/tool budget (M11.10).

Config (see l10_infra/config.py):
    RATE_LIMIT_ENABLED: bool
    RATE_LIMIT_RPS: requests per second per client
    RATE_LIMIT_BURST: burst capacity
"""

import time
from collections import defaultdict
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from ...l10_infra.monitoring import metrics


class RateLimiter:
    """Token-bucket rate limiter"""

    def __init__(self, rps: float = 5.0, burst: int = 10):
        self.rps = rps
        self.burst = burst
        self._tokens: dict[str, float] = defaultdict(float)
        self._last: dict[str, float] = defaultdict(float)

    def allow(self, key: str) -> tuple[bool, float]:
        """Check whether a request is allowed.

        Returns:
            (allowed, retry_after_seconds)
        """
        now = time.monotonic()
        last = self._last.get(key, now)
        elapsed = max(0.0, now - last)
        self._last[key] = now

        tokens = min(self.burst, self._tokens.get(key, self.burst) + elapsed * self.rps)
        self._tokens[key] = tokens

        if tokens >= 1.0:
            self._tokens[key] = tokens - 1.0
            return True, 0.0
        return False, (1.0 - tokens) / self.rps

    def reset(self, key: str):
        self._tokens.pop(key, None)
        self._last.pop(key, None)


class RateLimitMiddleware:
    """FastAPI middleware applying the rate limiter per client IP"""

    def __init__(
        self,
        enabled: bool = True,
        rps: float = 5.0,
        burst: int = 10,
        exempt_paths: Optional[list[str]] = None,
    ):
        self.enabled = enabled
        self.limiter = RateLimiter(rps=rps, burst=burst)
        self.exempt_paths = set(exempt_paths or ["/api/health", "/metrics"])

    async def __call__(self, request: Request, call_next):
        if not self.enabled:
            return await call_next(request)

        path = request.url.path
        if any(path.startswith(p) for p in self.exempt_paths):
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        key = f"{client}:{path.split('/')[2] if len(path.split('/')) > 2 else 'root'}"

        allowed, retry_after = self.limiter.allow(key)
        if not allowed:
            metrics.rate_limit_hits.inc()
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "detail": f"Too many requests. Retry after {retry_after:.1f}s",
                    "code": "RATE_LIMIT_EXCEEDED",
                },
                headers={"Retry-After": str(max(1, int(retry_after)))},
            )

        return await call_next(request)
