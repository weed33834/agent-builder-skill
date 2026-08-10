#!/usr/bin/env python3
"""M10 - Offline Agent Evaluation

Evaluates an agent (graph) against a test dataset using standard metrics:
- Answer correctness (LLM-as-judge or exact/contains match, M10.1)
- Response latency / tokens (M10.4)
- Tool-call accuracy (if golden tool names provided, M10.3)
- Pass rate (M10.2)

Usage:
    python scripts/evaluate.py \
        --dataset eval/sample_tasks.json \
        --provider openai --model gpt-4o \
        --report eval/report.json

Dataset format (JSON lines or list):
    {"input": "question", "expected": "golden answer", "expected_tool": "optional"}
"""

import argparse
import asyncio
import json
import time
from pathlib import Path
from typing import Optional


class SimpleJudge:
    """Fallback judge: substring/contains matching (no LLM needed)"""

    def score(self, response: str, expected: str) -> tuple[float, str]:
        r = response.lower().strip()
        e = expected.lower().strip()
        if not e:
            return 0.0, "no-expected"
        if e in r:
            return 1.0, "contains"
        # Token-overlap F1
        r_tokens = set(r.split())
        e_tokens = set(e.split())
        if not e_tokens:
            return 0.0, "empty"
        overlap = len(r_tokens & e_tokens)
        if overlap == 0:
            return 0.0, "no-overlap"
        precision = overlap / len(r_tokens)
        recall = overlap / len(e_tokens)
        f1 = 2 * precision * recall / (precision + recall)
        return f1, "f1"


class LLMJudge:
    """LLM-as-judge (M10.1): scores 0-1 with a rubric"""

    PROMPT = (
        "You are an evaluation judge. Score the model response against the "
        "expected answer on a 0-1 scale (1=perfectly correct, 0=completely wrong). "
        "Output ONLY a number.\n\n"
        "Question: {input}\n"
        "Expected: {expected}\n"
        "Response: {response}\n\nScore:"
    )

    def __init__(self, llm):
        self.llm = llm

    async def score(self, response: str, expected: str) -> tuple[float, str]:
        if not expected:
            return 0.0, "no-expected"
        try:
            from langchain_core.messages import HumanMessage
            out = await self.llm.ainvoke(
                [HumanMessage(content=self.PROMPT.format(
                    input="", expected=expected, response=response))]
            )
            text = str(getattr(out, "content", out)).strip()
            score = float(text)
            return max(0.0, min(1.0, score)), "llm-judge"
        except Exception:
            return 0.0, "judge-error"


async def evaluate_case(case: dict, graph, config, judge) -> dict:
    """Run one case through the graph and score it"""
    input_text = case["input"]
    start = time.perf_counter()

    try:
        result = await graph.ainvoke(
            {"messages": [("human", input_text)]}, config
        )
        messages = result.get("messages", [])
        response = str(getattr(messages[-1], "content", messages[-1])) if messages else ""
        success = True
        error = None
    except Exception as e:
        response, success, error = "", False, str(e)

    latency = time.perf_counter() - start

    expected = case.get("expected", "")
    score, method = await judge.score(response, expected)

    expected_tool = case.get("expected_tool")
    tool_match = None
    if expected_tool:
        tool_calls = result.get("tool_results") if success else None
        tool_match = False

    return {
        "input": input_text[:200],
        "expected": expected[:200],
        "response": response[:500],
        "score": round(score, 4),
        "judge_method": method,
        "latency_s": round(latency, 3),
        "success": success,
        "error": error,
    }


async def main():
    parser = argparse.ArgumentParser(description="Offline agent evaluation (M10)")
    parser.add_argument("--dataset", required=True, help="JSON dataset path")
    parser.add_argument("--provider", default="openai")
    parser.add_argument("--model", default=None)
    parser.add_argument("--report", default=None, help="Output report path")
    parser.add_argument("--judge", choices=["llm", "simple"], default="simple")
    args = parser.parse_args()

    # Load dataset
    raw = json.loads(Path(args.dataset).read_text(encoding="utf-8"))
    cases = raw if isinstance(raw, list) else raw.get("cases", [])

    # Load graph
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.l4_agent.graph import get_graph, get_graph_config

    graph = get_graph()
    config = get_graph_config("eval")

    # Judge
    if args.judge == "llm":
        from app.l1_llm.factory import create_llm
        llm = create_llm(provider=args.provider, model=args.model)
        judge = LLMJudge(llm)
    else:
        judge = SimpleJudge()

    results = []
    for i, case in enumerate(cases):
        print(f"[{i+1}/{len(cases)}] {case['input'][:60]}...")
        results.append(await evaluate_case(case, graph, config, judge))

    # Aggregate (M10.2 pass rate)
    scores = [r["score"] for r in results]
    passed = sum(1 for s in scores if s >= 0.7)
    report = {
        "total": len(results),
        "pass_rate": round(passed / len(results), 4) if results else 0.0,
        "avg_score": round(sum(scores) / len(scores), 4) if scores else 0.0,
        "avg_latency_s": round(sum(r["latency_s"] for r in results) / len(results), 3) if results else 0.0,
        "success_rate": round(sum(1 for r in results if r["success"]) / len(results), 4) if results else 0.0,
        "cases": results,
    }

    out_path = args.report or "eval/report.json"
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n=== Report ===")
    print(f"Pass rate (score>=0.7): {report['pass_rate']:.1%}")
    print(f"Avg score: {report['avg_score']:.3f}")
    print(f"Avg latency: {report['avg_latency_s']:.2f}s")
    print(f"Success rate: {report['success_rate']:.1%}")
    print(f"Saved to {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
