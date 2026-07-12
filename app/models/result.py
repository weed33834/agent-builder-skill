"""测评结果 —— 计分/匹配/冲突/行为洞察的完整产物。"""

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UlidPkMixin


class Result(UlidPkMixin, Base):
    __tablename__ = "results"

    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    assessment_type: Mapped[str] = mapped_column(String(32), index=True)

    # 多维分数 {dimension: score}
    dimensions: Mapped[dict] = mapped_column(JSON)
    # 匹配 Top3 [{id, name, match_pct, blurb}]
    matches: Mapped[list] = mapped_column(JSON)
    # 内在冲突点 [{question_id, description, conflict_type}]
    conflicts: Mapped[list] = mapped_column(JSON)
    # 行为洞察 {decision_style, time_pressure_effect, consistency}
    insights: Mapped[dict] = mapped_column(JSON)
    # 群体百分位 {dimension: percentile}
    percentiles: Mapped[dict] = mapped_column(JSON, default=dict)
    # 综合画像 {tags: [...], archetype: str}
    profile: Mapped[dict] = mapped_column(JSON, default=dict)
    # 一句话结论
    summary: Mapped[str] = mapped_column(String(500))

    session: Mapped["AssessmentSession"] = relationship(back_populates="result")  # type: ignore[name-defined]
