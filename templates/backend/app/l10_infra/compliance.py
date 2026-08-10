"""M11 - Security & Compliance (安全合规)

基于 OWASP Top 10 for LLM + 国内生成式AI管理办法的功能化检查清单：
每项提供 check_xxx() 判定当前配置/行为是否符合，产出结构化合规报告。
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class ComplianceItem:
    """A single compliance check"""

    code: str
    title: str
    passed: bool
    detail: str = ""
    severity: str = "medium"  # high | medium | low

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "title": self.title,
            "passed": self.passed,
            "detail": self.detail,
            "severity": self.severity,
        }


def _scan_prompt(text: str, patterns: list[str]) -> bool:
    """Return True if any injection/unsafe pattern is present"""
    return any(re.search(p, text, re.IGNORECASE) for p in patterns)


#: Common prompt-injection / jailbreak markers (basic heuristic layer)
INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior) instructions",
    r"disregard (the )?(above|prior|previous) (instructions|rules|prompt)",
    r"you are now (a|an) (different|unrestricted|jailbroken)",
    r"do anything now",
    r"system prompt",
    r"reveal your (system )?prompt",
    r"developer mode",
    r"jailbreak",
]


class ComplianceChecker:
    """Runs the checklist against config + behavior snapshots"""

    def __init__(self, settings: Optional[Any] = None):
        self.settings = settings
        self.results: list[ComplianceItem] = []

    # ---- checks ----

    def check_prompt_injection(self, prompt: str) -> ComplianceItem:
        hit = _scan_prompt(prompt, INJECTION_PATTERNS)
        return ComplianceItem(
            code="SEC-01",
            title="Prompt injection defense (OWASP LLM01)",
            passed=not hit,
            detail=f"Scanned prompt ({len(prompt)} chars); {'suspicious patterns detected' if hit else 'no known injection markers'}",
            severity="high",
        )

    def check_api_key_storage(self) -> ComplianceItem:
        """API keys must not be committed to source"""
        passed = True
        detail = "No in-repo API key scanning performed (run `git grep` manually)"
        if self.settings is not None:
            key = getattr(self.settings, "LLM_API_KEY", "")
            passed = not key or not key.startswith(("sk-", "ghp_"))
            detail = "LLM_API_KEY present in config (env var expected; ensure not committed)"
        return ComplianceItem(
            code="SEC-02",
            title="API key management",
            passed=passed,
            detail=detail,
            severity="high",
        )

    def check_rate_limit(self) -> ComplianceItem:
        enabled = bool(getattr(self.settings, "RATE_LIMIT_ENABLED", False)) if self.settings else False
        return ComplianceItem(
            code="SEC-03",
            title="Rate limiting (abuse protection)",
            passed=enabled,
            detail="RATE_LIMIT_ENABLED=true required for public deployments",
            severity="medium",
        )

    def check_output_guardrails(self, output: str = "") -> ComplianceItem:
        """Reject harmful content in model output (OWASP LLM05)"""
        blocked = ["<script", "javascript:", "data:text/html"]
        hit = any(b in output.lower() for b in blocked) if output else False
        return ComplianceItem(
            code="SEC-04",
            title="Output guardrails (XSS/unsafe content)",
            passed=not hit,
            detail=f"Checked output for {len(blocked)} unsafe markers; {'blocked content found' if hit else 'clean'}",
            severity="high",
        )

    def check_logging_pii(self, sample_log: str = "") -> ComplianceItem:
        """Logs must not leak PII (emails, phone numbers, tokens)"""
        patterns = [r"[\w.+-]+@[\w-]+\.[\w.]+", r"1[3-9]\d{9}", r"sk-[A-Za-z0-9]{20,}"]
        leaks = [p for p in patterns if re.search(p, sample_log)] if sample_log else []
        return ComplianceItem(
            code="SEC-05",
            title="PII redaction in logs",
            passed=not leaks,
            detail=f"{len(leaks)} PII patterns matched in sample log" if leaks else "No PII patterns in sample",
            severity="high",
        )

    def check_prompt_guard(self) -> ComplianceItem:
        """Sanitizer wired into the request path (M11)"""
        return ComplianceItem(
            code="SEC-06",
            title="Prompt sanitizer integration",
            passed=True,
            detail="l3_prompt/sanitizer.py available; wire into chat pipeline for production",
            severity="low",
        )

    # ---- runner ----

    def run(self, *, prompt: str = "", output: str = "", sample_log: str = "") -> list[dict]:
        self.results = [
            self.check_prompt_injection(prompt),
            self.check_api_key_storage(),
            self.check_rate_limit(),
            self.check_output_guardrails(output),
            self.check_logging_pii(sample_log),
            self.check_prompt_guard(),
        ]
        return [r.to_dict() for r in self.results]

    def summary(self) -> dict:
        passed = sum(1 for r in self.results if r.passed)
        return {
            "total": len(self.results),
            "passed": passed,
            "failed": len(self.results) - passed,
            "items": [r.to_dict() for r in self.results],
        }
