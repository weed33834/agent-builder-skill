"""L5 - Tool Execution Engine

Provides advanced tool execution features: timeout control, error recovery, result formatting.
"""

import asyncio
from typing import Any, Optional

from .registry import ToolRegistry


class ToolExecutor:
    """Tool execution engine

    Built on top of ToolRegistry, provides:
    - Timeout control
    - Error recovery and degradation
    - Result formatting
    - Execution history recording
    """

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self._history: list[dict] = []

    async def execute(
        self,
        name: str,
        args: dict,
        timeout: Optional[int] = None,
    ) -> dict:
        """Execute a tool with timeout and error handling

        Args:
            name: Tool name
            args: Tool arguments
            timeout: Timeout (seconds), defaults to global configuration
        Returns:
            dict: {"success": bool, "result": str, "error": str | None}
        """
        timeout = timeout or self.timeout

        try:
            result = await asyncio.wait_for(
                ToolRegistry.execute(name, args),
                timeout=timeout,
            )

            execution = {
                "tool": name,
                "args": args,
                "success": True,
                "result": self._format_result(result),
                "error": None,
            }
            self._history.append(execution)
            return execution

        except asyncio.TimeoutError:
            execution = {
                "tool": name,
                "args": args,
                "success": False,
                "result": None,
                "error": f"Tool execution timed out ({timeout}s)",
            }
            self._history.append(execution)
            return execution

        except Exception as e:
            execution = {
                "tool": name,
                "args": args,
                "success": False,
                "result": None,
                "error": str(e),
            }
            self._history.append(execution)
            return execution

    def _format_result(self, result: Any) -> str:
        """Format the tool execution result"""
        if result is None:
            return "No result"
        return str(result)

    def get_history(self, limit: int = 10) -> list[dict]:
        """Get execution history"""
        return self._history[-limit:]

    def clear_history(self):
        """Clear execution history"""
        self._history.clear()
