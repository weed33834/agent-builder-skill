"""per-user 固定窗口限流(单实例内存版)。

# 设计约束
- 仅防自动化刷接口 / 探测:防止短时间重放 complete 刷 streak/徽章(R5)。
- 内存实现:单进程/单实例准确;多实例部署须改为 Redis 等共享存储(已在 README/交付文档标注)。
- 异步安全:allow() 内部无 await,单线程事件循环下 dict 操作原子,无需加锁。
- 独立于鉴权:即使未认证请求也计入(防爆破/探测),无 token 时退回客户端 IP 桶,
  避免匿名用户共享同一桶互相挤占。
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import get_settings
from app.core.security import _is_valid_token

# 默认阈值;导入时读取配置(失败回退 30)。窗口固定 60s。
try:
    _DEFAULT_LIMIT = get_settings().rate_limit_per_minute
except Exception:
    _DEFAULT_LIMIT = 30
_WINDOW_SECONDS = 60


class _Window:
    __slots__ = ("count", "start")

    def __init__(self, now: float) -> None:
        self.count = 0
        self.start = now


class RateLimiter:
    """进程内固定窗口计数器。"""

    def __init__(self, window_seconds: int = _WINDOW_SECONDS) -> None:
        self.window_seconds = window_seconds
        self._buckets: dict[str, _Window] = defaultdict(lambda: _Window(0.0))

    def allow(self, key: str, limit: int, now: float | None = None) -> tuple[bool, int]:
        """返回 (是否放行, 剩余可用次数)。超过窗口自动重置。"""
        now = now if now is not None else time.monotonic()
        win = self._buckets[key]
        if now - win.start >= self.window_seconds:
            win.count = 0
            win.start = now
        if win.count >= limit:
            return False, 0
        win.count += 1
        return True, limit - win.count


# 进程级单例
_limiter = RateLimiter()


def _client_key(request: Request) -> str:
    token = request.headers.get("x-user-token")
    if _is_valid_token(token):
        return f"u:{token}"
    return f"ip:{request.client.host if request.client else 'unknown'}"


async def rate_limit(request: Request, limit: int = _DEFAULT_LIMIT) -> None:
    """FastAPI 依赖:超频返回 429 + Retry-After。

    放置于 RequireUser 之前,确保未认证请求也被计入(防探测)。
    """
    allowed, _ = _limiter.allow(_client_key(request), limit)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁,请稍后再试",
            headers={"Retry-After": str(_WINDOW_SECONDS)},
        )
