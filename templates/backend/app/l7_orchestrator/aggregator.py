"""L7 - 结果聚合器

将多个子任务的执行结果合并为结构化的最终输出。
"""

from typing import Optional
from .base import TaskResult
from ..l3_prompt.prompt_builder import PromptBuilder


class ResultAggregator:
    """结果聚合器
    
    将多个子 Agent 的输出合并为结构化的最终回答。
    """
    
    def __init__(self):
        self._format_templates = {
            "research": self._format_research,
            "analysis": self._format_analysis,
            "comparison": self._format_comparison,
            "general": self._format_general,
        }
    
    async def aggregate(
        self,
        results: list[TaskResult],
        format_type: str = "general",
    ) -> str:
        """聚合结果
        
        Args:
            results: 子任务结果列表
            format_type: 输出格式类型
        Returns:
            str: 聚合后的输出
        """
        formatter = self._format_templates.get(format_type, self._format_general)
        return formatter(results)
    
    def _format_research(self, results: list[TaskResult]) -> str:
        """研究类结果格式化"""
        parts = ["## 研究报告\n"]
        
        for r in results:
            if r.success:
                parts.append(f"### 步骤 {r.task_id}\n{r.output}\n")
            else:
                parts.append(f"### 步骤 {r.task_id} (失败)\n错误: {r.error}\n")
        
        return "\n".join(parts)
    
    def _format_analysis(self, results: list[TaskResult]) -> str:
        """分析类结果格式化"""
        parts = ["## 分析报告\n"]
        
        for r in results:
            if r.success:
                parts.append(r.output)
        
        return "\n".join(parts)
    
    def _format_comparison(self, results: list[TaskResult]) -> str:
        """对比类结果格式化"""
        parts = ["## 对比分析\n"]
        
        successful = [r for r in results if r.success]
        if len(successful) >= 2:
            parts.append("### 对比项\n")
            for r in successful:
                parts.append(r.output)
        
        return "\n".join(parts)
    
    def _format_general(self, results: list[TaskResult]) -> str:
        """通用结果格式化"""
        parts = []
        
        for r in results:
            if r.success:
                parts.append(r.output)
            else:
                parts.append(f"[任务 {r.task_id} 执行失败: {r.error}]")
        
        return "\n\n".join(parts)