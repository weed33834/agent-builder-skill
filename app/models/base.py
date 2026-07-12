"""SQLAlchemy 声明式基类 —— 主键统一 ULID 字符串。"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from ulid import ULID


class Base(DeclarativeBase):
    pass


class UlidPkMixin:
    """主键用 ULID 字符串 —— 比 uuid 更可排序,时间有序。"""

    id: Mapped[str] = mapped_column(String(26), primary_key=True, default=lambda: str(ULID()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
