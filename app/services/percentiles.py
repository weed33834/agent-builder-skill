"""群体百分位估算 —— 模拟基线分布,把用户维度分映射到百分位。

由于尚无真实用户数据,用每镜的"理论中位人群"模拟:
- 名人镜:中位人群偏向 openness 60, neuroticism 50,其他 50
- 价值镜:中位人群道德维度普遍在 55-65(社会期望偏差)
- 意识镜:中位人群普遍在 50 附近(温和)

每个维度假设标准差 15,用正态分布 CDF 算百分位。
"""

import math

# 各测评的中位人群基线(均值,标准差)
_BASELINES = {
    "celebrity": {
        "openness": (60, 15), "conscientiousness": (50, 15), "extraversion": (50, 15),
        "agreeableness": (55, 15), "neuroticism": (50, 18), "risk_taking": (40, 18),
        "idealism": (55, 18),
    },
    "value": {
        "honesty": (62, 15), "altruism": (58, 15), "justice": (60, 15),
        "duty": (60, 15), "empathy": (60, 15), "discipline": (55, 15),
    },
    "ideology": {
        "econ_left": (50, 18), "econ_right": (50, 18), "authority": (50, 18),
        "liberty": (50, 18), "tradition": (50, 18), "progress": (50, 18),
        "nationalist": (50, 18), "globalist": (50, 18),
    },
}


def _normal_cdf(x: float, mean: float, std: float) -> float:
    """正态分布 CDF(近似计算)。"""
    z = (x - mean) / (std * math.sqrt(2))
    return 0.5 * (1 + math.erf(z))


def estimate_percentiles(assessment_type: str, dimensions: dict) -> dict[str, float]:
    """把用户维度分映射到群体百分位(0-100)。

    百分位含义:你比 X% 的人在此维度上得分更高。
    50 = 中位,90 = 极高,10 = 极低。
    """
    baseline = _BASELINES.get(assessment_type, {})
    out: dict[str, float] = {}
    for dim, score in dimensions.items():
        if dim in baseline:
            mean, std = baseline[dim]
            pct = _normal_cdf(score, mean, std) * 100
            out[dim] = round(max(1, min(99, pct)), 1)
        else:
            out[dim] = 50.0
    return out
