"""L7 - Task Decomposer

Automatically splits complex tasks into executable subtask sequences.
"""

from typing import Optional
from .base import SubTask
import uuid


class TaskDecomposer:
    """Task decomposer

    Decomposes a user's complex request into multiple subtasks,
    each of which can be executed by a specialized Agent.
    """

    def __init__(self, max_subtasks: int = 5):
        self.max_subtasks = max_subtasks

    async def decompose(self, task: str, context: Optional[dict] = None) -> list[SubTask]:
        """Decompose a task

        Automatically generates a subtask list based on the task description.
        Supports chained dependencies (the result of one task serves as input to the next).

        Subtask ids are DETERMINISTIC within a decomposition ("research_1",
        "analysis_2", ...) so that `dependencies` can reference earlier steps;
        random uuids would make every dependency unsatisfiable and silently
        drop all but the first subtask from execution.

        Args:
            task: Task description
            context: Context information
        Returns:
            list[SubTask]: Subtask list
        """
        task_lower = task.lower()
        subtasks = []

        # Analyze task type and generate corresponding subtasks
        if any(kw in task_lower for kw in ["搜索", "调研", "research", "search"]):
            subtasks = self._create_research_tasks(task)
        elif any(kw in task_lower for kw in ["分析", "analyze", "analysis"]):
            subtasks = self._create_analysis_tasks(task)
        elif any(kw in task_lower for kw in ["对比", "比较", "compare"]):
            subtasks = self._create_comparison_tasks(task)
        else:
            # Default: single task
            subtasks = [
                SubTask(
                    id=f"general_{uuid.uuid4().hex[:6]}",
                    description=task,
                    agent_type="general",
                    input_data={"task": task},
                )
            ]

        return subtasks[:self.max_subtasks]

    def _create_research_tasks(self, task: str) -> list[SubTask]:
        """Create research-type subtasks"""
        return [
            SubTask(
                id="research_search",
                description=f"搜索相关信息: {task}",
                agent_type="search",
                input_data={"query": task, "action": "search"},
            ),
            SubTask(
                id="research_analyze",
                description=f"分析和总结: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "analyze"},
                dependencies=["research_search"],
            ),
        ]

    def _create_analysis_tasks(self, task: str) -> list[SubTask]:
        """Create analysis-type subtasks"""
        return [
            SubTask(
                id="analysis_collect",
                description=f"收集数据: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect"},
            ),
            SubTask(
                id="analysis_deep_analyze",
                description=f"深度分析: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "deep_analyze"},
                dependencies=["analysis_collect"],
            ),
            SubTask(
                id="analysis_report",
                description=f"生成报告: {task}",
                agent_type="generate",
                input_data={"task": task, "action": "report"},
                dependencies=["analysis_deep_analyze"],
            ),
        ]

    def _create_comparison_tasks(self, task: str) -> list[SubTask]:
        """Create comparison-type subtasks"""
        return [
            SubTask(
                id="compare_collect_a",
                description=f"收集对比项 A: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect_a"},
            ),
            SubTask(
                id="compare_collect_b",
                description=f"收集对比项 B: {task}",
                agent_type="search",
                input_data={"query": task, "action": "collect_b"},
            ),
            SubTask(
                id="compare_analyze",
                description=f"对比分析: {task}",
                agent_type="analyze",
                input_data={"task": task, "action": "compare"},
                dependencies=["compare_collect_a", "compare_collect_b"],
            ),
        ]
