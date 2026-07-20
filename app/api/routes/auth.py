"""真实登录路由(JWT 路径)—— 注册 / 登录,返回 Bearer Token。

- 邮箱 + 密码(至少 8 位),密码经 pbkdf2 哈希存储,明文不落库。
- 返回的 access_token 由前端存 localStorage,后续请求带 Authorization: Bearer。
- 匿名用户(email/password_hash 为 NULL)与 JWT 用户共存;local 模式下前端仍可用匿名 uuid。
"""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.core.deps import DbSession
from app.core.security_jwt import create_token, hash_password, verify_password
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthIn(BaseModel):
    email: str
    password: str
    nickname: str | None = None


@router.post("/register", status_code=201)
async def register(body: AuthIn, db: DbSession) -> dict:
    email = body.email.strip().lower()
    if "@" not in email or len(body.password) < 8:
        raise HTTPException(status_code=400, detail="邮箱无效或密码过短(至少 8 位)")
    if await db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="该邮箱已注册")
    u = User(
        token=uuid.uuid4().hex,
        nickname=body.nickname or email.split("@")[0],
        email=email,
        password_hash=hash_password(body.password),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return {"access_token": create_token(u.id, u.email), "token_type": "bearer"}


@router.post("/login")
async def login(body: AuthIn, db: DbSession) -> dict:
    email = body.email.strip().lower()
    u = await db.scalar(select(User).where(User.email == email))
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return {"access_token": create_token(u.id, u.email), "token_type": "bearer"}
