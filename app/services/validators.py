"""答案校验器 —— 服务端逐题校验答案合法性。

基于题库结构检查:题目归属、选项合法性、总和约束、评分范围等。
校验失败抛 ValueError(含详细原因),路由层转为 422 响应。
"""

from app.data import load_bank
from app.schemas.session import SubmitAnswersIn


def validate_answers(assessment_type: str, payload: SubmitAnswersIn) -> None:
    """校验提交的答案是否合法且完整(complete 时)。

    Raises:
        ValueError: 答案非法或缺失时的详细原因。
    """
    bank = load_bank(assessment_type)
    q_by_id = {q.id: q for q in bank.questions}

    # 检查重复 question_id
    seen_ids: set[str] = set()
    for ans in payload.answers:
        if ans.question_id in seen_ids:
            raise ValueError(f"重复提交题目: {ans.question_id}")
        seen_ids.add(ans.question_id)

        q = q_by_id.get(ans.question_id)
        if q is None:
            raise ValueError(f"题目不属于此测评: {ans.question_id}")

        _validate_single(q, ans)

    # 完整提交时检查必答题是否齐全
    if payload.complete:
        missing = set(q_by_id.keys()) - seen_ids
        if missing:
            raise ValueError(f"缺少必答题目: {sorted(missing)}")


def _validate_single(q, ans) -> None:
    """校验单题答案结构与取值范围。"""
    qtype = q.type
    answer = ans.answer

    # 行为数据基本约束
    if ans.duration_ms < 0:
        raise ValueError(f"题目 {q.id}: duration_ms 不能为负")
    if ans.change_count < 0:
        raise ValueError(f"题目 {q.id}: change_count 不能为负")

    if qtype == "scale":
        _validate_scale(q, answer)
    elif qtype == "dilemma":
        _validate_dilemma(q, answer)
    elif qtype == "allocation":
        _validate_allocation(q, answer)
    elif qtype == "sort":
        _validate_sort(q, answer)
    elif qtype == "iat":
        _validate_iat(q, answer)
    elif qtype == "slider":
        _validate_slider(q, answer)
    elif qtype == "forced_choice":
        _validate_forced_choice(q, answer)
    elif qtype == "matrix":
        _validate_matrix(q, answer)
    elif qtype == "auction":
        _validate_auction(q, answer)


def _validate_scale(q, answer: dict) -> None:
    if "option_id" not in answer:
        raise ValueError(f"量表题 {q.id}: 缺少 option_id")
    valid_ids = {p.id for p in q.points}
    if answer["option_id"] not in valid_ids:
        raise ValueError(f"量表题 {q.id}: 无效选项 {answer['option_id']}")


def _validate_dilemma(q, answer: dict) -> None:
    if "option_id" not in answer:
        raise ValueError(f"困境题 {q.id}: 缺少 option_id")
    valid_ids = {o.id for o in q.options}
    if answer["option_id"] not in valid_ids:
        raise ValueError(f"困境题 {q.id}: 无效选项 {answer['option_id']}")


def _validate_allocation(q, answer: dict) -> None:
    if "allocation" not in answer:
        raise ValueError(f"分配题 {q.id}: 缺少 allocation")
    alloc = answer["allocation"]
    valid_ids = {t.id for t in q.targets}
    for tid, val in alloc.items():
        if tid not in valid_ids:
            raise ValueError(f"分配题 {q.id}: 无效分配对象 {tid}")
        if not isinstance(val, (int, float)) or val < 0 or val > q.total:
            raise ValueError(f"分配题 {q.id}: 分配值越界 {tid}={val}")
    total = sum(alloc.values())
    if total != q.total:
        raise ValueError(f"分配题 {q.id}: 总和 {total} 须等于 {q.total}")


def _validate_sort(q, answer: dict) -> None:
    if "order" not in answer:
        raise ValueError(f"排序题 {q.id}: 缺少 order")
    order = answer["order"]
    valid_ids = {i.id for i in q.items}
    if len(order) != len(valid_ids):
        raise ValueError(f"排序题 {q.id}: 排序项数量不匹配")
    if set(order) != valid_ids:
        raise ValueError(f"排序题 {q.id}: 排序项与题目不匹配")
    if len(order) != len(set(order)):
        raise ValueError(f"排序题 {q.id}: 排序项有重复")


def _validate_iat(q, answer: dict) -> None:
    if "iat" not in answer:
        raise ValueError(f"IAT题 {q.id}: 缺少 iat 数据")
    reactions = answer["iat"]
    if not isinstance(reactions, list) or len(reactions) == 0:
        raise ValueError(f"IAT题 {q.id}: 反应数据为空")
    for r in reactions:
        if not isinstance(r, dict):
            raise ValueError(f"IAT题 {q.id}: 反应记录格式错误")
        if "response" not in r or r["response"] not in ("left", "right"):
            raise ValueError(f"IAT题 {q.id}: 无效 response")
        if "rt" not in r or not isinstance(r["rt"], (int, float)) or r["rt"] < 0:
            raise ValueError(f"IAT题 {q.id}: 无效反应时")
        if "correct" not in r or not isinstance(r["correct"], bool):
            raise ValueError(f"IAT题 {q.id}: 缺少 correct 标记")


def _validate_slider(q, answer: dict) -> None:
    if "position" not in answer:
        raise ValueError(f"滑块题 {q.id}: 缺少 position")
    pos = answer["position"]
    if not isinstance(pos, (int, float)) or pos < 0 or pos > 100:
        raise ValueError(f"滑块题 {q.id}: position 须在 0-100 范围内")


def _validate_forced_choice(q, answer: dict) -> None:
    if "choice" not in answer:
        raise ValueError(f"强迫抉择题 {q.id}: 缺少 choice")
    valid_ids = {s.id for s in q.sides}
    if answer["choice"] not in valid_ids:
        raise ValueError(f"强迫抉择题 {q.id}: 无效选项 {answer['choice']}")


def _validate_matrix(q, answer: dict) -> None:
    if "ratings" not in answer:
        raise ValueError(f"矩阵题 {q.id}: 缺少 ratings")
    ratings = answer["ratings"]
    valid_ids = {s.id for s in q.statements}
    smax = q.scale_max
    for sid, val in ratings.items():
        if sid not in valid_ids:
            raise ValueError(f"矩阵题 {q.id}: 无效陈述 {sid}")
        if not isinstance(val, int) or val < 1 or val > smax:
            raise ValueError(f"矩阵题 {q.id}: 评分 {val} 越界 (1-{smax})")
    missing = valid_ids - set(ratings.keys())
    if missing:
        raise ValueError(f"矩阵题 {q.id}: 缺少陈述评分 {sorted(missing)}")


def _validate_auction(q, answer: dict) -> None:
    if "bids" not in answer:
        raise ValueError(f"拍卖题 {q.id}: 缺少 bids")
    bids = answer["bids"]
    valid_ids = {i.id for i in q.items}
    for bid_id, val in bids.items():
        if bid_id not in valid_ids:
            raise ValueError(f"拍卖题 {q.id}: 无效竞拍项 {bid_id}")
        if not isinstance(val, (int, float)) or val < 0:
            raise ValueError(f"拍卖题 {q.id}: 出价不能为负 {bid_id}={val}")
    total = sum(bids.values())
    if total > q.budget:
        raise ValueError(f"拍卖题 {q.id}: 总出价 {total} 超过预算 {q.budget}")
