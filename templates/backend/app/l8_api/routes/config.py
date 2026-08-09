"""L8 - Agent Configuration API Endpoint

Provides current Agent configuration information for the frontend to dynamically render UI.
"""
from fastapi import APIRouter
from ...l10_infra.config import settings

router = APIRouter()


@router.get("/config")
async def get_agent_config():
    """Get current Agent configuration
    
    The frontend dynamically renders UI features based on this configuration.
    """
    return {
        "name": settings.APP_NAME,
        "type": settings.LLM_MODEL,
        "description": f"Intelligent Agent based on {settings.LLM_PROVIDER}/{settings.LLM_MODEL}",
        "ui": {
            "type": "chat",
            "title": settings.APP_NAME,
            "features": _get_ui_features(),
        },
        "llm": {
            "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL,
        },
        "tools": {
            "count": _get_tool_count(),
        },
    }


def _get_ui_features() -> list[str]:
    """Return UI feature list based on configuration"""
    features = ["session_management", "markdown_rendering"]
    
    # Determine UI features based on tool configuration
    if settings.MAX_TOOL_CALLS > 0:
        features.append("tool_visualization")
    
    if settings.MEMORY_TYPE == "vector":
        features.append("knowledge_search")
    
    return features


def _get_tool_count() -> int:
    """Get the number of registered tools"""
    try:
        from ...l5_tools.registry import ToolRegistry
        return len(ToolRegistry.get_all())
    except Exception:
        return 0
