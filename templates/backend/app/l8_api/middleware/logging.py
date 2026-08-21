"""L8 - Request Logging Middleware

Structured access logging + latency/error metrics (M13.1 + M13.5).
Logs each request: method, path, status, latency, client, request_id.
"""

import time
import uuid
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from ...l10_infra.logging import get_logger
from ...l10_infra.monitoring import metrics

logger = get_logger(__name__)


class RequestLoggingMiddleware:
    """Middleware that logs every request and records metrics (M13.1/M13.5)"""

    def __init__(self, exclude_paths: Optional[list[str]] = None):
        self.exclude_paths = set(exclude_paths or ["/api/health"])

    async def __call__(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id

        start = time.perf_counter()
        metrics.request_total.inc()

        try:
            response = await call_next(request)
        except Exception as e:
            metrics.request_error_total.inc()
            elapsed = time.perf_counter() - start
            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                latency_ms=round(elapsed * 1000, 2),
                error=str(e)[:300],
            )
            metrics.request_latency.observe(elapsed)
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "code": "INTERNAL_ERROR"},
            )

        elapsed = time.perf_counter() - start
        metrics.request_latency.observe(elapsed)

        if response.status_code >= 400:
            metrics.request_error_total.inc()

        # Skip verbose logging for excluded paths
        if request.url.path not in self.exclude_paths:
            logger.info(
                "request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                latency_ms=round(elapsed * 1000, 2),
                client=request.client.host if request.client else None,
            )

        response.headers["X-Request-ID"] = request_id
        return response
