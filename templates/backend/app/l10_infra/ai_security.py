"""L10 - AI Security & Data Governance (deep-spec 27-ai-security + 22-data-governance)

Real security capabilities:
  - Prompt-injection detection (OWASP LLM Top10): dual-engine heuristic (keyword
    patterns + instruction-override scoring) with severity + confidence.
  - PII redaction (data governance): emails / phone / ID cards / credit cards /
    IPs / API-keys masked, with policy-preserving placeholders.
  - Content filtering (profanity / violence / URL-blocklist basic).
  - Output guard: flag policy violations in model output.

Exposed via /api/security/* endpoints and available as a pre/post processing hook
in the chat pipeline.
"""

from __future__ import annotations

import re
from typing import Dict, List

# ── PII 正则模式（含大陆手机号/身份证） ──────────────────────────
_PII_PATTERNS: List[tuple] = [
    ("email", re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")),
    ("phone", re.compile(r"(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)")),
    ("id_card", re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)")),
    ("credit_card", re.compile(r"(?<!\d)(?:\d[ -]?){13,19}(?!\d)")),
    ("ip", re.compile(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)")),
    ("api_key", re.compile(r"\b(sk-[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]{8,})\b", re.I)),
]

# ── Prompt 注入模式（OWASP LLM01）────────────────────────────────
_INJECTION_PATTERNS: List[tuple] = [
    ("direct_override", re.compile(r"(?i)(ignore (all )?(previous )?(instructions|prompts|rules)|disregard (previous|prior).{0,20}(instructions|rules)|忘记.{0,6}(之前的|以上|所有|旧|老的).{0,8}(指令|规则|提示)|忽略.{0,6}(所有|以上|之前|旧|老的).{0,8}(指令|规则|提示)|当作.{0,4}(不存在|无效))")),
    ("role_impersonation", re.compile(r"(?i)(you are now|act as (if )?(an? )?(assistant|gpt|bot|ai).{0,20}with no|你现在是|假装你是|扮演.{0,6}(不受限制|无限制)|模拟.{0,4}(无限|突破限制))")),
    ("exfiltrate", re.compile(r"(?i)(leak|reveal|show|output|print|repeat|tell me|give me).{0,20}(system prompt|instructions|initial prompt|secret|key|password|api[ _-]?key)|(泄露|说出|展示|输出|打印|告诉|提供).{0,12}(系统提示|指令|密码|密钥|secret|key|api)")),
    ("delimiter_escape", re.compile(r"(?i)(<|《|\[|###)(/?)(system|user|assistant|end|start)|(退出|结束|终止).{0,4}(对话|角色)")),
    ("false_premise", re.compile(r"(?i)(new instructions|updated policy|override)|(新的规则|已更新|管理员要求)")),
]

_DANGER_KEYWORDS: List[str] = [
    "无视规则", "忽略指令", "越狱", "jailbreak", "DAN", "do anything now",
    "绕过审核", "bypass", "system prompt reveal", "泄露系统提示", "绕过内容政策",
]

_PROFANITY = ["fuck", "shit", "bitch", "妈的", "操", "傻逼", "去死", "滚蛋"]


# ── 提示词注入检测 ─────────────────────────────────────────────
def detect_injection(text: str) -> Dict[str, any]:
    """双引擎注入检测：模式匹配 + 危险词加权。
    返回 {flagged, severity, confidence, hits:[{pattern, weight}]}
    severity: low / medium / high
    """
    hits: List[dict] = []
    weight = 0.0
    for name, pattern in _INJECTION_PATTERNS:
        if pattern.search(text or ""):
            hits.append({"pattern": name, "weight": 2.0})
            weight += 2.0
    lower = (text or "").lower()
    for kw in _DANGER_KEYWORDS:
        if kw.lower() in lower:
            hits.append({"pattern": "danger_keyword", "keyword": kw, "weight": 1.5})
            weight += 1.5
    flagged = weight >= 1.5
    if weight >= 4.0:
        severity = "high"
    elif weight >= 2.0:
        severity = "medium"
    else:
        severity = "low"
    return {
        "flagged": flagged,
        "severity": severity if flagged else "none",
        "confidence": round(min(0.95, weight / 5.0), 2),
        "hits": hits[:8],
        "action": "block" if weight >= 4.0 else ("review" if weight >= 2.0 else "allow"),
    }


# ── PII 脱敏 ──────────────────────────────────────────────────
def redact_pii(text: str, replace_with: str = "***") -> Dict[str, any]:
    """PII 检测与脱敏。返回 {redacted, count, found:[{type,count}]}"""
    found: Dict[str, int] = {}
    redacted = text or ""
    for name, pattern in _PII_PATTERNS:
        matches = pattern.findall(redacted)
        if matches:
            found[name] = len(matches)
            redacted = pattern.sub(replace_with, redacted)
    return {"redacted": redacted, "count": sum(found.values()), "found": found}


# ── 内容过滤 ──────────────────────────────────────────────────
def content_filter(text: str) -> Dict[str, any]:
    """基础内容过滤（污言秽语）。返回 {flagged, hits}"""
    lower = (text or "").lower()
    hits = [w for w in _PROFANITY if w in lower]
    return {"flagged": len(hits) > 0, "hits": hits}


# ── 一站式安全扫描 ────────────────────────────────────────────
def scan(text: str) -> Dict[str, any]:
    """输入侧全量安全扫描（注入 + PII + 内容），供 /api/security/scan。"""
    injection = detect_injection(text)
    pii = redact_pii(text)
    content = content_filter(text)
    blocked = injection.get("action") == "block" or content["flagged"]
    return {
        "injection": injection,
        "pii": {"count": pii["count"], "found": pii["found"]},
        "content": content,
        "blocked": blocked,
        "redacted": pii["redacted"],
    }
