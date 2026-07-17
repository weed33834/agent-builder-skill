"""关系对比 —— 两人结果摘要的维度反差 / 契合度。

纯模板计算,无外部依赖。对比码 = 对方结果 id,经 /api/results/{id}/public 公开。
"""

from app.models.result import Result


def public_summary(r: Result) -> dict:
    """抽取可公开分享的摘要(不含 user_id / session_id)。"""
    profile = r.profile or {}
    return {
        "id": r.id,
        "assessment_type": r.assessment_type,
        "summary": r.summary,
        "percentiles": r.percentiles or {},
        "tags": profile.get("tags", []),
        "archetype": profile.get("archetype"),
    }


def compare(self_r: Result, other_r: Result) -> dict:
    """计算两人维度反差、契合度与模板结论。"""
    other = public_summary(other_r)
    self = public_summary(self_r)
    sp = self_r.percentiles or {}
    op = other_r.percentiles or {}
    keys = [k for k in sp if k in op] or list(op.keys())

    dims: list[dict] = []
    deltas: list[float] = []
    for k in keys:
        sv = float(sp.get(k, 0))
        ov = float(op.get(k, 0))
        d = round(sv - ov, 1)
        if abs(d) <= 5:
            v = "旗鼓相当"
        elif d > 0:
            v = f"你更{k}"
        else:
            v = f"对方更{k}"
        dims.append({"name": k, "self_pct": sv, "other_pct": ov, "delta": d, "verdict": v})
        deltas.append(abs(d))

    compat = 100 - round(sum(deltas) / len(deltas)) if deltas else 0
    compat = max(0, min(100, compat))
    verdict = _verdict(dims, compat)
    return {
        "self_summary": self,
        "other_summary": other,
        "dimensions": dims,
        "compatibility": compat,
        "verdict": verdict,
    }


def _verdict(dims: list[dict], compat: int) -> str:
    if not dims:
        return "数据不足,无法对比。"
    maxd = max(dims, key=lambda x: abs(x["delta"]))
    mind = min(dims, key=lambda x: abs(x["delta"]))
    return (
        f"你们在「{maxd['name']}」上反差最烈(差 {abs(maxd['delta'])} 分),"
        f"却于「{mind['name']}」最同频。契合度 {compat}%。"
    )
