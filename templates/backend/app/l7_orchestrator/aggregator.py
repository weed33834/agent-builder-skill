"""L7 - Result Aggregator

Merges the execution results of multiple subtasks into a structured final output.
"""

from .base import TaskResult


class ResultAggregator:
    """Result aggregator

    Merges the outputs of multiple sub-Agents into a structured final answer.
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
        """Aggregate results

        Args:
            results: List of subtask results
            format_type: Output format type
        Returns:
            str: Aggregated output
        """
        formatter = self._format_templates.get(format_type, self._format_general)
        return formatter(results)

    def _format_research(self, results: list[TaskResult]) -> str:
        """Format research-type results"""
        parts = ["## 研究报告\n"]

        for r in results:
            if r.success:
                parts.append(f"### 步骤 {r.task_id}\n{r.output}\n")
            else:
                parts.append(f"### 步骤 {r.task_id} (失败)\n错误: {r.error}\n")

        return "\n".join(parts)

    def _format_analysis(self, results: list[TaskResult]) -> str:
        """Format analysis-type results"""
        parts = ["## 分析报告\n"]

        for r in results:
            if r.success:
                parts.append(r.output)

        return "\n".join(parts)

    def _format_comparison(self, results: list[TaskResult]) -> str:
        """Format comparison-type results"""
        parts = ["## 对比分析\n"]

        successful = [r for r in results if r.success]
        if len(successful) >= 2:
            parts.append("### 对比项\n")
            for r in successful:
                parts.append(r.output)

        return "\n".join(parts)

    def _format_general(self, results: list[TaskResult]) -> str:
        """Format general results"""
        parts = []

        for r in results:
            if r.success:
                parts.append(r.output)
            else:
                parts.append(f"[任务 {r.task_id} 执行失败: {r.error}]")

        return "\n\n".join(parts)
