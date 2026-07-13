"""计分引擎 v2 —— 行为加权 + 矛盾追踪 + 归一化到 0-100。

平台无关:输入纯数据,输出纯数据。HTTP/小程序/CLI 都可调。

v2 升级:
- 行为加权:耗时适中(3-15s)的答案权重 1.0;过快(<1s,随意)与超时(本能)权重 0.7
- 改主意惩罚:change_count ≥2 的答案权重 0.8(价值未定型,信号弱)
- 排序题权重非线性递减
- 归一化分维度按理论极值(量表/困境/分配各算)
"""

import statistics
from collections import defaultdict

from app.data import load_bank
from app.models.session import AssessmentSession
from app.schemas.session import SubmitAnswersIn
from app.services.conflicts import detect_conflicts
from app.services.insights import derive_insights
from app.services.matchers import match_celebrity, match_ideology, match_value
from app.services.percentiles import estimate_percentiles
from app.services.summary import build_summary


def _answer_weight(ans) -> float:
    """根据行为轨迹给答案加权。

    - 耗时 1-3s:0.85(偏快,可能未深思)
    - 耗时 3-15s:1.0(理想区间)
    - 耗时 >15s 或超时:0.75(本能或纠结)
    - 改主意 ≥2:×0.85(价值未定型)
    """
    w = 1.0
    ms = ans.duration_ms
    if ms < 1000:
        w *= 0.7  # 极速,几乎随意
    elif ms < 3000:
        w *= 0.85
    elif ms > 15000:
        w *= 0.75
    if ans.change_count >= 2:
        w *= 0.85
    return w


def _score_answers(assessment_type: str, answers: SubmitAnswersIn) -> dict[str, float]:
    """按选项 scores 映射 + 行为加权 → 归一化到 0-100。"""
    bank = load_bank(assessment_type)
    raw: dict[str, float] = defaultdict(float)
    weight_sum: dict[str, float] = defaultdict(float)  # 每维度累计权重(用于归一化)
    q_by_id = {q.id: q for q in bank.questions}

    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if q is None:
            continue
        w = _answer_weight(ans)
        _accumulate(q, ans.answer, raw, weight_sum, w)

    # 排序题:位置越靠前权重越大,递减系数 0.15
    # 注意:auction 题也有 items 属性,必须用 type 明确判断,不能用 getattr(q,"items")
    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if q and q.type == "sort" and "order" in ans.answer:
            w = _answer_weight(ans)
            for idx, item_id in enumerate(ans.answer["order"]):
                weight = (1.0 - idx * 0.15) * 2.0 * w
                item = next((i for i in q.items if i.id == item_id), None)  # type: ignore[union-attr]
                if item:
                    for dim, v in item.scores.items():
                        raw[dim] += v * weight
                        weight_sum[dim] += abs(v) * weight

    # 归一化:按各维度累计权重动态调整 span,避免题量不均导致极值偏移
    dims = bank.dimensions
    return {d: _normalize(raw.get(d, 0.0), weight_sum.get(d, 1.0)) for d in dims}


def _accumulate(q, answer: dict, raw: dict[str, float], weight_sum: dict[str, float], w: float) -> None:
    """各题型分数累加(带行为权重)。"""
    qtype = q.type
    if qtype == "scale" and "option_id" in answer:
        for p in q.points:
            if p.id == answer["option_id"]:
                for k, v in p.scores.items():
                    raw[k] += v * w
                    weight_sum[k] += abs(v) * w
    elif qtype == "dilemma" and "option_id" in answer:
        for opt in q.options:
            if opt.id == answer["option_id"]:
                for k, v in opt.scores.items():
                    raw[k] += v * w
                    weight_sum[k] += abs(v) * w
    elif qtype == "allocation":
        alloc = answer.get("allocation", {})
        for tgt in q.targets:
            pct = alloc.get(tgt.id, 0) / 100.0
            for dim, v in tgt.scores.items():
                raw[dim] += v * pct * 2 * w
                weight_sum[dim] += abs(v) * pct * 2 * w
    elif qtype == "slider" and "position" in answer:
        # 连续滑块:position 0-100 线性插值 low→high
        pos = max(0.0, min(100.0, float(answer["position"]))) / 100.0
        for dim, bounds in q.scores.items():
            low = bounds.get("low", 0.0)
            high = bounds.get("high", 0.0)
            v = low + (high - low) * pos
            raw[dim] += v * w
            weight_sum[dim] += max(abs(low), abs(high)) * w
    elif qtype == "forced_choice" and "choice" in answer:
        # 强迫二选一:选中侧全分(无妥协)
        for side in q.sides:
            if side.id == answer["choice"]:
                for k, v in side.scores.items():
                    raw[k] += v * w * 1.5  # 强迫选择信号强,加权 1.5
                    weight_sum[k] += abs(v) * w * 1.5
    elif qtype == "matrix" and "ratings" in answer:
        # 同意度矩阵:rating 1-7 映射到 -3..+3,乘以陈述的权重因子
        ratings = answer["ratings"]
        smax = max(4, q.scale_max)
        for stmt in q.statements:
            r = ratings.get(stmt.id)
            if r is None:
                continue
            # 归一化到 -1..1:(r - 中点) / 半幅
            mid = (smax + 1) / 2
            norm = (r - mid) / ((smax - 1) / 2)
            for dim, factor in stmt.scores.items():
                v = norm * factor
                raw[dim] += v * w
                weight_sum[dim] += abs(factor) * w
    elif qtype == "auction" and "bids" in answer:
        # 价值观拍卖:出价比例映射(预算可省,测绝对价值)
        budget = q.budget
        bids = answer["bids"]
        for item in q.items:
            bid = bids.get(item.id, 0)
            ratio = max(0.0, bid) / budget  # 0..1
            for dim, v in item.scores.items():
                raw[dim] += v * ratio * 2 * w
                weight_sum[dim] += abs(v) * ratio * 2 * w


