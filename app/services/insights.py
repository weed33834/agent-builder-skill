"""行为洞察 v2 —— 决策风格 + 时间压力 + 一致性 + IAT 偏差 + 勇气指数 + 纠结度。

新增:
- iat_bias: IAT 反应时左右差异(内隐偏向强度)
- courage_index: 困境题中选择"承担代价"选项的比例
- ambivalence: 纠结度(高犹豫+反复改的综合指标)
"""

import statistics


def derive_insights(answers, behavior: dict) -> dict:
    """六类行为洞察。"""
    durations = [a.duration_ms for a in answers.answers if a.duration_ms > 0]
    changes = [a.change_count for a in answers.answers]

    # 1. 决策风格
    avg_ms = statistics.mean(durations) if durations else 0
    if avg_ms < 3000:
        style, style_desc = "直觉型", "快速决策,凭直觉作答,少有犹豫"
    elif avg_ms > 8000:
        style, style_desc = "深思型", "审慎权衡,决策耗时较长,注重细节"
    else:
        style, style_desc = "平衡型", "在直觉与深思之间,视题而定"

    # 2. 一致性
    avg_changes = statistics.mean(changes) if changes else 0
    if avg_changes < 0.3:
        consistency, consistency_desc = "高", "答案稳定,少有改主意,价值体系清晰"
    elif avg_changes < 1.0:
        consistency, consistency_desc = "中", "偶尔调整,整体方向稳定"
    else:
        consistency, consistency_desc = "低", "频繁改主意,价值尚未定型"

    # 3. 时间压力效应
    timed_durations = [d for d in durations if d < 2000]
    untimed_durations = [d for d in durations if d >= 2000]
    if timed_durations and untimed_durations:
        timed_avg = statistics.mean(timed_durations)
        untimed_avg = statistics.mean(untimed_durations)
        ratio = timed_avg / untimed_avg if untimed_avg > 0 else 1
        if ratio < 0.3:
            pressure, pressure_desc = "显著加速", "时间压力下大幅压缩决策,可能偏离真实倾向"
        elif ratio < 0.7:
            pressure, pressure_desc = "适度加速", "时间压力下有所加速,但仍在可控范围"
        else:
            pressure, pressure_desc = "稳定", "时间压力影响小,决策风格一致"
    else:
        pressure, pressure_desc = "数据不足", "题量不足以分析时间压力效应"

    # 4. IAT 偏差(新增)—— 左右反应时差异
    iat_insight = _derive_iat_bias(answers)

    # 5. 勇气指数(新增)—— 困境题中选择"承担代价"选项的比例
    courage = _derive_courage(answers)

    # 6. 纠结度(新增)—— 高犹豫+反复改的综合
    ambivalence = _derive_ambivalence(answers, durations, changes)

    return {
        "decision_style": {"label": style, "desc": style_desc, "avg_duration_ms": round(avg_ms)},
        "time_pressure_effect": {"label": pressure, "desc": pressure_desc},
        "consistency": {"label": consistency, "desc": consistency_desc, "avg_changes": round(avg_changes, 2)},
        "iat_bias": iat_insight,
        "courage_index": courage,
        "ambivalence": ambivalence,
    }


def _derive_iat_bias(answers) -> dict:
    """IAT 反应时左右差异 → 内隐偏向强度。"""
    left_rts, right_rts = [], []
    for a in answers.answers:
        if "iat" not in a.answer:
            continue
        for r in a.answer["iat"]:
            rt = r.get("rt", 500)
            if r.get("response") == "left":
                left_rts.append(rt)
            elif r.get("response") == "right":
                right_rts.append(rt)

    if not left_rts or not right_rts:
        return {"label": "无数据", "desc": "未检测到 IAT 反应", "bias": 0}

    left_avg = statistics.mean(left_rts)
    right_avg = statistics.mean(right_rts)
    diff = right_avg - left_avg  # 正=左侧快(偏向左),负=右侧快

    if abs(diff) < 80:
        label, desc = "中立", "左右反应时接近,无明显内隐偏向"
    elif diff > 0:
        if diff > 200:
            label, desc = "偏左(强)", "对左侧概念反应明显更快,内隐偏向较强"
        else:
            label, desc = "偏左(弱)", "对左侧概念反应略快,存在轻微内隐偏向"
    else:
        if diff < -200:
            label, desc = "偏右(强)", "对右侧概念反应明显更快,内隐偏向较强"
        else:
            label, desc = "偏右(弱)", "对右侧概念反应略快,存在轻微内隐偏向"

    return {"label": label, "desc": desc, "bias": round(diff), "left_avg_ms": round(left_avg), "right_avg_ms": round(right_avg)}


def _derive_courage(answers) -> dict:
    """勇气指数 —— 困境题中选择"承担代价"选项(a 选项通常是理想/承担)的比例。

    简化:a 选项 = 承担代价(勇气),c 选项 = 回避(保身),b 选项 = 折中。
    """
    courage_count = 0
    avoid_count = 0
    total = 0
    for a in answers.answers:
        if "option_id" not in a.answer:
            continue
        # 仅困境题算(简化:看 option_id 是否为 a/b/c)
        opt = a.answer["option_id"]
        if opt not in ("a", "b", "c"):
            continue
        total += 1
        if opt == "a":
            courage_count += 1
        elif opt == "c":
            avoid_count += 1

    if total == 0:
        return {"label": "无数据", "desc": "无困境题数据", "score": 0}

    pct = round(courage_count / total * 100)
    if pct >= 70:
        label, desc = "高", "多数困境中选择承担代价,理想主义色彩浓厚"
    elif pct >= 40:
        label, desc = "中", "在承担与回避间权衡,视情境而定"
    else:
        label, desc = "低", "多数困境中选择回避代价,现实审慎"

    return {"label": label, "desc": desc, "score": pct, "courage_count": courage_count, "total": total}


def _derive_ambivalence(answers, durations, changes) -> dict:
    """纠结度 —— 综合高犹豫与反复改的指标。"""
    if not durations:
        return {"label": "无数据", "desc": "无行为数据", "score": 0}

    median = sorted(durations)[len(durations) // 2]
    # 高犹豫题比例
    long_count = sum(1 for d in durations if d > median * 1.8)
    long_pct = long_count / len(durations) * 100
    # 改主意题比例
    change_count = sum(1 for c in changes if c >= 2)
    change_pct = change_count / len(changes) * 100 if changes else 0

    # 综合(0-100)
    score = round(long_pct * 0.5 + change_pct * 0.5)

    if score >= 50:
        label, desc = "高", "多题犹豫或改主意,内在价值未定型"
    elif score >= 25:
        label, desc = "中", "部分题目存在犹豫,整体方向清晰"
    else:
        label, desc = "低", "决策流畅,价值体系稳定"

    return {"label": label, "desc": desc, "score": score, "long_pct": round(long_pct), "change_pct": round(change_pct)}
