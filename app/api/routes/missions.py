"""教官每日任务路由 —— 全部端点强制 RequireUser(P0-2 / P0-3)。"""

from typing import Annotated

import pendulum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.core.deps import DbSession, RequireUser
from app.core.ratelimit import rate_limit
from app.models.mission import TRAIT_LABELS, DailyMission, TrainingGoal
from app.schemas.mission import GoalCreate, GoalOut, MissionOut, StreakOut, TaskOut
from app.services.missions import (
    _figure_name,
    _is_known_figure,
    _latest_active_goal,
    complete_task,
    get_streak,
    get_today_mission,
)

router = APIRouter(prefix="/api", tags=["missions"])


def _to_goal_out(goal: TrainingGoal) -> GoalOut:
    return GoalOut(
        id=goal.id,
        trait_target=goal.trait_target,
        trait_label=TRAIT_LABELS.get(goal.trait_target, goal.trait_target.value),
        source_figure=goal.source_figure,
        source_figure_name=_figure_name(goal.source_figure),
        created_at=goal.created_at.isoformat() if goal.created_at else "",
    )


def _to_mission_out(mission: DailyMission) -> MissionOut:
    # 显式构造:mission_date 为 date,经 .isoformat() 转 str(保持 schema 契约)
    return MissionOut(
        id=mission.id,
        mission_date=mission.mission_date.isoformat(),
        tasks=[TaskOut(**t) for t in mission.tasks],
        generated_from=mission.generated_from,
        completed=mission.completed,
    )


@router.post("/goals", status_code=201)
async def create_goal(
    body: GoalCreate,
    user: RequireUser,
    db: DbSession,
    _: Annotated[None, Depends(rate_limit)],
) -> GoalOut:
    if body.source_figure is not None and not _is_known_figure(body.source_figure):
        raise HTTPException(status_code=422, detail="source_figure 不是有效名人 id")
    # 旧 goal 软失效
    res = await db.execute(
        select(TrainingGoal).where(TrainingGoal.user_id == user.id, TrainingGoal.is_active == True)  # noqa: E712
    )
    for g in res.scalars().all():
        g.is_active = False
        g.deactivated_at = pendulum.now("Asia/Shanghai")
    goal = TrainingGoal(
        user_id=user.id,
        trait_target=body.trait_target,
        source_figure=body.source_figure,
        is_active=True,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return _to_goal_out(goal)


@router.get("/goals/me")
async def my_goal(user: RequireUser, db: DbSession) -> GoalOut:
    goal = await _latest_active_goal(db, user.id)
    if goal is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    return _to_goal_out(goal)


@router.get("/missions/today")
async def get_today(user: RequireUser, db: DbSession) -> MissionOut:
    mission = await get_today_mission(db, user)
    if mission is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    return _to_mission_out(mission)


@router.post("/missions/{mission_id}/tasks/{task_id}/complete")
async def complete(
    mission_id: str,
    task_id: str,
    user: RequireUser,
    db: DbSession,
    _: Annotated[None, Depends(rate_limit)],
) -> dict:
    mission, streak = await complete_task(db, user, mission_id, task_id)
    return {
        "mission": _to_mission_out(mission),
        "streak": StreakOut.model_validate(streak),
    }


@router.get("/missions/streak")
async def streak(user: RequireUser, db: DbSession) -> StreakOut:
    s = await get_streak(db, user)
    return StreakOut.model_validate(s)
