"""行为洞察 —— 从轨迹中得出决策风格、时间压力效应、一致性。"""

import statistics


def derive_insights(answers, behavior: dict) -> dict:
    """三类洞察:
    - decision_style: 直觉型 / 深思型 / 平衡型
    - time_pressure_effect: 时间压力下是否改变倾向
    - consistency: 答案一致性(改主意频率)
    """
    durations = [a.duration_ms for a in answers.answers if a.duration_ms > 0]
    changes = [a.change_count for a in answers.answers]

    # 决策风格:平均耗时 < 3s 直觉,> 8s 深思,中间平衡
    avg_ms = statistics.mean(durations) if durations else 0
    if avg_ms < 3000:
        style = "直觉型"
        style_desc = "快速决策,凭直觉作答"
    elif avg_ms > 8000:
        style = "深思型"
        style_desc = "审慎权衡,决策耗时较长"
    else:
        style = "平衡型"
        style_desc = "在直觉与深思之间,视题而定"

    # 一致性:改主意频率
    avg_changes = statistics.mean(changes) if changes else 0
    if avg_changes < 0.3:
        consistency = "高"
        consistency_desc = "答案稳定,少有改主意"
    elif avg_changes < 1.0:
        consistency = "中"
        consistency_desc = "偶尔调整,整体方向稳定"
    else:
        consistency = "低"
        consistency_desc = "频繁改主意,价值尚未定型"

    # 时间压力效应 —— 看限时题与非限时题耗时差
    timed_durations = []
    untimed_durations = []
    # behavior 里可存更细粒度的数据,此处用 answers 粗判
    for a in answers.answers:
        if a.duration_ms > 0:
            # 简化:耗时 <2s 视为限时题答案
            (timed_durations if a.duration_ms < 2000 else untimed_durations).append(a.duration_ms)

    if timed_durations and untimed_durations:
        timed_avg = statistics.mean(timed_durations)
        untimed_avg = statistics.mean(untimed_durations)
        ratio = timed_avg / untimed_avg if untimed_avg > 0 else 1
        if ratio < 0.3:
            pressure = "显著加速"
            pressure_desc = "时间压力下大幅压缩决策,可能偏离真实倾向"
        elif ratio < 0.7:
            pressure = "适度加速"
            pressure_desc = "时间压力下有所加速,但仍在可控范围"
        else:
            pressure = "稳定"
            pressure_desc = "时间压力影响小,决策风格一致"
    else:
        pressure = "数据不足"
        pressure_desc = "题量不足以分析时间压力效应"

    return {
        "decision_style": {"label": style, "desc": style_desc, "avg_duration_ms": round(avg_ms)},
        "time_pressure_effect": {"label": pressure, "desc": pressure_desc},
        "consistency": {"label": consistency, "desc": consistency_desc, "avg_changes": round(avg_changes, 2)},
    }
