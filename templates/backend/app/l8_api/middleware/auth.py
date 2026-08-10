"""L8 - Authentication Middleware (M10 IAM)

Authentication + authorization for the API surface:
- API Key authentication (simple mode, HMAC compare)
- JWT Bearer Token (production mode, HS256 with optional role claims)

Usage in main.py:
    app.add_middleware(AuthMiddleware, api_key=settings.api_key, jwt_secret=settings.jwt_secret)
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_jwt(payload: dict, secret: str, expires_in: int = 3600) -> str:
    """Create a HS256 JWT with role claims (used by tests and token issuance)."""
    header = {"alg": "HS256", "typ": "JWT"}
    body = dict(payload)
    body["iat"] = int(time.time())
    body["exp"] = int(time.time()) + expires_in
    signing_input = _b64url(json.dumps(header, separators=(",", ":")).encode()) + "." + _b64url(
        json.dumps(body, separators=(",", ":")).encode()
    )
    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return signing_input + "." + _b64url(sig)


def decode_jwt(token: str, secret: str) -> Optional[dict]:
    """Verify and decode a JWT; returns the payload or None."""
    try:
        signing_input, sig_b64 = token.rsplit(".", 1)
        expected = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        actual = _b64url_decode(sig_b64)
        if not hmac.compare_digest(actual, expected):
            return None
        header_b64, body_b64 = signing_input.split(".")
        payload = json.loads(_b64url_decode(body_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:  # noqa: BLE001
        return None


class AuthMiddleware:
    """Authentication middleware

    Supports multiple authentication methods:
    - API Key authentication (simple mode, X-API-Key or Bearer)
    - JWT Bearer Token (production mode, role-aware)

    Admin endpoints (/api/admin/*) additionally require the 'admin' role
    when JWT auth is enabled (RBAC, M10.3).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        jwt_secret: Optional[str] = None,
        allow_health: bool = True,
    ):
        self.api_key = api_key or os.getenv("API_KEY", "")
        self.jwt_secret = jwt_secret or os.getenv("JWT_SECRET", "")
        self.allow_health = allow_health

    async def verify_api_key(self, request: Request) -> bool:
        """Verify API Key from X-API-Key header or Bearer token (simple mode)."""
        if not self.api_key:
            return True  # No authentication configured, allow all requests

        header = request.headers.get("Authorization", "")
        x_key = request.headers.get("X-API-Key", "")
        candidate = ""
        if header.startswith("Bearer "):
            candidate = header[7:]
        elif x_key:
            candidate = x_key
        return bool(candidate) and hmac.compare_digest(candidate, self.api_key)

    def _verify_jwt(self, request: Request) -> Optional[dict]:
        """Verify JWT Bearer token; returns payload on success."""
        if not self.jwt_secret:
            return None  # JWT not enabled
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return None
        return decode_jwt(header[7:], self.jwt_secret)

    async def __call__(self, request: Request, call_next):
        """Middleware processing"""
        path = request.url.path
        if self.allow_health and path == "/api/health":
            return await call_next(request)

        # JWT mode (production) — role-aware RBAC for admin surface
        if self.jwt_secret:
            payload = self._verify_jwt(request)
            if payload is None:
                return JSONResponse(
                    status_code=401,
                    content={"error": "Unauthorized", "detail": "Invalid or expired JWT"},
                )
            if path.startswith("/api/admin"):
                role = payload.get("role", "user")
                if role != "admin":
                    return JSONResponse(
                        status_code=403,
                        content={"error": "Forbidden", "detail": "Admin role required"},
                    )
            return await call_next(request)

        # API Key mode (simple)
        if not await self.verify_api_key(request):
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "detail": "Invalid API Key"},
            )

        return await call_next(request)
