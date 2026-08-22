"""L8 - Health Check API Endpoint"""

from fastapi import APIRouter
from datetime import datetime

from ..schemas import HealthResponse
from ...l5_tools.registry import ToolRegistry
from ...l10_infra.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check

    Returns the service's runtime status information.
    """
    # Lightweight LLM reachability probe: a configured provider with a key is
    # considered connected; without a key the chat pipeline cannot work, so
    # report it honestly instead of a hardcoded True.
    llm_connected = bool(settings.LLM_API_KEY) or settings.LLM_PROVIDER == "ollama"
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        version=settings.APP_VERSION,
        llm_connected=llm_connected,
        tools_count=len(ToolRegistry.get_all()),
    )
