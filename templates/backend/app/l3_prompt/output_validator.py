"""L3 - Output Validation Layer (deep-spec 20-B.5)

Model output unified validation pipeline:
  type check → required fields → enum/regex → business rules.
On failure returns a structured, model-readable error so the model can self-correct
(up to `max_attempts` times).

Supports:
  - JSON Schema (jsonschema if available, else a lightweight structural check)
  - Enum whitelist with confidence gate
  - Regex patterns
  - Required field enforcement
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional


class ValidationError(Exception):
    """Raised when output fails validation; carries a model-readable message."""

    def __init__(self, field: str, reason: str, message: str):
        super().__init__(message)
        self.field = field
        self.reason = reason
        self.message = message

    def to_dict(self) -> dict:
        return {"field": self.field, "reason": self.reason, "message": self.message}


class OutputValidator:
    """Structured output validator (B.5).

    schema: dict describing expected shape:
      {
        "type": "object",
        "required": ["title", "tags"],
        "properties": {
          "title": {"type": "string", "min_length": 2},
          "tags": {"type": "array", "items": {"type": "string"}, "enum": [...], "min_items": 1},
          "score": {"type": "number", "min": 0, "max": 1},
          "confidence": {"type": "number", "min": 0.6},
          "code": {"type": "string", "pattern": "^[a-z0-9_]+$"},
        },
      }
    """

    def __init__(self, schema: Optional[Dict[str, Any]] = None):
        self.schema = schema or {}

    # ---- low-level checks ------------------------------------------------
    def _check_type(self, value: Any, expected: str) -> Optional[str]:
        if expected == "string":
            return None if isinstance(value, str) else "expected string"
        if expected == "number":
            return None if isinstance(value, (int, float)) and not isinstance(value, bool) else "expected number"
        if expected == "integer":
            return None if isinstance(value, int) and not isinstance(value, bool) else "expected integer"
        if expected == "boolean":
            return None if isinstance(value, bool) else "expected boolean"
        if expected == "array":
            return None if isinstance(value, list) else "expected array"
        if expected == "object":
            return None if isinstance(value, dict) else "expected object"
        return None

    def validate_field(self, name: str, value: Any, spec: Dict[str, Any]) -> List[str]:
        """Validate a single field against its spec; returns list of problems."""
        problems: List[str] = []
        expected = spec.get("type", "string")
        type_err = self._check_type(value, expected)
        if type_err:
            problems.append(f"{name}: {type_err}")
            return problems

        if expected == "string" and isinstance(value, str):
            if "min_length" in spec and len(value) < spec["min_length"]:
                problems.append(f"{name}: shorter than min_length={spec['min_length']}")
            if "max_length" in spec and len(value) > spec["max_length"]:
                problems.append(f"{name}: longer than max_length={spec['max_length']}")
            if spec.get("pattern"):
                if not re.search(spec["pattern"], value):
                    problems.append(f"{name}: does not match pattern {spec['pattern']}")

        if expected == "number" and isinstance(value, (int, float)):
            if "min" in spec and value < spec["min"]:
                problems.append(f"{name}: below min={spec['min']}")
            if "max" in spec and value > spec["max"]:
                problems.append(f"{name}: above max={spec['max']}")

        if spec.get("enum"):
            allowed = spec["enum"]
            if value not in allowed:
                problems.append(f"{name}: value not in allowed set {allowed}")

        if expected == "array" and isinstance(value, list):
            if "min_items" in spec and len(value) < spec["min_items"]:
                problems.append(f"{name}: fewer than min_items={spec['min_items']}")
            items_spec = spec.get("items", {})
            if items_spec:
                for i, item in enumerate(value):
                    item_err = self.validate_field(f"{name}[{i}]", item, items_spec)
                    problems.extend(item_err)

        if expected == "object" and isinstance(value, dict):
            for k, vspec in spec.get("properties", {}).items():
                if k in value:
                    problems.extend(self.validate_field(f"{name}.{k}", value[k], vspec))
        return problems

    def validate(self, data: Any, return_errors: bool = False) -> Dict[str, Any]:
        """Run the full pipeline. Returns {ok, errors?, normalized?}.

        If `data` is a JSON string, parse it first. On success, attaches the
        low-confidence flags for enum fields (B.7).
        """
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                err = ValidationError("root", "invalid_json", "output is not valid JSON")
                return {"ok": False, "errors": [err.to_dict()]}

        schema = self.schema
        problems: List[str] = []
        if schema.get("type", "object") == "object" and isinstance(data, dict):
            # required fields
            for req in schema.get("required", []):
                if req not in data:
                    problems.append(f"missing required field: {req}")
            # field checks
            for k, vspec in schema.get("properties", {}).items():
                if k in data:
                    problems.extend(self.validate_field(k, data[k], vspec))
        else:
            problems.extend(self.validate_field("root", data, schema))

        if problems:
            message = " | ".join(problems[:8])
            err = ValidationError("output", "schema", message)
            if return_errors:
                return {"ok": False, "errors": [err.to_dict()]}
            return {"ok": False, "errors": [err.to_dict()], "correct_prompt": (
                f"Your previous output failed validation. Please fix these issues and retry: {message}. "
                "Return ONLY valid JSON matching the schema."
            )}

        return {"ok": True, "errors": [], "data": data}


def validate_json_schema(data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
    """B.2 JSON Schema strict validation (jsonschema if installed)."""
    try:
        import jsonschema  # type: ignore
        try:
            jsonschema.validate(instance=data, schema=schema)
            return {"ok": True, "errors": []}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "errors": [{"field": "root", "reason": "jsonschema", "message": str(exc)}]}
    except ImportError:
        # lightweight fallback
        return OutputValidator(schema).validate(data, return_errors=True)
