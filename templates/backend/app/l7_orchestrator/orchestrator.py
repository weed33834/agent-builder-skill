"""L7 - 多 Agent 编排器

协调多个 Agent 的执行，管理任务分配、结果收集和错误处理。
"""

from typing import Optional
from .base import OrchestratorBase, SubTask, TaskResult
from .decomposer import TaskDecomposer
from .aggregator import ResultAggregator


class AgentOrchestrator(OrchestratorBase):
    """多 Agent 编排器
    
    负责：
    1. 接收用户输入
    2. 分解为子任务
    3. 分派给合适的 Agent
    4. 收集结果
    5. 聚合输出
    """
    
    def __init__(self):
        self.decomposer = TaskDecomposer()
        self.aggregator = ResultAggregator()
        self._subtasks: list[SubTask] = []
        self._results: list[TaskResult] = []
    
    async def run(self, user_input: str) -> str:
        """执行完整编排流程"""
        # 1. 任务分解
        self._subtasks = await self.decompose_task(user_input)
        
        # 2. 按依赖顺序执行子任务
        self._results = []
        executed = set()
        
        while len(executed) < len(self._subtasks):
            for task in self._subtasks:
                if task.id in executed:
                    continue
                # 检查依赖是否已满足
                if all(dep in executed for dep in task.dependencies):
                    result = await self._execute_subtask(task)
                    self._results.append(result)
                    executed.add(task.id)
        
        # 3. 结果聚合
        return await self.aggregate_results(self._results)
    
    async def decompose_task(self, task: str) -> list[SubTask]:
        """分解任务"""
        return await self.decomposer.decompose(task)
    
    async def _execute_subtask(self, task: SubTask) -> TaskResult:
        """执行单个子任务"""
        task.status = "running"
        try:
            # 通过 L4 Agent 执行
            from ..l4_agent.graph import get_graph, get_graph_config
            graph = get_graph()
            config = get_graph_config(task.id)
            
            result = await graph.ainvoke(
                {"messages": [("human", task.description)]},
                config,
            )
            
            task.status = "completed"
            return TaskResult(
                task_id=task.id,
                success=True,
                output=result["messages"][-1].content,
            )
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            return TaskResult(
                task_id=task.id,
                success=False,
                output="",
                error=str(e),
            )
    
    async def aggregate_results(self, results: list[TaskResult]) -> str:
        """聚合结果"""
        return await self.aggregator.aggregate(results)
    
    def get_status(self) -> dict:
        """获取当前编排状态"""
        return {
            "total_subtasks": len(self._subtasks),
            "completed": sum(1 for r in self._results if r.success),
            "failed": sum(1 for r in self._results if not r.success),
            "subtasks": [
                {
                    "id": t.id,
                    "description": t.description,
                    "status": t.status,
                    "agent_type": t.agent_type,
                }
                for t in self._subtasks
            ],
        }