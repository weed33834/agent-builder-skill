"""L5 - 工具执行引擎

提供工具执行的高级功能：超时控制、错误恢复、结果格式化。
"""

import asyncio
from typing import Any, Optional

from .registry import ToolRegistry


class ToolExecutor:
    """工具执行引擎
    
    在 ToolRegistry 的基础上提供：
    - 超时控制
    - 错误恢复和降级
    - 结果格式化
    - 执行历史记录
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
        """执行工具带超时和错误处理
        
        Args:
            name: 工具名称
            args: 工具参数
            timeout: 超时时间（秒），默认使用全局配置
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
                "error": f"工具执行超时（{timeout}秒）",
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
        """格式化工具执行结果"""
        if result is None:
            return "无结果"
        return str(result)
    
    def get_history(self, limit: int = 10) -> list[dict]:
        """获取执行历史"""
        return self._history[-limit:]
    
    def clear_history(self):
        """清空执行历史"""
        self._history.clear()