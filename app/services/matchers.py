"""匹配器 —— 把维度分数映射到名人/价值观等级/意识形态标签。

三类测评各一个 matcher,统一返回 [{id,name,match_pct,blurb}]。
名人库与意识形态库走 YAML 数据驱动(与题库一致)。
"""

import math
from functools import lru_cache
from pathlib import Path

import yaml

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


@lru_cache
def _load_celebrities() -> list[dict]:
    """名人库 —— data/figures/celebrity.yaml"""
    path = DATA_DIR / "figures" / "celebrity.yaml"
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8")) or []


@lru_cache
def _load_ideologies() -> list[dict]:
    """意识形态库 —— data/ideologies/ideology.yaml"""
    path = DATA_DIR / "ideologies" / "ideology.yaml"
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8")) or []


def _match_pct_by_distance(user: dict[str, float], ref: dict[str, float], max_dist: float) -> float:
    """归一化欧氏距离 → 匹配度%。

    距离 0 = 100% 匹配;距离 ≥ max_dist = 0%。
    比余弦相似度更敏感于绝对差异,避免"所有人都 90%+"。
    """
    keys = set(user) & set(ref)
    if not keys:
        return 0.0
    dist = math.sqrt(sum((user[k] - ref[k]) ** 2 for k in keys))
    # 理论最大距离:维度数 × 100(全 0 vs 全 100)
    max_theory = math.sqrt(len(keys)) * 100.0
    sim = max(0.0, 1 - dist / max_theory)
    return round(sim * 100, 1)


def match_celebrity(dimensions: dict, answers, behavior) -> list[dict]:
    """与名人库算归一化距离 → Top3。"""
    celebrities = _load_celebrities()
    if not celebrities:
        return []
    scored = [
        {**c, "match_pct": _match_pct_by_distance(dimensions, c["dims"], 100.0)}
        for c in celebrities
    ]
    scored.sort(key=lambda x: x["match_pct"], reverse=True)
    return [{"id": c["id"], "name": c["name"], "match_pct": c["match_pct"], "blurb": c["blurb"]} for c in scored[:3]]


def match_value(dimensions: dict, answers, behavior) -> list[dict]:
    """价值镜匹配 —— 输出道德水平等级 + 价值类型。

    道德分 = (honesty+altruism+justice+duty+empathy+discipline) / 6
    分级:<40 失序,40-55 务实,55-70 守正,70-85 端方,>85 圣徒
    """
    moral = sum(dimensions.get(d, 50) for d in ["honesty", "altruism", "justice", "duty", "empathy", "discipline"]) / 6
    if moral < 40:
        tier, blurb = "失序型", "价值优先级混乱,常因情境放弃原则"
    elif moral < 55:
        tier, blurb = "务实型", "理解道德准则,但实操会权衡得失"
    elif moral < 70:
        tier, blurb = "守正型", "多数情况守原则,关键时刻也稳得住"
    elif moral < 85:
        tier, blurb = "端方型", "道德准则清晰且稳定,少有例外"
    else:
        tier, blurb = "理想型", "原则高于一切,常愿为此付代价"

    # 主导价值类型 —— 分数最高的维度
    dominant = max(dimensions, key=lambda d: dimensions.get(d, 0))
    type_map = {
        "honesty": "诚实至上者", "altruism": "利他主义者", "justice": "公正守护者",
        "duty": "责任承担者", "empathy": "共情型", "discipline": "自律型",
    }
    return [
        {"id": "moral_tier", "name": f"道德水平:{tier}", "match_pct": round(moral, 1), "blurb": blurb},
        {"id": "value_type", "name": f"价值类型:{type_map.get(dominant, '多元')}", "match_pct": round(dimensions.get(dominant, 50), 1), "blurb": f"主导价值维度:{dominant}"},
    ]


def ideology_axes(dimensions: dict) -> tuple[float, float]:
    """意识镜政治坐标 —— 经济轴 + 社会轴。

    经济轴:econ_right - econ_left(正值偏右)
    社会轴:(authority-liberty 轴 + nationalist-globalist 轴) / 2(修正)

    注意:三处(matchers/summary/scoring)必须共用此函数,避免同一报告内
    匹配结果与文字结论/标签用不同坐标而自相矛盾。
    """
    econ = 50 + (dimensions.get("econ_right", 50) - dimensions.get("econ_left", 50)) / 2
    social_auth = 50 + (dimensions.get("authority", 50) - dimensions.get("liberty", 50)) / 2
    social_nat = 50 + (dimensions.get("nationalist", 50) - dimensions.get("globalist", 50)) / 2
    social = (social_auth + social_nat) / 2
    return econ, social


def match_ideology(dimensions: dict, answers, behavior) -> list[dict]:
    """意识镜匹配 —— 经济轴+社会轴二维定位 → 最近 Top3。"""
    econ, social = ideology_axes(dimensions)

    ideologies = _load_ideologies()
    if not ideologies:
        return []

    scored = []
    for ideo in ideologies:
        dx = econ - ideo["coords"]["econ"]
        dy = social - ideo["coords"]["social"]
        dist = math.sqrt(dx * dx + dy * dy)
        # 距离 → 相似度:最大距离约 sqrt(10000+10000)=141,映射到 0-1
        sim = max(0.0, 1 - dist / 141.0)
        scored.append({**ideo, "match_pct": round(sim * 100, 1), "coords": {"econ": round(econ, 1), "social": round(social, 1)}})
    scored.sort(key=lambda x: x["match_pct"], reverse=True)
    return [{"id": i["id"], "name": i["name"], "match_pct": i["match_pct"], "blurb": f"{i['blurb']} (经济{i['coords']['econ']:.0f}/社会{i['coords']['social']:.0f})"} for i in scored[:3]]
