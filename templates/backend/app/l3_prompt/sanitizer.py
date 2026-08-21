"""L3 - Output Sanitizer & Validator

Validates and repairs LLM output (M2.8) and sanitizes raw model output
for safety (M11.5). Complements l3_prompt/output_parsers.py:

- sanitize_text: strip control chars / dangerous patterns
- validate_json / repair_json: ensure valid JSON, repair common issues
- validate_markdown: basic markdown structure checks
- filter_blocked_content: keyword/pattern content filtering (M11.5)
"""

import json
import re
from typing import Any, Optional


# Control characters to strip (keep \n \t \r)
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
# ANSI escape sequences
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")
# Common JSON code fence wrapper: ```json ... ```
_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


def sanitize_text(text: str) -> str:
    """Strip control characters and ANSI escapes from model output"""
    text = _ANSI_RE.sub("", text)
    text = _CONTROL_RE.sub("", text)
    return text.strip()


def validate_json(text: str) -> tuple[bool, Optional[Any]]:
    """Try to parse text as JSON.

    Returns:
        (True, parsed) on success; (False, None) on failure.
    """
    try:
        return True, json.loads(text)
    except json.JSONDecodeError:
        return False, None


def repair_json(text: str) -> Optional[Any]:
    """Repair common JSON issues in LLM output (M2.8).

    Handles: code fences, trailing commas, single quotes, unquoted keys.
    Returns the parsed object, or None if unrecoverable.
    """
    cleaned = text.strip()

    # 1. Strip code fences
    m = _JSON_FENCE_RE.match(cleaned)
    if m:
        cleaned = m.group(1).strip()

    # 2. Direct parse attempt
    ok, parsed = validate_json(cleaned)
    if ok:
        return parsed

    # 3. Try to locate the JSON object/array inside the text
    for start, end in (("```json", "```"), ("```", "```")):
        if start in cleaned:
            s = cleaned.find(start) + len(start)
            e = cleaned.find(end, s)
            if e > s:
                ok, parsed = validate_json(cleaned[s:e].strip())
                if ok:
                    return parsed

    # 4. Common repairs: trailing commas, single quotes
    repaired = _repair_common(cleaned)
    ok, parsed = validate_json(repaired)
    if ok:
        return parsed

    return None


def _repair_common(text: str) -> str:
    """Repair trailing commas and single-quoted strings"""
    # Trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    # Single quotes → double quotes (only for JSON-like content)
    text = re.sub(r"(?<![\\])\'(.*?)(?<![\\])\'", r'"\1"', text)
    # Unquoted keys
    text = re.sub(r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)", r'\1"\2"\3', text)
    return text


def validate_and_parse(text: str, expected_type: Optional[str] = None) -> Any:
    """One-stop: sanitize → parse → type check (M2.8).

    Args:
        text: raw LLM output
        expected_type: "object" | "array" | None
    Returns:
        Parsed value, or raises ValueError with a repair hint.
    """
    clean = sanitize_text(text)
    parsed = repair_json(clean)
    if parsed is None:
        raise ValueError("Output is not valid JSON and could not be repaired")

    if expected_type == "object" and not isinstance(parsed, dict):
        raise ValueError(f"Expected JSON object, got {type(parsed).__name__}")
    if expected_type == "array" and not isinstance(parsed, list):
        raise ValueError(f"Expected JSON array, got {type(parsed).__name__}")
    return parsed


# ── Content filtering (M11.5) ───────────────────────────────────

_BLOCKED_PATTERNS: list[re.Pattern] = [
    # Secrets / credentials
    re.compile(r"(?i)\b(api[_-]?key|secret|password|token)\s*[=:]\s*['\"]?[A-Za-z0-9_\-]{16,}"),
]


def filter_blocked_content(
    text: str,
    extra_patterns: Optional[list[str]] = None,
    redact: bool = True,
) -> str:
    """Filter or redact blocked content patterns from model output (M11.5).

    Args:
        text: model output
        extra_patterns: additional regex patterns to apply
        redact: True → replace with [REDACTED]; False → remove entirely
    """
    patterns = list(_BLOCKED_PATTERNS)
    if extra_patterns:
        patterns.extend(re.compile(p) for p in extra_patterns)

    replacement = "[REDACTED]" if redact else ""
    for pat in patterns:
        text = pat.sub(replacement, text)
    return text


def validate_schema(value: Any, schema: dict) -> tuple[bool, Optional[str]]:
    """Lightweight schema validation for parsed output (M2.8).

    schema format: {"required": ["field_a"], "field_a": {"type": "str"}}
    Returns (True, None) or (False, error_message).
    """
    required = schema.get("required", [])
    for field in required:
        if field not in value:
            return False, f"Missing required field: {field}"

    for field, spec in schema.items():
        if field == "required" or not isinstance(spec, dict):
            continue
        if field in value and value[field] is not None:
            expected = spec.get("type")
            if expected == "str" and not isinstance(value[field], str):
                return False, f"Field '{field}' should be str"
            if expected == "int" and not isinstance(value[field], int):
                return False, f"Field '{field}' should be int"
            if expected == "list" and not isinstance(value[field], list):
                return False, f"Field '{field}' should be list"
    return True, None
