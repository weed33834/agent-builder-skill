"""教官每日任务服务层 —— 平台无关:输入数据,产出 DailyMission / streak。

所有本地日期基于 Asia/Shanghai,绝不用 date.today()/datetime.now()。
"""

from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Type

import pendulum
import yaml
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mission import (
    DailyMission,
    MissionCompletion,
    TrainingGoal,
    TrainingStreak,
)
from app.models.result import Result
from app.models.user import User


# --------------------------------------------------------------------------- #
# 模板 / 名人库加载
# --------------------------------------------------------------------------- #
@lru_cache
def _load_mission_templates() -> dict:
    """加载 data/training/mission_templates.yaml(带缓存)。"""
    path = Path(__file__).resolve().parent.parent.parent / "data" / "training" / "mission_templates.yaml"
    if not path.exists():
        raise FileNotFoundError(f"任务模板不存在: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


@lru_cache
def _load_figures() -> list[dict]:
    """加载 data/figures/celebrity.yaml(白名单来源)。"""
    path = Path(__file__).resolve().parent.parent.parent / "data" / "figures" / "celebrity.yaml"
    if not path.exists():
        return []
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    return [f for f in raw if isinstance(f, dict)]


def _is_known_figure(fig_id: str) -> bool:
    """source_figure 白名单:必须是 celebrity.yaml 已知 id。"""
    return any(f.get("id") == fig_id for f in _load_figures())


def _figure_name(fig_id: str | None) -> str | None:
    if not fig_id:
        return None
    for f in _load_figures():
        if f.get("id") == fig_id:
            return f.get("name")
    return None


# --------------------------------------------------------------------------- #
# 信号评估与任务选择
# --------------------------------------------------------------------------- #
def _get_path(data: dict, path: str):
    cur: object = data
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:  # type: ignore[union-attr]
            return None
        cur = cur[part]  # type: ignore[index]
    return cur


def _evaluate_signals(insights: dict) -> list[dict]:
    """返回命中的弱信号,按严重度降序。命中=该用户此项弱/需练。"""
    templates = _load_mission_templates()
    fired: list[dict] = []
    for sid, spec in templates.get("signals", {}).items():
        when = spec.get("when", {})
        field = when.get("field")
        op = when.get("op")
        val = when.get("value")
        if not field or not op or "value" not in when:
            continue
        actual = _get_path(insights, field)
        if actual is None:
            continue
        hit = False
        try:
            if op == ">=":
                hit = actual >= val
            elif op == "<=":
                hit = actual <= val
            elif op == ">":
                hit = actual > val
            elif op == "<":
                hit = actual < val
            elif op == "==":
                hit = actual == val
            elif op == "in":
                hit = actual in val
        except TypeError:
            hit = False
        if hit:
            # 数值信号用其分值作严重度;标签类信号给固定值
            severity = actual if isinstance(actual, (int, float)) else 55
            fired.append({"id": sid, "severity": severity})
    fired.sort(key=lambda x: x["severity"], reverse=True)
    return fired


def _select_sources(fired: list[dict], goal: TrainingGoal | None) -> list[dict]:
    """返回最多 3 个任务来源(每个含 id + templates 列表)。

    优先序:goal 偏好信号(已命中) → 其余命中信号(按严重度) → fallback 兜底。
    """
    templates = _load_mission_templates()
    preferred: list[str] = []
    if goal is not None:
        preferred = templates.get("traits", {}).get(goal.trait_target.value, {}).get("preferred_signals", [])
    fired_ids = {s["id"] for s in fired}
    sources: list[dict] = []
    # 1) 偏好信号中已命中的,保持偏好顺序
    for sid in preferred:
        if sid in fired_ids:
            sources.append({"id": sid, "templates": templates["signals"][sid]["templates"]})
    # 2) 其余命中信号,按严重度
    for s in fired:
        if any(x["id"] == s["id"] for x in sources):
            continue
        sources.append({"id": s["id"], "templates": templates["signals"][s["id"]]["templates"]})
    # 3) fallback 兜底补满 3 个
    fallbacks = templates.get("fallback", [])
    idx = 0
    while len(sources) < 3 and fallbacks:
        fb = fallbacks[idx % len(fallbacks)]
        if not any(x["id"] == fb["id"] for x in sources):
            sources.append({"id": fb["id"], "templates": [fb]})
        idx += 1
        if idx > len(fallbacks) * 3:
            break
    return sources[:3]


def _pick_template(source: dict, today: date, i: int) -> dict:
    """按日期种子选模板,避免连日同一句 → 提升留存。"""
    templates = source["templates"]
    idx = (today.toordinal() + i) % len(templates)
    return templates[idx]


# --------------------------------------------------------------------------- #
# 生成
# --------------------------------------------------------------------------- #
async def generate_mission(
    db: AsyncSession,
    user: User,
    insights: dict,
    profile: dict,
    goal: TrainingGoal | None,
    mission_date: date | None = None,
) -> DailyMission:
    """由 insights 信号 + goal 生成当天 3 个任务。幂等:同天已存在直接返回。"""
    today = mission_date or pendulum.now("Asia/Shanghai").date()
    existing = await _get_mission_for_date(db, user.id, today)
    if existing is not None:
        return existing

    sources = _select_sources(_evaluate_signals(insights), goal)
    templates = _load_mission_templates()
    prefix = templates.get("drill_prefix", "听令。")

    tasks: list[dict] = []
    generated_from: list[dict] = []
    for i, src in enumerate(sources):
        tpl = _pick_template(src, today, i)
        tasks.append({
            "id": f"t{i+1}",
            "prompt": tpl["prompt"],
            "strict_prompt": f"{prefix}{tpl['strict_prompt']}",
            "done": False,
        })
        generated_from.append({
            "task_id": f"t{i+1}",
            "signal": src["id"],
            "template_id": tpl.get("id"),
            "trait": goal.trait_target.value if goal else None,
            "figure": goal.source_figure if goal else None,
        })

    mission = DailyMission(
        user_id=user.id,
        goal_id=goal.id if goal else None,
        mission_date=today,
        tasks=tasks,
        generated_from=generated_from,
        completed=False,
    )
    db.add(mission)
    try:
        await db.commit()
    except IntegrityError:  # 并发下唯一约束冲突 → 回滚后取已存在
        await db.rollback()
        again = await _get_mission_for_date(db, user.id, today)
        if again is not None:
            return again
        raise
    await db.refresh(mission)
    return mission


# --------------------------------------------------------------------------- #
# streak 三件套
# --------------------------------------------------------------------------- #
def reconcile_streak(state: TrainingStreak, today: date) -> None:
    """只读式跨天重置:断签(距今天数 > 1)即视为 0。"""
    if state.last_completed_date is None:
        state.current_streak = 0
        return
    if (today - state.last_completed_date).days > 1:
        state.current_streak = 0


async def advance_streak(db: AsyncSession, user: User, today: date) -> None:
    """推进连续天数;同天已完成短路防双计;>=7 解锁铁血徽章(只升不降)。"""
    state = await _get_or_create_state(db, user.id)
    reconcile_streak(state, today)
    if state.last_completed_date == today:
        return  # 同天已完成,幂等不重复 +1
    if state.last_completed_date == today - timedelta(days=1):
        state.current_streak += 1
    else:
        state.current_streak = 1  # 首签 / 断签重启
    state.last_completed_date = today
    state.longest_streak = max(state.longest_streak, state.current_streak)
    if state.current_streak >= 7 and not state.iron_blood_badge:
        state.iron_blood_badge = True
        state.badge_unlocked_at = pendulum.now("Asia/Shanghai")
    await db.commit()


async def get_streak(db: AsyncSession, user: User) -> dict:
    """读取当前 streak(断签即时归零)。返回 dict 供 StreakOut.model_validate。"""
    state = await _get_or_create_state(db, user.id)
    reconcile_streak(state, pendulum.now("Asia/Shanghai").date())
    await db.commit()
    return {
        "current": state.current_streak,
        "longest": state.longest_streak,
        "badge": state.iron_blood_badge,
        "last_completed_date": state.last_completed_date.isoformat() if state.last_completed_date else None,
    }


# --------------------------------------------------------------------------- #
# 完成
# --------------------------------------------------------------------------- #
async def complete_task(db: AsyncSession, user: User, mission_id: str, task_id: str) -> tuple[DailyMission, dict]:
    """切换单任务完成态;全部完成时经 MissionCompletion 原子门推进 streak。

    - mission/user 不匹配或 task 不存在 → 404(统一,不泄露归属)
    - 仅允许完成"当天"任务,过期 → 409
    - 完成接口只收 mission_id + task_id,无日期/streak 字段(全服务端推导)
    """
    mission = await _get_owned_or_404(db, DailyMission, mission_id, user)
    today = pendulum.now("Asia/Shanghai").date()
    if mission.mission_date != today:
        raise HTTPException(status_code=409, detail="任务已过期,仅可完成当日任务")
    task = next((t for t in mission.tasks if t.get("id") == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="资源不存在")

    # JSON 列变更检测:必须构造全新的 list[dict],内部 dict 也须是新对象,
    # 否则 SQLAlchemy 浅比较 old==new 会判定无变更而不 flush(坑 #2 修正)
    new_tasks: list[dict] = []
    for t in mission.tasks:
        nt = dict(t)  # 断开与 tracked 值的引用,确保序列化结果不同
        if nt.get("id") == task_id:
            nt["done"] = True
        new_tasks.append(nt)
    mission.tasks = new_tasks
    await db.commit()

    if all(t["done"] for t in mission.tasks) and not mission.completed:
        # 原子门:插入完成记录,唯一约束防并发双计
        db.add(MissionCompletion(user_id=user.id, mission_id=mission.id, completed_date=today))
        try:
            await db.commit()
        except IntegrityError:
            uid = user.id  # 回滚前持有主键;回滚后 user 对象可能过期
            await db.rollback()
            user = await db.get(User, uid)  # 重新加载,避免过期对象触发 MissingGreenlet
            mission = await _get_owned_or_404(db, DailyMission, mission_id, user)
            return mission, await get_streak(db, user)
        mission.completed = True
        await advance_streak(db, user, today)
        await db.commit()

    await db.refresh(mission)
    return mission, await get_streak(db, user)


# --------------------------------------------------------------------------- #
# 查询辅助(P0-2 归属校验 + 生成依赖)
# --------------------------------------------------------------------------- #
async def _get_owned_or_404(db: AsyncSession, Model: Type, id_: str, user: User):
    """P0-2/P1-7:按 id+user_id 查;查不到(含非本人)一律 404,不泄露存在性/归属。"""
    res = await db.execute(select(Model).where(Model.id == id_, Model.user_id == user.id))
    obj = res.scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    return obj


async def _get_mission_for_date(db: AsyncSession, user_id: str, mission_date: date) -> DailyMission | None:
    res = await db.execute(
        select(DailyMission).where(DailyMission.user_id == user_id, DailyMission.mission_date == mission_date)
    )
    return res.scalar_one_or_none()


async def _latest_result(db: AsyncSession, user_id: str) -> Result | None:
    res = await db.execute(
        select(Result).where(Result.user_id == user_id).order_by(Result.created_at.desc()).limit(1)
    )
    return res.scalar_one_or_none()


async def _latest_active_goal(db: AsyncSession, user_id: str) -> TrainingGoal | None:
    res = await db.execute(
        select(TrainingGoal)
        .where(TrainingGoal.user_id == user_id, TrainingGoal.is_active == True)  # noqa: E712
        .order_by(TrainingGoal.created_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def _get_or_create_state(db: AsyncSession, user_id: str) -> TrainingStreak:
    res = await db.execute(select(TrainingStreak).where(TrainingStreak.user_id == user_id))
    state = res.scalar_one_or_none()
    if state is None:
        state = TrainingStreak(user_id=user_id)
        db.add(state)
        await db.commit()
        await db.refresh(state)
    return state


async def get_today_mission(db: AsyncSession, user: User) -> DailyMission | None:
    """取今日任务;无则按最新结果 + 最新 active goal 生成。未测评返 None。"""
    today = pendulum.now("Asia/Shanghai").date()
    existing = await _get_mission_for_date(db, user.id, today)
    if existing is not None:
        return existing
    result = await _latest_result(db, user.id)
    if result is None:
        return None
    goal = await _latest_active_goal(db, user.id)
    return await generate_mission(db, user, result.insights, result.profile, goal, today)
