"""认证扩展点 —— 本地用简单 token(uuid),上线可切 JWT / wx.login。

只暴露 get_or_create_user_by_token,业务层不感知具体认证方式。
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_or_create_user_by_token(db: AsyncSession, token: str | None) -> User:
    """有 token 先查;查不到或无 token → 新建用户(用传入 token 或新生成的)。"""
    if token:
        result = await db.execute(select(User).where(User.token == token))
        if user := result.scalar_one_or_none():
            return user

    # 无 token 或 token 无效 → 生成新 token 建匿名用户
    new_token = token or str(uuid.uuid4())
    user = User(token=new_token, nickname=f"镜中人_{uuid.uuid4().hex[:6]}")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
