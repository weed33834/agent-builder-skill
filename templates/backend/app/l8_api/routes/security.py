"""L8 - Security & Resilience API (deep-spec 22/25/27)

Exposes the real security, data-governance and resilience capabilities:

  POST /api/security/scan      输入侧安全扫描（注入检测 + PII + 内容过滤）
  POST /api/security/redact    仅做 PII 脱敏
  GET  /api/security/breakers  熔断器状态
  POST /api/security/breakers/{name}/reset  重置某个熔断器
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...l10_infra.ai_security import scan as security_scan, redact_pii
from ...l10_infra.circuit_breaker import get_circuit_breakers

router = APIRouter()


@router.post("/security/scan")
async def scan(payload: dict):
    """输入侧安全扫描。contract: {text} -> scan result"""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    return security_scan(text)


@router.post("/security/redact")
async def redact(payload: dict):
    """PII 脱敏。contract: {text, replace_with?}"""
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    return redact_pii(text, payload.get("replace_with", "***"))


@router.get("/security/breakers")
async def list_breakers():
    """熔断器状态列表。"""
    return {"items": get_circuit_breakers().list()}


@router.post("/security/breakers/{name}/reset")
async def reset_breaker(name: str):
    get_circuit_breakers().get(name).reset()
    return {"ok": True, "name": name}
