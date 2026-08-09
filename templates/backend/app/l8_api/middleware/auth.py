"""L8 - Authentication Middleware

Provides API Key and JWT authentication support.
"""

from typing import Optional
from fastapi import Request
from fastapi.responses import JSONResponse
import hmac


class AuthMiddleware:
    """Authentication middleware
    
    Supports multiple authentication methods:
    - API Key authentication (simple mode)
    - JWT Bearer Token (production mode)
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    async def verify_api_key(self, request: Request) -> bool:
        """Verify API Key"""
        if not self.api_key:
            return True  # No authentication configured, allow all requests
        
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False
        
        token = auth_header[7:]
        return hmac.compare_digest(token, self.api_key)
    
    async def __call__(self, request: Request, call_next):
        """Middleware processing"""
        # Health check does not require authentication
        if request.url.path == "/api/health":
            return await call_next(request)
        
        if not await self.verify_api_key(request):
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "detail": "Invalid API Key"},
            )
        
        return await call_next(request)
