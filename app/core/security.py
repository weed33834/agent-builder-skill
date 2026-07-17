"""认证扩展点 —— 本地用简单 token(uuid),上线可切 JWT / wx.login。

只暴露 get_or_create_user_by_token,业务层不感知具体认证方式。

#2 修复说明:
  原设计依赖客户端生成 UUID 作为匿名身份令牌,存在令牌泄露后
  可被冒用的风险。此模块保留匿名令牌机制(前端依赖此流程),
  但增加以下保护:
  - 仅接受 UUID 格式的 token(拒绝任意字符串)
  - 模块文档明确标注此为开发/演示用,生产环境必须切换 auth_provider
  生产环境应配置 auth_provider=jwt 或 wx,使用签名令牌。
"""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

# 仅接受 UUID 格式的 token,拒绝任意字符串
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _is_valid_token(token: str | None) -> bool:
    """校验 token 是否为合法 UUID 格式。"""
    if not token:
        return False
    return bool(_UUID_RE.match(token))


async def get_or_create_user_by_token(db: AsyncSession, token: str | None) -> User:
    """有 token 先查 DB;查不到或 token 无效 → 建匿名用户。

    #2 修复:仅接受 UUID 格式的 token 作为身份凭据。
    - 合法 UUID 且匹配 DB → 返回已有用户
    - 合法 UUID 但不匹配 → 用该 UUID 建新用户(前端依赖此流程维持会话)
    - 非法格式或为空 → 生成新的服务端 UUID
    """
    if _is_valid_token(token):
        result = await db.execute(select(User).where(User.token == token))
        if user := result.scalar_one_or_none():
            return user
        # 合法 UUID 但 DB 无记录 → 用该 token 建新用户
        new_token = token  # type: ignore[assignment]
    else:
        # 非法格式或为空 → 生成新的服务端 UUID
        new_token = str(uuid.uuid4())

    user = User(token=new_token, nickname=f"镜中人_{uuid.uuid4().hex[:6]}")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
