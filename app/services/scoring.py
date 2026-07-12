"""计分引擎 —— 把答案+行为轨迹算成多维分数、匹配、冲突、洞察。

平台无关:输入纯数据,输出纯数据。HTTP/小程序/CLI 都可调。
"""

from collections import defaultdict

from app.data import load_bank
from app.models.session import AssessmentSession
from app.schemas.session import SubmitAnswersIn
from app.services.conflicts import detect_conflicts
from app.services.insights import derive_insights
from app.services.matchers import match_celebrity, match_ideology, match_value
from app.services.summary import build_summary


def _score_answers(assessment_type: str, answers: SubmitAnswersIn) -> dict[str, float]:
    """按选项 scores 映射累加 → 归一化到 0-100。"""
    bank = load_bank(assessment_type)
    raw: dict[str, float] = defaultdict(float)

    # 题号 → 题对象的快速索引
    q_by_id = {q.id: q for q in bank.questions}

    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if q is None:
            continue
        _accumulate(q, ans.answer, raw)

    # 排序题:位置越靠前权重越大(第1位满权,递减)
    # 权重系数 2.0 让排序题总影响力与量表相当(6 项排序约相当于 3 道量表)
    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if q and getattr(q, "items", None) and "order" in ans.answer:
            for idx, item_id in enumerate(ans.answer["order"]):
                weight = (1.0 - idx * 0.15) * 2.0
                item = next((i for i in q.items if i.id == item_id), None)  # type: ignore[union-attr]
                if item:
                    for dim, v in item.scores.items():
                        raw[dim] += v * weight

    # 归一化到 0-100:先按理论极值缩放,再 clip
    dims = bank.dimensions
    return {d: _normalize(raw.get(d, 0.0), assessment_type, d) for d in dims}


def _accumulate(q, answer: dict, raw: dict[str, float]) -> None:
    """量表/困境/分配题的分数累加。"""
    qtype = q.type
    if qtype == "scale" and "option_id" in answer:
        for p in q.points:
            if p.id == answer["option_id"]:
                raw.update({k: raw[k] + v for k, v in p.scores.items()})
    elif qtype == "dilemma" and "option_id" in answer:
        for opt in q.options:
            if opt.id == answer["option_id"]:
                raw.update({k: raw[k] + v for k, v in opt.scores.items()})
    elif qtype == "allocation":
        # 分配比例直接乘维度权重(比例即量化优先级)
        alloc = answer.get("allocation", {})
        for tgt in q.targets:
            pct = alloc.get(tgt.id, 0) / 100.0
            for dim, v in tgt.scores.items():
                raw[dim] += v * pct * 2  # ×2 让分配题影响力与量表相当


def _normalize(raw_score: float, assessment_type: str, dim: str) -> float:
    """把原始分线性映射到 0-100。

    粗略理论极值:每题 ±2,约 10 题 → ±20。映射 (-20, 20) → (0, 100)。
    不同测评/维度可后续细化(读 bank 里的极值表)。
    """
    span = 20.0
    score = 50.0 + (raw_score / span) * 50.0
    return round(max(0.0, min(100.0, score)), 1)


def compute_result(session: AssessmentSession, answers: SubmitAnswersIn) -> dict:
    """主入口 —— 返回可直接入 Result 表的字典。"""
    assessment_type = session.assessment_type
    dimensions = _score_answers(assessment_type, answers)

    # 行为轨迹(整段会话的)
    behavior = session.behavior_log or {}

    # 按测评类型选匹配器
    matchers = {
        "celebrity": match_celebrity,
        "value": match_value,
        "ideology": match_ideology,
    }
    matches = matchers[assessment_type](dimensions, answers, behavior)

    conflicts = detect_conflicts(assessment_type, answers, behavior)
    insights = derive_insights(answers, behavior)
    summary = build_summary(assessment_type, dimensions, matches)

    return {
        "dimensions": dimensions,
        "matches": matches,
        "conflicts": conflicts,
        "insights": insights,
        "percentiles": {},  # 上线后接入群体数据
        "summary": summary,
    }
