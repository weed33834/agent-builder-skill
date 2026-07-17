"""教官每日任务 —— 留存飞轮核心模型。

TrainingGoal:用户选定的"想变强的特质"(目标)。
DailyMission:每天 3 个微任务(严苛教官语气)。
MissionCompletion:完成记录的幂等/并发安全原子门(P1-6)。
TrainingStreak:连续天数与铁血徽章。
"""

import enum
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UlidPkMixin


class TraitTarget(str, enum.Enum):
    """用户选定的"想变强的特质"。固定枚举,既作存储也作展示 key,杜绝自由文本注入。"""

    more_decisive = "more_decisive"  # 更果断
    more_courageous = "more_courageous"  # 更敢担当
    more_resolute = "more_resolute"  # 更坚定
    more_action = "more_action"  # 更敢行动
    more_principled = "more_principled"  # 更守原则
    more_focused = "more_focused"  # 更专注


TRAIT_LABELS: dict[TraitTarget, str] = {
    TraitTarget.more_decisive: "更果断",
    TraitTarget.more_courageous: "更敢担当",
    TraitTarget.more_resolute: "更坚定",
    TraitTarget.more_action: "更敢行动",
    TraitTarget.more_principled: "更守原则",
    TraitTarget.more_focused: "更专注",
}


class TrainingGoal(UlidPkMixin, Base):
    __tablename__ = "training_goals"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    trait_target: Mapped[TraitTarget] = mapped_column(Enum(TraitTarget), index=True)
    # 仅存白名单 id(对应 data/figures/celebrity.yaml),是"启发来源"而非目标
    source_figure: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DailyMission(UlidPkMixin, Base):
    __tablename__ = "daily_missions"
    __table_args__ = (UniqueConstraint("user_id", "mission_date", name="uq_user_mission_date"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    goal_id: Mapped[str | None] = mapped_column(ForeignKey("training_goals.id"), nullable=True, index=True)
    mission_date: Mapped[date] = mapped_column(Date, index=True)  # Asia/Shanghai 本地日期
    # 生成时定稿快照,每个 task:{id, prompt, strict_prompt, done}
    tasks: Mapped[list] = mapped_column(JSON, default=list)
    generated_from: Mapped[list] = mapped_column(JSON, default=list)  # 信号溯源,防漂移
    completed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # streak 是否已计


class MissionCompletion(UlidPkMixin, Base):
    """完成记录 —— 唯一约束 (user_id, mission_id) 作原子门,防并发双计(P1-6)。"""

    __tablename__ = "mission_completions"
    __table_args__ = (UniqueConstraint("user_id", "mission_id", name="uq_user_mission"),)

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    mission_id: Mapped[str] = mapped_column(ForeignKey("daily_missions.id"), index=True)
    completed_date: Mapped[date] = mapped_column(Date, index=True)  # 服务端 Asia/Shanghai


class TrainingStreak(UlidPkMixin, Base):
    __tablename__ = "training_streaks"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    iron_blood_badge: Mapped[bool] = mapped_column(Boolean, default=False)  # 铁血徽章,只升不降
    badge_unlocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
