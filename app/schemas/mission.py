"""教官每日任务 —— 请求/响应 schema。"""

from pydantic import BaseModel

from app.models.mission import TraitTarget


class GoalCreate(BaseModel):
    trait_target: TraitTarget
    source_figure: str | None = None


class GoalOut(BaseModel):
    id: str
    trait_target: TraitTarget
    trait_label: str
    source_figure: str | None = None
    source_figure_name: str | None = None
    created_at: str


class TaskOut(BaseModel):
    id: str
    prompt: str
    strict_prompt: str
    done: bool


class MissionOut(BaseModel):
    id: str
    mission_date: str
    tasks: list[TaskOut]
    generated_from: list[dict]
    completed: bool


class StreakOut(BaseModel):
    current: int
    longest: int
    badge: bool
    last_completed_date: str | None = None
