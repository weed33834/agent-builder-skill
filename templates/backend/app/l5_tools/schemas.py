"""L5 - Tool Schema Utilities

Helpers for building tool schemas (M4.2) and validating tool arguments (M4.20).

- json_schema_from_function: derive JSON Schema from a Python callable signature
- validate_arguments: validate tool arguments against a JSON Schema
- truncate_result: truncate/summarize large tool results (M4.19)
"""

import inspect
import json
import re
from typing import Any, Callable, Optional

try:
    from pydantic import create_model, BaseModel, ValidationError
    PYDANTIC_AVAILABLE = True
except ImportError:  # pragma: no cover
    PYDANTIC_AVAILABLE = False


_TYPE_MAP = {
    "str": "string",
    "int": "integer",
    "float": "number",
    "bool": "boolean",
    "list": "array",
    "dict": "object",
    "Any": "string",
}


def json_schema_from_function(
    fn: Callable,
    *,
    description: Optional[str] = None,
    name: Optional[str] = None,
) -> dict:
    """Generate a JSON Schema (OpenAI tool format) from a function signature.

    Example:
        def search(query: str, limit: int = 10) -> str: ...
        schema = json_schema_from_function(search)
        # {
        #   "name": "search",
        #   "description": "def search(query: str, limit: int = 10) -> str: ...",
        #   "parameters": {
        #     "type": "object",
        #     "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
        #     "required": ["query"]
        #   }
        # }
    """
    sig = inspect.signature(fn)
    properties: dict[str, dict] = {}
    required: list[str] = []

    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls"):
            continue
        annotation = param.annotation
        type_name = getattr(annotation, "__name__", str(annotation))
        prop: dict[str, Any] = {"type": _TYPE_MAP.get(type_name, "string")}

        # Handle Optional[X] → include null
        if type_name == "Optional":
            prop["type"] = _TYPE_MAP.get(
                getattr(getattr(annotation, "__args__", (str,))[0], "__name__", "string"),
                "string",
            )

        # Default value
        if param.default is not inspect.Parameter.empty:
            prop["default"] = param.default
        else:
            required.append(param_name)

        # Docstring description (first line of the docstring)
        if fn.__doc__:
            first_line = fn.__doc__.strip().split("\n")[0]
            if first_line:
                prop["description"] = first_line

        properties[param_name] = prop

    return {
        "name": name or fn.__name__,
        "description": description or (fn.__doc__ or "").strip().split("\n")[0] or f"Call {fn.__name__}",
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required,
        },
    }


def validate_arguments(schema: dict, arguments: dict) -> tuple[bool, Optional[str]]:
    """Validate tool arguments against a JSON Schema.

    Returns:
        (True, None) if valid, (False, error_message) otherwise.
    """
    if not PYDANTIC_AVAILABLE:  # pragma: no cover
        return True, None

    try:
        properties = schema.get("parameters", {}).get("properties", {})
        required = schema.get("parameters", {}).get("required", [])

        fields: dict[str, Any] = {}
        for prop_name, prop_def in properties.items():
            ptype = _json_type_to_python(prop_def.get("type", "string"))
            from pydantic import Field
            if prop_name in required:
                fields[prop_name] = (ptype, Field(description=prop_def.get("description", "")))
            else:
                fields[prop_name] = (
                    Optional[ptype],  # type: ignore[valid-type]
                    Field(default=None, description=prop_def.get("description", "")),
                )

        model = create_model("ToolArgs", **fields)  # type: ignore[call-overload]
        model.model_validate(arguments)
        return True, None
    except ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Validation error: {e}"


def _json_type_to_python(json_type: str) -> type:
    return {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "array": list,
        "object": dict,
    }.get(json_type, str)


def truncate_result(result: Any, max_chars: int = 2000) -> str:
    """Truncate a large tool result to prevent context explosion (M4.19).

    - Strings are truncated with an ellipsis marker.
    - Dicts/lists are JSON-serialized then truncated.
    - Adds a hint about the truncated portion.
    """
    if isinstance(result, str):
        text = result
    else:
        try:
            text = json.dumps(result, ensure_ascii=False, default=str)
        except Exception:
            text = str(result)

    if len(text) <= max_chars:
        return text

    return text[:max_chars] + f"\n...[truncated {len(text) - max_chars} chars]"


def sanitize_tool_output(text: str, max_lines: int = 200) -> str:
    """Sanitize tool output: strip control characters, cap line count (M4.19/M11.5)"""
    # Remove ANSI escape sequences
    text = re.sub(r"\x1b\[[0-9;]*m", "", text)
    # Remove other control characters (keep \n \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)

    lines = text.split("\n")
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines.append(f"...[truncated {len(text.split(chr(10))) - max_lines} lines]")
    return "\n".join(lines)
