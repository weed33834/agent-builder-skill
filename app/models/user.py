"""用户模型 —— 本地匿名,留 openid/sub 扩展位。"""

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UlidPkMixin


class User(UlidPkMixin, Base):
    __tablename__ = "users"

    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # 本地 token
    nickname: Mapped[str] = mapped_column(String(64))
    # 上线扩展位:wx openid / JWT sub
    external_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True, index=True)
    # 用户偏好(语言/主题等),避免后续加列
    preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)
