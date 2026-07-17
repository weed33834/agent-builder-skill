"""FastAPI 依赖注入 —— 当前用户、数据库会话。"""

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.core.security import _is_valid_token, get_or_create_user_by_token
from app.core.security_jwt import verify_token
from app.models.user import User

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def _user_from_bearer(request: Request, db: DbSession) -> User | None:
    """Bearer JWT 优先;无效直接抛 401。无 Bearer 返回 None。"""
    auth = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    payload = verify_token(auth[7:].strip())
    return await db.get(User, payload.get("sub"))


async def current_user(
    request: Request,
    db: DbSession,
) -> User:
    """双模:Bearer JWT(任意模式)优先;否则本地匿名流程(仅 local 模式自动建号)。"""
    if (u := await _user_from_bearer(request, db)):
        return u
    if get_settings().auth_provider != "local":
        raise HTTPException(status_code=401, detail="未授权")
    return await get_or_create_user_by_token(db, request.headers.get("x-user-token"))


CurrentUser = Annotated[User, Depends(current_user)]


async def require_user(request: Request, db: DbSession) -> User:
    """P0-3:写/读端点强制鉴权,绝不自动建号。

    双模:Bearer JWT 优先(任意模式都接受);非 local 模式下无 Bearer → 401;
    local 模式下退回匿名 uuid 校验(合法但无记录 → 401,绝不建号)。
    """
    if (u := await _user_from_bearer(request, db)):
        return u
    if get_settings().auth_provider != "local":
        raise HTTPException(status_code=401, detail="未授权")
    token = request.headers.get("x-user-token")
    if not _is_valid_token(token):
        raise HTTPException(status_code=401, detail="未授权")
    result = await db.execute(select(User).where(User.token == token))
    if user := result.scalar_one_or_none():
        return user
    raise HTTPException(status_code=401, detail="未授权")


RequireUser = Annotated[User, Depends(require_user)]
