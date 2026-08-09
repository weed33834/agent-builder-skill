"""L7 - 任务分解器

将复杂任务自动拆分为可执行的子任务序列。
"""

from typing import Optional
from .base import SubTask
import uuid


class TaskDecomposer:
    """任务分解器
    
    将用户的复杂请求分解为多个子任务，
    每个子任务可以由专门的 Agent 执行。
    """
    
    def __init__(self, max_subtasks: int = 5):
        self.max_subtasks = max_subtasks
    
    async def decompose(self, task: str, context: Optional[dict] = None) -> list[SubTask]:
        """分解任务
        
        根据任务描述，自动生成子任务列表。
        支持链式依赖（前一个任务的结果作为后一个的输入）。
        
        Args:
            task: 任务描述
            context: 上下文信息
        Returns:
            list[SubTask]: 子任务列表
        """
        task_lower = task.lower()
        subtasks = []
        
        # 分析任务类型，生成对应的子任务
        if any(kw in task_lower for kw in ["搜索", "调研", "research", "search"]):
            subtasks = self._create_research_tasks(task)
        elif any(kw in task_lower for kw in ["分析", "分析", "analyze", "analysis"]):
            subtasks = self._create_analysis_tasks(task)
        elif any(kw in task_lower for kw in ["对比", "比较", "compare", "对比"]):
            subtasks = self._create_comparison_tasks(task)
        else:
            # 默认：单任务
            subtasks = [
                SubTask(
                    id=str(uuid.uuid4())[:8],
                    description=task,
                    agent_type="general",
                    input_data={"task": task},
                )
            ]
        
        return subtasks[:self.max_subtasks]
    
    def _create_research_tasks(self, task: str) -> list[SubTask]:
        """创建研究类子任务"""
        return [
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"搜索相关信息: {task}",
                agent_type="search",
                input_data={"query": task, "action": "search"},
            ),
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"分析和总结: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "analyze"},
                dependencies=["search"],
            ),
        ]
    
    def _create_analysis_tasks(self, task: str) -> list[SubTask]:
        """创建分析类子任务"""
        return [
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"收集数据: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect"},
            ),
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"深度分析: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "deep_analyze"},
                dependencies=["collect"],
            ),
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"生成报告: {task}",
                agent_type="generate",
                input_data={"task": task, "action": "report"},
                dependencies=["analyze"],
            ),
        ]
    
    def _create_comparison_tasks(self, task: str) -> list[SubTask]:
        """创建对比类子任务"""
        return [
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"收集对比项 A: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect_a"},
            ),
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"收集对比项 B: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect_b"},
            ),
            SubTask(
                id=str(uuid.uuid4())[:8],
                description=f"对比分析: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "compare"},
                dependencies=["collect_a", "collect_b"],
            ),
        ]