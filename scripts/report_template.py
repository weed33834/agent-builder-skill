"""M10 - Evaluation Report (评估报告模板)

由 scripts/evaluate.py 的 --report 输出。保留为报告结构说明，
实际运行 evaluate.py 后会在指定路径生成 JSON 报告。
"""

REPORT_SCHEMA = {
    "dataset": "eval/sample_tasks.json",
    "model": {"provider": "openai", "model": "gpt-4o"},
    "generated_at": "2026-08-10T00:00:00+08:00",
    "summary": {
        "total_cases": 10,
        "passed": 8,
        "pass_rate": 0.8,
        "avg_latency_ms": 850.0,
        "avg_tokens": 512,
    },
    "by_category": {
        "coding": {"total": 3, "passed": 2, "pass_rate": 0.67},
        "knowledge": {"total": 3, "passed": 3, "pass_rate": 1.0},
    },
    "cases": [
        {
            "input": "…",
            "expected": "…",
            "response": "…",
            "score": 1.0,
            "judge": "contains",
            "latency_ms": 720,
            "tokens": 420,
            "tool_calls": ["run_code"],
            "expected_tool": "run_code",
            "tool_match": True,
        }
    ],
}


def render_markdown(report: dict) -> str:
    """Render a report dict into a human-readable markdown summary"""
    s = report.get("summary", {})
    lines = [
        "# Agent Evaluation Report",
        "",
        f"- Dataset: `{report.get('dataset', '')}`",
        f"- Model: {report.get('model', {}).get('provider', '')} / {report.get('model', {}).get('model', '')}",
        f"- Generated: {report.get('generated_at', '')}",
        "",
        "## Summary",
        "",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total cases | {s.get('total_cases', 0)} |",
        f"| Passed | {s.get('passed', 0)} |",
        f"| Pass rate | {s.get('pass_rate', 0):.2%} |",
        f"| Avg latency | {s.get('avg_latency_ms', 0)} ms |",
        f"| Avg tokens | {s.get('avg_tokens', 0)} |",
        "",
    ]
    cats = report.get("by_category", {})
    if cats:
        lines += ["## By Category", "", "| Category | Total | Passed | Rate |", "|----------|-------|--------|------|"]
        for cat, v in cats.items():
            lines.append(f"| {cat} | {v.get('total', 0)} | {v.get('passed', 0)} | {v.get('pass_rate', 0):.2%} |")
        lines.append("")
    return "\n".join(lines)
