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


# ===== M8: Runtime config update (SettingsPanel) =====
from typing import Optional
from pydantic import BaseModel


class ConfigUpdateRequest(BaseModel):
    """Partial runtime config update (whitelisted keys only, M11 SEC-02)"""

    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_temperature: Optional[float] = None
    llm_max_tokens: Optional[int] = None
    memory_type: Optional[str] = None
    rate_limit_enabled: Optional[bool] = None


@router.put("/config")
async def update_agent_config(req: ConfigUpdateRequest):
    """Update whitelisted runtime settings (M8 配置面板)"""
    updates = req.model_dump(exclude_none=True)
    mapping = {
        "llm_provider": "LLM_PROVIDER",
        "llm_model": "LLM_MODEL",
        "llm_temperature": "LLM_TEMPERATURE",
        "llm_max_tokens": "LLM_MAX_TOKENS",
        "memory_type": "MEMORY_TYPE",
        "rate_limit_enabled": "RATE_LIMIT_ENABLED",
    }
    for k, v in updates.items():
        if k in mapping:
            setattr(settings, mapping[k], v)
    return {"ok": True, "applied": list(updates.keys())}
