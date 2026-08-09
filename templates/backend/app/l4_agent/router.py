"""L4 - 路由决策

定义 Agent 的条件路由逻辑，支持动态决策。
"""

from typing import Literal, Optional, Callable, Awaitable
from .state import AgentState


class ConditionalRouter:
    """条件路由器
    
    根据状态动态决定下一步路由。
    支持自定义路由逻辑和默认路由。
    """
    
    def __init__(self):
        self._routes: dict[str, Callable[[AgentState], str]] = {}
        self._default_route: str = "__end__"
    
    def add_route(
        self,
        name: str,
        condition: Callable[[AgentState], bool],
        target: str,
    ):
        """添加条件路由
        
        Args:
            name: 路由名称
            condition: 条件函数，返回 True 时走此路由
            target: 目标节点
        """
        self._routes[name] = (condition, target)
    
    def route(self, state: AgentState) -> str:
        """执行路由决策"""
        for name, (condition, target) in self._routes.items():
            try:
                if condition(state):
                    return target
            except Exception:
                continue
        return self._default_route


# 预定义路由条件
def has_tool_calls(state: AgentState) -> bool:
    """检查是否有工具调用"""
    return state.get("next_step") == "tools"


def has_error(state: AgentState) -> bool:
    """检查是否有错误"""
    return state.get("error") is not None


def max_iterations_reached(state: AgentState, max_iter: int = 10) -> bool:
    """检查是否达到最大迭代次数"""
    return state.get("iteration_count", 0) >= max_iter