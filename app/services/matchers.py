"""匹配器 —— 把维度分数映射到名人/价值观等级/意识形态标签。

三类测评各一个 matcher,统一返回 [{id,name,match_pct,blurb}]。
"""

import math
from pathlib import Path

import yaml

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# 内置名人库(简版,可后续扩充)
_CELEBRITIES = [
    {"id": "lincoln", "name": "林肯", "blurb": "坚定原则,愿为理想承担代价", "dims": {"idealism": 90, "risk_taking": 80, "conscientiousness": 85, "agreeableness": 60, "openness": 60, "extraversion": 50, "neuroticism": 40}},
    {"id": "curie", "name": "居里夫人", "blurb": "理想主义与执着并存,不谋私利", "dims": {"idealism": 90, "openness": 95, "conscientiousness": 90, "agreeableness": 55, "extraversion": 30, "risk_taking": 60, "neuroticism": 50}},
    {"id": "schindler", "name": "辛德勒", "blurb": "关键时刻选择救人,愿冒险担责", "dims": {"idealism": 85, "risk_taking": 90, "agreeableness": 75, "conscientiousness": 60, "openness": 60, "extraversion": 70, "neuroticism": 60}},
    {"id": "confucius", "name": "孔子", "blurb": "重责任与秩序,坚守道德准则", "dims": {"idealism": 80, "conscientiousness": 90, "agreeableness": 70, "openness": 60, "extraversion": 60, "risk_taking": 30, "neuroticism": 40}},
    {"id": "darwin", "name": "达尔文", "blurb": "开放探索,审慎求证,内向深思", "dims": {"openness": 95, "conscientiousness": 85, "idealism": 50, "agreeableness": 60, "extraversion": 25, "risk_taking": 40, "neuroticism": 65}},
    {"id": "machiavelli", "name": "马基雅维利", "blurb": "务实冷峻,结果导向,不计理想", "dims": {"idealism": 20, "risk_taking": 70, "conscientiousness": 70, "agreeableness": 25, "openness": 75, "extraversion": 55, "neuroticism": 50}},
    {"id": "gandhi", "name": "甘地", "blurb": "极致利他+非暴力,理想至上", "dims": {"idealism": 95, "agreeableness": 90, "conscientiousness": 85, "openness": 65, "extraversion": 65, "risk_taking": 75, "neuroticism": 45}},
    {"id": "tesla", "name": "特斯拉", "blurb": "纯粹探索者,开放性极高,不善社交", "dims": {"openness": 98, "conscientiousness": 80, "idealism": 75, "agreeableness": 50, "extraversion": 15, "risk_taking": 55, "neuroticism": 70}},
]

# 意识形态库(经济轴 0左-100右,社会轴 0自由-100权威)
_IDEOLOGIES = [
    {"id": "soc_dem", "name": "社会民主主义", "blurb": "市场+福利,渐进改良", "coords": {"econ": 30, "social": 35}},
    {"id": "lib_dem", "name": "自由民主主义", "blurb": "市场经济+个人自由", "coords": {"econ": 65, "social": 30}},
    {"id": "conservatism", "name": "保守主义", "blurb": "传统价值+秩序", "coords": {"econ": 60, "social": 75}},
    {"id": "libertarian", "name": "自由意志主义", "blurb": "最小政府,最大自由", "coords": {"econ": 85, "social": 15}},
    {"id": "dem_socialism", "name": "民主社会主义", "blurb": "生产资料社会化+民主", "coords": {"econ": 15, "social": 40}},
    {"id": "author_cap", "name": "权威资本主义", "blurb": "自由市场+强国家", "coords": {"econ": 70, "social": 85}},
    {"id": "nat_conservatism", "name": "民族保守主义", "blurb": "民族优先+传统秩序", "coords": {"econ": 55, "social": 80}},
    {"id": "progressivism", "name": "进步主义", "blurb": "平等+进步+全球合作", "coords": {"econ": 35, "social": 20}},
]


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    """余弦相似度 → 0-1。"""
    keys = set(a) & set(b)
    if not keys:
        return 0.0
    dot = sum(a[k] * b[k] for k in keys)
    na = math.sqrt(sum(a[k] ** 2 for k in keys))
    nb = math.sqrt(sum(b[k] ** 2 for k in keys))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def match_celebrity(dimensions: dict, answers, behavior) -> list[dict]:
    """与名人库算余弦距离 → Top3。"""
    scored = [
        {**c, "match_pct": round(_cosine(dimensions, c["dims"]) * 100, 1)}
        for c in _CELEBRITIES
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


def match_ideology(dimensions: dict, answers, behavior) -> list[dict]:
    """意识镜匹配 —— 经济轴+社会轴二维定位 → 最近 Top3。"""
    # 经济轴:econ_right - econ_left(正值偏右)
    econ = 50 + (dimensions.get("econ_right", 50) - dimensions.get("econ_left", 50)) / 2
    # 社会轴:authority - liberty(正值偏权威)
    social = 50 + (dimensions.get("authority", 50) - dimensions.get("liberty", 50)) / 2
    # 修正:globalist/nationalist 也算社会轴
    social = (social + 50 + (dimensions.get("nationalist", 50) - dimensions.get("globalist", 50)) / 2) / 2

    scored = []
    for ideo in _IDEOLOGIES:
        dx = econ - ideo["coords"]["econ"]
        dy = social - ideo["coords"]["social"]
        dist = math.sqrt(dx * dx + dy * dy)
        # 距离 → 相似度:最大距离约 sqrt(10000+10000)=141,映射到 0-1
        sim = max(0.0, 1 - dist / 141.0)
        scored.append({**ideo, "match_pct": round(sim * 100, 1), "coords": {"econ": round(econ, 1), "social": round(social, 1)}})
    scored.sort(key=lambda x: x["match_pct"], reverse=True)
    return [{"id": i["id"], "name": i["name"], "match_pct": i["match_pct"], "blurb": f"{i['blurb']} (经济{i['coords']['econ']:.0f}/社会{i['coords']['social']:.0f})"} for i in scored[:3]]
