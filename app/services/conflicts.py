"""冲突检测 v2 —— 犹豫时长 + 修改次数 + 同维度矛盾 + 限时超时 + IAT 偏差。

新增:
- 同维度答案方向相反检测(真正能发现"言行不一")
- 冲突严重度评分(1-3)
- IAT 与量表答案方向是否一致(内隐vs外显分裂)
"""

from collections import defaultdict

from app.data import load_bank


def detect_conflicts(assessment_type: str, answers, behavior: dict) -> list[dict]:
    """四类冲突源 + 严重度评分,最多 7 条。

    阈值收紧 v2:解决随机作答也撞顶 7/7 的问题。
    - 高犹豫阈值 1.8× → 2.5×(且只取严重度≥2 的,过滤掉 severity=1 噪音)
    - 反复改阈值 2 → 3(改 2 次属正常斟酌)
    - dimension_contradiction 阈值 15% → 35%
    - 同一题最多触发 1 条冲突(取严重度最高)
    """
    conflicts: list[dict] = []
    bank = load_bank(assessment_type)
    q_by_id = {q.id: q for q in bank.questions}

    durations = [a.duration_ms for a in answers.answers if a.duration_ms > 0]
    median = sorted(durations)[len(durations) // 2] if durations else 0

    # 每题最多保留 1 条冲突(取严重度最高),避免单题刷屏
    per_q_best: dict[str, dict] = {}
    dim_directions: dict[str, list[tuple[str, float]]] = defaultdict(list)

    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if not q:
            continue

        # 冲突1:高犹豫(收紧到 2.5×中位数,且需要 severity≥2)
        if median > 0 and ans.duration_ms > median * 2.5:
            sev = 3 if ans.duration_ms > median * 4 else 2
            cand = {
                "question_id": q.id,
                "description": f"在「{q.prompt[:28]}...」上犹豫较久,此处存在内在张力",
                "conflict_type": "high_hesitation",
                "severity": sev,
            }
            if q.id not in per_q_best or cand["severity"] > per_q_best[q.id]["severity"]:
                per_q_best[q.id] = cand
        # 冲突1b:反复改(改 3 次以上才算)
        if ans.change_count >= 3:
            cand = {
                "question_id": q.id,
                "description": f"在「{q.prompt[:28]}...」上多次改主意,价值未定型",
                "conflict_type": "frequent_change",
                "severity": 3 if ans.change_count >= 4 else 2,
            }
            if q.id not in per_q_best or cand["severity"] > per_q_best[q.id]["severity"]:
                per_q_best[q.id] = cand
        # 冲突3:限时题超时(本能答案)
        if getattr(q, "time_limit_sec", None) and ans.duration_ms > q.time_limit_sec * 1000:
            cand = {
                "question_id": q.id,
                "description": f"限时题超时作答,本能反应可能与理性判断分裂",
                "conflict_type": "timeout_instinct",
                "severity": 2,
            }
            if q.id not in per_q_best or cand["severity"] > per_q_best[q.id]["severity"]:
                per_q_best[q.id] = cand

        _collect_directions(q, ans.answer, dim_directions)

    conflicts.extend(per_q_best.values())

    # 冲突2:同维度方向相反 —— 真正的"言行不一"
    conflicts.extend(_detect_dimension_conflicts(dim_directions, q_by_id))

    # 冲突4:IAT 与量表方向不一致(内隐vs外显分裂)
    conflicts.extend(_detect_iat_conflicts(answers, q_by_id))

    # 去重(同 question_id 取最高严重度),按严重度排序,取前 5
    seen: dict[str, dict] = {}
    for c in conflicts:
        qid = c.get("question_id", "")
        if qid not in seen or c.get("severity", 1) > seen[qid].get("severity", 1):
            seen[qid] = c
    out = sorted(seen.values(), key=lambda c: c.get("severity", 1), reverse=True)
    return out[:5]


def _collect_directions(q, answer: dict, dim_directions: dict) -> None:
    """收集每题对每个维度的贡献方向(正/负)。"""
    qtype = q.type
    if qtype == "scale" and "option_id" in answer:
        for p in getattr(q, "points", []):
            if p.id == answer["option_id"]:
                for k, v in p.scores.items():
                    dim_directions[k].append((q.id, v))
    elif qtype == "dilemma" and "option_id" in answer:
        for opt in getattr(q, "options", []):
            if opt.id == answer["option_id"]:
                for k, v in opt.scores.items():
                    dim_directions[k].append((q.id, v))
    elif qtype == "forced_choice" and "choice" in answer:
        for side in getattr(q, "sides", []):
            if side.id == answer["choice"]:
                for k, v in side.scores.items():
                    dim_directions[k].append((q.id, v))
    elif qtype == "slider" and "position" in answer:
        pos = max(0.0, min(100.0, float(answer["position"]))) / 100.0
        for dim, bounds in getattr(q, "scores", {}).items():
            low = bounds.get("low", 0.0)
            high = bounds.get("high", 0.0)
            v = low + (high - low) * pos
            dim_directions[dim].append((q.id, v))
    elif qtype == "matrix" and "ratings" in answer:
        ratings = answer["ratings"]
        smax = max(4, getattr(q, "scale_max", 7))
        for stmt in getattr(q, "statements", []):
            r = ratings.get(stmt.id)
            if r is None:
                continue
            mid = (smax + 1) / 2
            norm = (r - mid) / ((smax - 1) / 2)
            for dim, factor in stmt.scores.items():
                dim_directions[dim].append((q.id, norm * factor))
    elif qtype == "auction" and "bids" in answer:
        budget = getattr(q, "budget", 100)
        for item in getattr(q, "items", []):
            bid = answer["bids"].get(item.id, 0)
            ratio = max(0.0, bid) / budget
            for dim, v in item.scores.items():
                dim_directions[dim].append((q.id, v * ratio))
    elif qtype == "allocation" and "allocation" in answer:
        alloc = answer["allocation"]
        for tgt in getattr(q, "targets", []):
            pct = alloc.get(tgt.id, 0) / 100.0
            for dim, v in tgt.scores.items():
                dim_directions[dim].append((q.id, v * pct))
    elif qtype == "sort" and "order" in answer:
        # 排序题:位置越靠前贡献越大(方向 = 分值 × 位置权重)
        order = answer["order"]
        for idx, item_id in enumerate(order):
            weight = 1.0 - idx * 0.15
            item = next((i for i in getattr(q, "items", []) if i.id == item_id), None)
            if item:
                for dim, v in item.scores.items():
                    dim_directions[dim].append((q.id, v * weight))


def _detect_dimension_conflicts(dim_directions: dict, q_by_id: dict) -> list[dict]:
    """检测同维度方向相反的题对。

    用相对阈值过滤连续题型的中性值:只取方向强度 > 35% 最大值的,
    避免 slider/allocation 在中位附近被误判为"方向"。
    阈值从 15% → 35%:解决随机作答也大量触发的问题。
    """
    out = []
    for dim, items in dim_directions.items():
        if len(items) < 2:
            continue
        max_abs = max(abs(v) for _, v in items) if items else 0
        if max_abs == 0:
            continue
        threshold = max_abs * 0.35
        positives = [(qid, v) for qid, v in items if v > threshold]
        negatives = [(qid, v) for qid, v in items if v < -threshold]
        if positives and negatives:
            # 取差异最大的一对
            pos_q, pos_v = max(positives, key=lambda x: x[1])
            neg_q, neg_v = min(negatives, key=lambda x: x[1])
            q1 = q_by_id.get(pos_q)
            q2 = q_by_id.get(neg_q)
            if q1 and q2:
                out.append({
                    "question_id": f"{pos_q}+{neg_q}",
                    "description": f"在「{dim}」维度上,你在不同题中给出方向相反的答案——「{q1.prompt[:18]}」与「{q2.prompt[:18]}」,反映内在未解的张力",
                    "conflict_type": "dimension_contradiction",
                    "severity": 3,
                })
    return out[:2]  # 最多 2 条维度矛盾(从 3 降到 2)


def _detect_iat_conflicts(answers, q_by_id: dict) -> list[dict]:
    """检测 IAT 反应时与量表答案的方向是否一致。"""
    out = []
    # 收集 IAT 题与对应维度
    iat_results = []
    for ans in answers.answers:
        q = q_by_id.get(ans.question_id)
        if q and q.type == "iat" and "iat" in ans.answer:
            iat_results.append((q, ans.answer["iat"]))

    if not iat_results:
        return out

    # 简化:IAT 中错答多 = 内隐与外显不一致
    for q, reactions in iat_results:
        errors = [r for r in reactions if not r.get("correct", True)]
        if len(errors) >= len(reactions) * 0.3:  # 30% 以上错答
            out.append({
                "question_id": q.id,
                "description": f"IAT「{q.prompt[:24]}」中错答比例较高,你的内隐联想与外显判断可能存在分裂",
                "conflict_type": "iat_implicit_explicit",
                "severity": 2,
            })
        # 反应时差异大 = 内心冲突
        rts = [r.get("rt", 500) for r in reactions]
        if rts and max(rts) > sum(rts) / len(rts) * 2:
            out.append({
                "question_id": q.id,
                "description": f"IAT「{q.prompt[:24]}」中部分词汇反应时显著延长,潜意识层面存在犹豫",
                "conflict_type": "iat_hesitation",
                "severity": 2,
            })

    return out[:2]
