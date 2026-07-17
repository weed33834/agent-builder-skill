"""FastAPI 依赖注入 —— 当前用户、数据库会话。"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import _is_valid_token, get_or_create_user_by_token
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


async def require_user(request: Request, db: DbSession) -> User:
    """P0-3:写/读端点强制鉴权,绝不自动建号。

    token 缺失或非法格式 → 401;合法但无 DB 记录 → 401。
    """
    token = request.headers.get("x-user-token")
    if not _is_valid_token(token):
        raise HTTPException(status_code=401, detail="未授权")
    result = await db.execute(select(User).where(User.token == token))
    if user := result.scalar_one_or_none():
        return user
    raise HTTPException(status_code=401, detail="未授权")


RequireUser = Annotated[User, Depends(require_user)]
