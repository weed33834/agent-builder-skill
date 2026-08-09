"""L7 - 编排基类

定义编排层的基础接口和数据结构。
"""

from abc import ABC, abstractmethod
from typing import Any
from dataclasses import dataclass, field


@dataclass
class SubTask:
    """子任务定义"""
    id: str
    description: str
    agent_type: str
    input_data: dict
    dependencies: list[str] = field(default_factory=list)
    status: str = "pending"  # pending | running | completed | failed
    result: Any = None
    error: str = ""


@dataclass
class TaskResult:
    """任务执行结果"""
    task_id: str
    success: bool
    output: Any
    error: str = ""


class OrchestratorBase(ABC):
    """编排器基类"""
    
    @abstractmethod
    async def run(self, user_input: str) -> str:
        """执行编排流程"""
        ...

    @abstractmethod
    async def decompose_task(self, task: str) -> list[SubTask]:
        """分解任务为子任务"""
        ...

    @abstractmethod
    async def aggregate_results(self, results: list[TaskResult]) -> str:
        """聚合子任务结果"""
        ...