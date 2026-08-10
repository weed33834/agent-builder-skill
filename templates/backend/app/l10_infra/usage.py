"""L10 - Usage & Cost Tracking (deep-spec 23-cost-billing)

Real per-request usage/cost accounting:
  - Records tokens (input/output) + estimated cost per request
  - Aggregates by day / session / model / provider
  - Exposes budget & quota knobs
  - Persists to data/admin/usage.json (consistent with admin persistence)

Price model is configurable via a built-in price table keyed by (provider, model);
unknown models use a default rate so accounting never breaks.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import settings

_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "admin"
_USAGE_FILE = _DATA_DIR / "usage.json"

# 内置价格表: 每百万 token 输入/输出 USD；无匹配用默认价
_PRICES: Dict[str, Dict[str, tuple]] = {
    "openai": {"gpt-4o": (2.50, 10.00), "gpt-4o-mini": (0.15, 0.60), "o3-mini": (1.10, 4.40)},
    "anthropic": {"claude-sonnet-4": (3.00, 15.00), "claude-haiku-3.5": (0.80, 4.00)},
    "deepseek": {"deepseek-chat": (0.27, 1.10), "deepseek-v3": (0.27, 1.10)},
    "qwen": {"qwen-max": (1.60, 6.40), "qwen-plus": (0.80, 2.00)},
    "gemini": {"gemini-2.0-flash": (0.10, 0.40)},
    "ollama": {"*": (0.0, 0.0)},
    "*": {"*": (0.50, 2.00)},  # 兜底默认
}

_DEFAULT_COST = _PRICES["*"]["*"]


def _rate(provider: str, model: str) -> tuple:
    prov = _PRICES.get(provider, {})
    if model in prov:
        return prov[model]
    if "*" in prov:
        return prov["*"]
    return _DEFAULT_COST


def estimate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    """估算成本（USD）。"""
    p_in, p_out = _rate(provider, model)
    return round((input_tokens / 1e6) * p_in + (output_tokens / 1e6) * p_out, 6)


def _load() -> Dict[str, Any]:
    if _USAGE_FILE.exists():
        try:
            return json.loads(_USAGE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"records": [], "budget": {"monthly_usd": 100.0, "enabled": False}, "counters": {}}


def _save(data: Dict[str, Any]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _USAGE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def record_usage(
    session_id: str,
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    kind: str = "chat",
) -> Dict[str, Any]:
    """记录一次请求的用量与成本。"""
    cost = estimate_cost(provider, model, input_tokens, output_tokens)
    entry = {
        "id": f"u_{int(time.time()*1000)}_{abs(hash(f'{session_id}{model}')) % 10000}",
        "ts": int(time.time() * 1000),
        "date": time.strftime("%Y-%m-%d"),
        "session_id": session_id,
        "provider": provider,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": cost,
        "kind": kind,
    }
    data = _load()
    data.setdefault("records", []).append(entry)
    data["records"] = data["records"][-20000:]
    # 日级/模型级计数器
    counters = data.setdefault("counters", {})
    day = entry["date"]
    d = counters.setdefault(day, {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "requests": 0})
    d["input_tokens"] += input_tokens
    d["output_tokens"] += output_tokens
    d["cost_usd"] = round(d["cost_usd"] + cost, 6)
    d["requests"] += 1
    _save(data)
    return entry


def get_usage_summary(days: int = 7) -> Dict[str, Any]:
    """按日汇总 + 模型/会话 Top + 预算执行。"""
    data = _load()
    records = data.get("records", [])
    cutoff = int(time.time() * 1000) - days * 86400 * 1000
    recent = [r for r in records if r["ts"] >= cutoff]

    by_day: Dict[str, dict] = defaultdict(lambda: {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "requests": 0})
    by_model: Dict[str, dict] = defaultdict(lambda: {"requests": 0, "cost_usd": 0.0, "tokens": 0})
    by_session: Dict[str, dict] = defaultdict(lambda: {"requests": 0, "cost_usd": 0.0})
    for r in recent:
        by_day[r["date"]]["input_tokens"] += r["input_tokens"]
        by_day[r["date"]]["output_tokens"] += r["output_tokens"]
        by_day[r["date"]]["cost_usd"] += r["cost_usd"]
        by_day[r["date"]]["requests"] += 1
        mk = f"{r['provider']}/{r['model']}"
        by_model[mk]["requests"] += 1
        by_model[mk]["cost_usd"] += r["cost_usd"]
        by_model[mk]["tokens"] += r["input_tokens"] + r["output_tokens"]
        by_session[r["session_id"]]["requests"] += 1
        by_session[r["session_id"]]["cost_usd"] += r["cost_usd"]

    total_cost = sum(x["cost_usd"] for x in by_day.values())
    budget = data.get("budget", {"monthly_usd": 100.0, "enabled": False})
    monthly_spent = sum(v["cost_usd"] for d, v in data.get("counters", {}).items() if d.startswith(time.strftime("%Y-%m")))
    return {
        "days": [
            {"date": k, **v} for k, v in sorted(by_day.items())
        ],
        "by_model": sorted(
            [{"model": k, **v} for k, v in by_model.items()],
            key=lambda x: -x["cost_usd"],
        ),
        "by_session": sorted(
            [{"session_id": k, **v} for k, v in by_session.items()],
            key=lambda x: -x["cost_usd"],
        ),
        "total_cost_usd": round(total_cost, 6),
        "total_requests": len(recent),
        "budget": budget,
        "monthly_spent_usd": round(monthly_spent, 6),
        "budget_left_usd": round(max(0.0, budget.get("monthly_usd", 0) - monthly_spent), 6),
    }


def set_budget(monthly_usd: float, enabled: bool = True) -> Dict[str, Any]:
    data = _load()
    data["budget"] = {"monthly_usd": float(monthly_usd), "enabled": enabled}
    _save(data)
    return data["budget"]