def _normalize(raw_score: float, total_weight: float) -> float:
    """归一化到 0-100。

    动态 span:累计权重的 1/3 作为半幅(约对应中等强度答题)。
    这样题量多/少都能合理映射,不会因题量翻倍而全部接近 0/100。
    """
    span = max(8.0, total_weight / 3.0)  # 至少 8,避免过度敏感
    score = 50.0 + (raw_score / span) * 50.0
    return round(max(0.0, min(100.0, score)), 1)


def compute_result(session: AssessmentSession, answers: SubmitAnswersIn) -> dict:
    """主入口 —— 返回可直接入 Result 表的字典。

    输出字段:
    - dimensions: 各维度 0-100 分
    - matches: 匹配的名人/价值等级/意识形态 Top3
    - conflicts: 内在冲突列表
    - insights: 行为洞察(决策风格/时间压力/一致性/IAT 偏差/勇气指数/纠结度)
    - percentiles: 群体百分位(模拟基线)
    - summary: 一句话结论
    - profile: 综合画像标签(新增)
    """
    assessment_type = session.assessment_type
    dimensions = _score_answers(assessment_type, answers)

    behavior = session.behavior_log or {}

    matchers = {
        "celebrity": match_celebrity,
        "value": match_value,
        "ideology": match_ideology,
    }
    matches = matchers[assessment_type](dimensions, answers, behavior)

    conflicts = detect_conflicts(assessment_type, answers, behavior)
    insights = derive_insights(answers, behavior)
    percentiles = estimate_percentiles(assessment_type, dimensions)
    summary = build_summary(assessment_type, dimensions, matches)
    profile = _build_profile(assessment_type, dimensions, insights)

    return {
        "dimensions": dimensions,
        "matches": matches,
        "conflicts": conflicts,
        "insights": insights,
        "percentiles": percentiles,
        "summary": summary,
        "profile": profile,
    }


def _build_profile(assessment_type: str, dimensions: dict, insights: dict) -> dict:
    """生成综合画像标签 —— 3-5 个关键词,用于报告顶部与历史摘要。

    每镜有不同的标签维度,从高分维度与行为风格提取。
    """
    profile: list[str] = []

    # 行为风格标签(所有镜共用)
    style = insights.get("decision_style", {}).get("label", "")
    if style == "直觉型":
        profile.append("直觉驱动")
    elif style == "深思型":
        profile.append("审慎深思")
    else:
        profile.append("平衡决策")

    consistency = insights.get("consistency", {}).get("label", "")
    if consistency == "低":
        profile.append("价值流动")
    elif consistency == "高":
        profile.append("立场坚定")

    # 按镜加维度标签
    if assessment_type == "celebrity":
        top_dims = sorted(dimensions.items(), key=lambda x: abs(x[1] - 50), reverse=True)[:3]
        label_map = {
            "openness": "开放探索", "conscientiousness": "尽责自律", "extraversion": "外向主动",
            "agreeableness": "温和利他", "neuroticism": "敏感深邃", "risk_taking": "冒险敢为",
            "idealism": "理想主义",
        }
        for k, v in top_dims:
            if v >= 60:
                profile.append(label_map.get(k, k))
            elif v <= 40:
                # 低分也有标签
                low_map = {
                    "openness": "务实保守", "conscientiousness": "灵活随性", "extraversion": "内敛沉静",
                    "agreeableness": "独立冷峻", "neuroticism": "情绪稳定", "risk_taking": "谨慎稳重",
                    "idealism": "现实务实",
                }
                profile.append(low_map.get(k, k))

    elif assessment_type == "value":
        # 道德水平
        moral_dims = ["honesty", "altruism", "justice", "duty", "empathy", "discipline"]
        moral = sum(dimensions.get(d, 50) for d in moral_dims) / 6
        if moral >= 85:
            profile.append("理想主义者")
        elif moral >= 70:
            profile.append("端方君子")
        elif moral >= 55:
            profile.append("守正之人")
        elif moral >= 40:
            profile.append("务实者")
        else:
            profile.append("失序灵魂")
        # 主导价值
        top = max(moral_dims, key=lambda d: dimensions.get(d, 0))
        type_map = {
            "honesty": "诚实至上", "altruism": "利他之心", "justice": "公正守护",
            "duty": "责任担当", "empathy": "共情体察", "discipline": "自律节制",
        }
        profile.append(type_map.get(top, top))

    elif assessment_type == "ideology":
        # 政治坐标标签
        econ = 50 + (dimensions.get("econ_right", 50) - dimensions.get("econ_left", 50)) / 2
        social = 50 + (dimensions.get("authority", 50) - dimensions.get("liberty", 50)) / 2
        if econ < 35:
            profile.append("经济左倾")
        elif econ > 65:
            profile.append("经济右倾")
        else:
            profile.append("经济中道")
        if social < 35:
            profile.append("自由至上")
        elif social > 65:
            profile.append("秩序优先")
        else:
            profile.append("社会温和")
        # 传统vs进步
        trad = dimensions.get("tradition", 50)
        prog = dimensions.get("progress", 50)
        if prog - trad > 15:
            profile.append("进步派")
        elif trad - prog > 15:
            profile.append("传统派")

    # 去重保序,最多 5 个
    seen = set()
    unique = []
    for p in profile:
        if p not in seen:
            seen.add(p)
            unique.append(p)
        if len(unique) >= 5:
            break
    return {"tags": unique}
