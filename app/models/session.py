"""测评会话 —— 一次完整测评的过程记录,含草稿与行为轨迹。"""

import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UlidPkMixin


class SessionStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class AssessmentSession(UlidPkMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assessment_type: Mapped[str] = mapped_column(String(32), index=True)  # celebrity | value | ideology
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.in_progress, index=True
    )
    current_index: Mapped[int] = mapped_column(Integer, default=0)  # 当前题号
    # 草稿:已答题目答案,中途退出可恢复
    draft_answers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # 全程行为轨迹(耗时/修改/拖拽路径/IAT 反应时)
    behavior_log: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # #15 修复:类型标注改为 datetime | None,与 DateTime 列类型一致
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    result: Mapped["Result | None"] = relationship(back_populates="session", uselist=False)  # type: ignore[name-defined]
