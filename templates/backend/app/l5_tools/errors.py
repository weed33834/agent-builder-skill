"""L5 - Tool Error Definitions

Tool-specific exception hierarchy (re-exports from L10 with tool context).
Kept in L5 so tool authors only depend on this module, not L10 directly.
"""

from ..l10_infra.errors import (
    AgentError,
    ToolError,
    ToolNotFoundError,
    ToolExecutionError,
    ToolPermissionError,
    ToolTimeoutError,
    MCPServerError,
)

__all__ = [
    "AgentError",
    "ToolError",
    "ToolNotFoundError",
    "ToolExecutionError",
    "ToolPermissionError",
    "ToolTimeoutError",
    "MCPServerError",
]
