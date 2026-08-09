"""L8 - 认证中间件

提供 API Key 认证和 JWT 认证支持。
"""

from typing import Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
import hmac


class AuthMiddleware:
    """认证中间件
    
    支持多种认证方式：
    - API Key 认证（简单模式）
    - JWT Bearer Token（生产模式）
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    async def verify_api_key(self, request: Request) -> bool:
        """验证 API Key"""
        if not self.api_key:
            return True  # 未配置认证，允许所有请求
        
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False
        
        token = auth_header[7:]
        return hmac.compare_digest(token, self.api_key)
    
    async def __call__(self, request: Request, call_next):
        """中间件处理"""
        # 健康检查不需要认证
        if request.url.path == "/api/health":
            return await call_next(request)
        
        if not await self.verify_api_key(request):
            return JSONResponse(
                status_code=401,
                content={"error": "未授权", "detail": "无效的 API Key"},
            )
        
        return await call_next(request)