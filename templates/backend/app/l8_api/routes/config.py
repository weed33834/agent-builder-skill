"""L8 - Agent 配置 API 端点

提供当前 Agent 配置信息，供前端动态渲染 UI。
"""
from fastapi import APIRouter
from ...l10_infra.config import settings

router = APIRouter()


@router.get("/config")
async def get_agent_config():
    """获取当前 Agent 配置信息
    
    前端根据此配置动态渲染 UI 功能。
    """
    return {
        "name": settings.APP_NAME,
        "type": settings.LLM_MODEL,
        "description": f"基于 {settings.LLM_PROVIDER}/{settings.LLM_MODEL} 的智能 Agent",
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
    """根据配置返回 UI 功能列表"""
    features = ["session_management", "markdown_rendering"]
    
    # 根据工具配置决定 UI 功能
    if settings.MAX_TOOL_CALLS > 0:
        features.append("tool_visualization")
    
    if settings.MEMORY_TYPE == "vector":
        features.append("knowledge_search")
    
    return features


def _get_tool_count() -> int:
    """获取已注册工具数量"""
    try:
        from ...l5_tools.registry import ToolRegistry
        return len(ToolRegistry.get_all())
    except Exception:
        return 0