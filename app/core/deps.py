"""FastAPI 依赖注入 —— 当前用户、数据库会话。"""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_or_create_user_by_token
from app.models.user import User

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def current_user(
    request: Request,
    db: DbSession,
) -> User:
    """从请求头 X-User-Token 解析当前用户,无则建匿名用户。"""
    token = request.headers.get("x-user-token")
    return await get_or_create_user_by_token(db, token)


CurrentUser = Annotated[User, Depends(current_user)]
