"""L8 - 健康检查 API 端点"""

from fastapi import APIRouter
from datetime import datetime

from ..schemas import HealthResponse
from ...l5_tools.registry import ToolRegistry

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查
    
    返回服务的运行状态信息。
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        llm_connected=True,
        tools_count=len(ToolRegistry.get_all()),
    )