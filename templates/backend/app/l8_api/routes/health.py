"""L8 - Health Check API Endpoint"""

from fastapi import APIRouter
from datetime import datetime

from ..schemas import HealthResponse
from ...l5_tools.registry import ToolRegistry

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check
    
    Returns the service's runtime status information.
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        llm_connected=True,
        tools_count=len(ToolRegistry.get_all()),
    )
