"""真实登录基石 —— 密码哈希 + JWT。

设计约束:
- 密码哈希用标准库 hashlib.pbkdf2_hmac(sha256, 20w 轮),零额外依赖,抗暴力充分。
- JWT 用 HS256,密钥取自 settings.auth_secret(生产必须非默认值)。
- verify_token 失败统一抛 401「未授权」,与现有匿名鉴权文案一致。
- 仅 jwt 路径落地;wx 登录需 appid/secret 外部凭据,仍属未实现(见 validate_production)。
"""

import base64
import hashlib
import hmac
import secrets

import jwt as _jwt
from fastapi import HTTPException

from app.core.config import get_settings

_ALGO = "pbkdf2_sha256"
_ITER = 200_000


def hash_password(pw: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, _ITER)
    return f"{_ALGO}${_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(pw: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        algo, iters, sb, hb = stored.split("$")
        if algo != _ALGO:
            return False
        salt = base64.b64decode(sb)
        dk = base64.b64decode(hb)
        new = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(new, dk)
    except Exception:
        return False


def create_token(sub: str, email: str | None = None) -> str:
    return _jwt.encode({"sub": sub, "email": email}, get_settings().auth_secret, algorithm="HS256")


def verify_token(tok: str) -> dict:
    try:
        return _jwt.decode(tok, get_settings().auth_secret, algorithms=["HS256"])
    except Exception as e:
        raise HTTPException(status_code=401, detail="未授权") from e
