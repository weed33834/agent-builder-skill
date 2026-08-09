"""L4 - Routing Decisions

Defines the Agent's conditional routing logic, supporting dynamic decisions.
LangGraph v1.0 provides a built-in tools_condition, which can be used directly for most scenarios.
"""

from typing import Callable
from langgraph.prebuilt import tools_condition

from .state import AgentState


class ConditionalRouter:
    """Conditional router

    Dynamically decides the next route based on state.
    Supports custom routing logic and default routing.

    Note: For the standard Agent→Tools→Agent loop, it is recommended to use
    langgraph.prebuilt.tools_condition directly instead of this class.
    """

    def __init__(self):
        self._routes: dict[str, tuple[Callable[[AgentState], bool], str]] = {}
        self._default_route: str = "__end__"

    def add_route(
        self,
        name: str,
        condition: Callable[[AgentState], bool],
        target: str,
    ):
        """Add a conditional route

        Args:
            name: Route name
            condition: Condition function, takes this route when returning True
            target: Target node
        """
        self._routes[name] = (condition, target)

    def route(self, state: AgentState) -> str:
        """Execute the routing decision"""
        for name, (condition, target) in self._routes.items():
            try:
                if condition(state):
                    return target
            except Exception:
                continue
        return self._default_route


# Predefined routing conditions
def has_tool_calls(state: AgentState) -> bool:
    """Check whether there are tool calls (a simplified version compatible with tools_condition)"""
    last_message = state.get("messages", [])
    if not last_message:
        return False
    last = last_message[-1]
    return hasattr(last, "tool_calls") and bool(last.tool_calls)


def has_error(state: AgentState) -> bool:
    """Check whether there is an error"""
    return state.get("error") is not None


def max_iterations_reached(state: AgentState, max_iter: int = 10) -> bool:
    """Check whether the maximum iteration count has been reached"""
    return state.get("iteration_count", 0) >= max_iter
