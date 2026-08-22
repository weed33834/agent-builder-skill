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

    Delegates to the `jsonschema` library (already a project dependency and
    the industry standard). The previous hand-rolled pydantic dynamic-model
    approach only understood type/required — enum, pattern, min/max etc.
    were silently ignored.

    Returns:
        (True, None) if valid, (False, error_message) otherwise.
    """
    try:
        import jsonschema
    except ImportError:  # pragma: no cover
        return True, None

    full_schema = schema.get("parameters", schema)
    try:
        jsonschema.validate(instance=arguments, schema=full_schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, e.message
    except jsonschema.SchemaError as e:
        return False, f"invalid schema: {e.message}"


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
