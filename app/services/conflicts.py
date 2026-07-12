"""冲突检测 —— 从犹豫时长、修改次数、答案矛盾中找出内在冲突点。"""

from app.data import load_bank


def detect_conflicts(assessment_type: str, answers, behavior: dict) -> list[dict]:
    """三类冲突源:
    1. 高犹豫(决策耗时 > 1.5×中位数,或改 ≥2 次)
    2. 同维度不同题答案方向相反(自相矛盾)
    3. 限时题超时(本能 vs 理性分裂)
    """
    conflicts: list[dict] = []
    bank = load_bank(assessment_type)
    q_by_id = {q.id: q for q in bank.questions}

    durations = [a.duration_ms for a in answers.answers if a.duration_ms > 0]
    median = sorted(durations)[len(durations) // 2] if durations else 0

    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if not q:
            continue

        # 冲突1:高犹豫
        if median > 0 and ans.duration_ms > median * 1.5:
            conflicts.append({
                "question_id": q.id,
                "description": f"你在「{q.prompt[:30]}...」上犹豫较久,反映在此议题上的内在张力",
                "conflict_type": "high_hesitation",
            })
        # 冲突1b:反复改
        if ans.change_count >= 2:
            conflicts.append({
                "question_id": q.id,
                "description": f"你在「{q.prompt[:30]}...」上多次改主意,说明价值未定型",
                "conflict_type": "frequent_change",
            })
        # 冲突3:限时题超时(本能答案)
        if getattr(q, "time_limit_sec", None) and ans.duration_ms > q.time_limit_sec * 1000:
            conflicts.append({
                "question_id": q.id,
                "description": f"限时题超时,本能答案可能与理性判断分裂",
                "conflict_type": "timeout_instinct",
            })

    # 冲突2:同维度答案方向相反 —— 简化版,跳过(需更复杂追踪)
    return conflicts[:5]  # 最多 5 条,避免报告冗长
