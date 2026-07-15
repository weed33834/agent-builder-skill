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
    """按选项 scores 映射 + 行为加权 → 归一化到 0-100。

    归一化策略 v3:对每个维度,先计算"该维度所有题的分数理论上下限"
    (即所有题都选最强正向 / 最强负向时的累计分),再用线性映射
    raw → [min, max] ⇒ [0, 100]。这根治"题库 scores 全正"导致
    所有人都 90+ 的极值偏移问题。
    """
    bank = load_bank(assessment_type)
    raw: dict[str, float] = defaultdict(float)
    weight_sum: dict[str, float] = defaultdict(float)
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

    # 计算每个维度的理论上下限(用题库静态结构,与作答无关)
    dim_bounds = _compute_dim_bounds(bank)
    dims = bank.dimensions
    return {d: _normalize(raw.get(d, 0.0), dim_bounds.get(d, (-1.0, 1.0))) for d in dims}


def _compute_dim_bounds(bank) -> dict[str, tuple[float, float]]:
    """对每个维度,计算所有题在该维度上可能的最小/最大累计分。

    用于归一化:raw ∈ [min, max] 线性映射到 [0, 100]。
    若某维度在题库中无任何题涉及,min=max=0 → 退化为 50(中性)。
    """
    mins: dict[str, float] = defaultdict(float)
    maxs: dict[str, float] = defaultdict(float)

    for q in bank.questions:
        # 每题对该维度可能的贡献范围
        contribs_by_dim: dict[str, list[float]] = defaultdict(list)
        qtype = q.type

        if qtype == "scale":
            for p in q.points:
                for dim, v in p.scores.items():
                    contribs_by_dim[dim].append(v * 1.0)
        elif qtype == "dilemma":
            for opt in q.options:
                for dim, v in opt.scores.items():
                    contribs_by_dim[dim].append(v * 1.0)
        elif qtype == "allocation":
            # 分配题:每个 target 可分配 0-100% → 贡献 = score × (pct/100) × 2
            # 单 target 最大贡献 = score × 2;最小 = 0
            for tgt in q.targets:
                for dim, v in tgt.scores.items():
                    contribs_by_dim[dim].extend([0.0, v * 2.0])
        elif qtype == "slider":
            # 滑块:low(端点0)或 high(端点100)
            for dim, bounds in q.scores.items():
                low = bounds.get("low", 0.0)
                high = bounds.get("high", 0.0)
                contribs_by_dim[dim].extend([low, high])
        elif qtype == "forced_choice":
            for side in q.sides:
                for dim, v in side.scores.items():
                    contribs_by_dim[dim].append(v * 1.5)  # 强迫选择 ×1.5
        elif qtype == "matrix":
            for stmt in q.statements:
                for dim, factor in stmt.scores.items():
                    # rating=1 → -factor;rating=7 → +factor
                    contribs_by_dim[dim].extend([-factor, factor])
        elif qtype == "auction":
            budget = getattr(q, "budget", 100)
            for item in q.items:
                for dim, v in item.scores.items():
                    # 0 出价或全预算 → 0 或 v×2
                    contribs_by_dim[dim].extend([0.0, v * 2.0])
        elif qtype == "sort":
            # 排序题:每道 sort 题对某维度的总贡献 = Σ(item.score × pos_weight)
            # 理论最大 = 把高分 item 排最前;理论最小 = 反过来排
            # 这里简化:对每个 dim,收集所有 item 的 (score, weight_i) 组合,
            # 最大贡献 = sort by score desc × sort by weight desc (rearrangement inequality)
            # 最小贡献 = sort by score asc × sort by weight desc
            items = getattr(q, "items", [])
            n = len(items)
            weights = [(1.0 - i * 0.15) * 2.0 for i in range(n)]
            # 按 dim 聚合 items
            dim_items: dict[str, list[float]] = defaultdict(list)
            for item in items:
                for dim, v in item.scores.items():
                    dim_items[dim].append(v)
            for dim, scores in dim_items.items():
                if len(scores) == len(weights):
                    # 排序不等式:同序乘积和最大,反序最小
                    s_sorted = sorted(scores, reverse=True)
                    w_sorted = sorted(weights, reverse=True)
                    mx = sum(s * w for s, w in zip(s_sorted, w_sorted))
                    mn = sum(s * w for s, w in zip(reversed(s_sorted), w_sorted))
                    contribs_by_dim[dim].extend([mn, mx])

        # 累加到全题库的 min/max
        for dim, vals in contribs_by_dim.items():
            if vals:
                mins[dim] += min(vals)
                maxs[dim] += max(vals)

    out = {}
    all_dims = getattr(bank, "dimensions", [])
    for d in all_dims:
        lo, hi = mins.get(d, 0.0), maxs.get(d, 0.0)
        if lo == hi:
            # 该维度无信号 → 50(中性)
            out[d] = (0.0, 0.0)
        else:
            out[d] = (lo, hi)
    return out


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


def _normalize(raw_score: float, bounds: tuple[float, float]) -> float:
    """归一化到 0-100。

    用该维度在题库中的理论 [min, max] 作线性映射:
        score = (raw - min) / (max - min) × 100
    这根治"题库 scores 全正"导致所有人都 90+ 的极值偏移:
    若某维度最强正向 = +30,最强负向 = -10,中位(0) → 75 而非 100。
    若该维度无信号(min==max),退化为 50(中性)。
    """
    lo, hi = bounds
    if hi <= lo:
        return 50.0
    score = (raw_score - lo) / (hi - lo) * 100.0
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
    insights = derive_insights(assessment_type, answers, behavior)
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
