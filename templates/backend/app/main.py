"""L8+L10 - 应用入口

FastAPI 应用实例化，注册所有路由和中间件。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .l8_api.routes.chat import router as chat_router
from .l8_api.routes.health import router as health_router
from .l8_api.routes.config import router as config_router
from .l8_api.middleware.auth import AuthMiddleware
from .l5_tools.registry import ToolRegistry
from .l5_tools.base_tools import BASE_TOOLS
from .l10_infra.config import settings
from .l10_infra.logging import setup_logging, get_logger

# 配置日志
setup_logging()
logger = get_logger(__name__)


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="万能 Agent 构建器 - 10 层架构智能体应用",
    )
    
    # ===== L10: 基础设施 =====
    # CORS 配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 认证中间件（可选）
    if settings.API_KEY:
        app.middleware("http")(AuthMiddleware(settings.API_KEY))
    
    # ===== L8: API 路由 =====
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])
    app.include_router(config_router, prefix="/api", tags=["config"])
    
    # ===== 启动/关闭事件 =====
    @app.on_event("startup")
    async def startup():
        """应用启动时初始化各层"""
        logger.info(f"正在启动 {settings.APP_NAME} v{settings.APP_VERSION}...")
        
        # L5: 注册基础工具
        for tool in BASE_TOOLS:
            ToolRegistry.register(tool, category="general")
            logger.info(f"  注册工具: {tool.name}")
        
        # L4: 初始化 Agent 图
        from .l4_agent.graph import get_graph
        graph = get_graph()
        logger.info(f"  Agent 图已初始化")
        
        logger.info(f"  LLM 提供商: {settings.LLM_PROVIDER}")
        logger.info(f"  模型: {settings.LLM_MODEL}")
        logger.info(f"  已注册工具: {len(ToolRegistry.get_all())} 个")
        logger.info(f"{settings.APP_NAME} 启动完成")
    
    @app.on_event("shutdown")
    async def shutdown():
        """应用关闭时清理"""
        logger.info("正在关闭应用...")
        ToolRegistry.clear()
        logger.info("应用已关闭")
    
    return app


# 创建应用实例
app = create_app()


# 直接运行时启动
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )