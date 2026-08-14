"""L8+L10 - Application Entry

FastAPI application instantiation, registers all routes and middleware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .l8_api.routes.chat import router as chat_router
from .l8_api.routes.health import router as health_router
from .l8_api.routes.config import router as config_router
from .l8_api.routes.sessions import router as sessions_router
from .l8_api.routes.tools import router as tools_router
from .l8_api.routes.a2a import router as a2a_router
from .l8_api.routes.a2a import api_router as a2a_api_router
from .l8_api.routes.voice import router as voice_router
from .l8_api.routes.nlp import router as nlp_router
from .l8_api.routes.security import router as security_router
from .l8_api.routes.admin import router as admin_router
from .l8_api.routes.tasks import router as tasks_router
from .l8_api.routes.workspaces import router as workspaces_router
from .l8_api.routes.skills import router as skills_router
from .l8_api.routes.notifications import router as notifications_router
from .l8_api.routes.canvas import router as canvas_router
from .l8_api.routes.sandbox import router as sandbox_router
from .l8_api.middleware.auth import AuthMiddleware
from .l8_api.middleware.logging import RequestLoggingMiddleware
from .l8_api.middleware.rate_limit import RateLimitMiddleware
from .l5_tools.registry import ToolRegistry
from .l5_tools.base_tools import BASE_TOOLS
try:
    from .l5_tools.custom_tools import CUSTOM_TOOLS
except ImportError:
    # custom_tools.py is generated per-config; the static template has none
    CUSTOM_TOOLS = []
from .l10_infra.config import settings
from .l10_infra.logging import setup_logging, get_logger
from .l10_infra.monitoring import metrics

# Configure logging
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: init all layers on startup, cleanup on shutdown
    (replaces deprecated @app.on_event, FastAPI >= 0.93)
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")

    # L5: Register base tools
    for tool in BASE_TOOLS:
        ToolRegistry.register(tool, category="general")
        logger.info(f"  Registered tool: {tool.name}")
    for tool in CUSTOM_TOOLS:
        ToolRegistry.register(tool, category="custom")
        logger.info(f"  Registered custom tool: {tool.name}")

    # L4: Initialize Agent graph
    from .l4_agent.graph import get_graph
    graph = get_graph()
    logger.info("  Agent graph initialized")

    # L7: Initialize A2A server (M6.16)
    from .l8_api.routes.a2a import init_a2a_server
    init_a2a_server(handler=None)
    logger.info("  A2A server ready at /.well-known/agent.json")

    logger.info(f"  LLM provider: {settings.LLM_PROVIDER}")
    logger.info(f"  Model: {settings.LLM_MODEL}")
    logger.info(f"  Registered tools: {len(ToolRegistry.get_all())}")
    logger.info(f"{settings.APP_NAME} started successfully")

    yield

    logger.info("Shutting down application...")
    # Close MCP client connections (M4.16)
    from .l5_tools.mcp_client import mcp_client
    await mcp_client.disconnect_all()
    ToolRegistry.clear()
    logger.info("Application closed")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Universal Agent Builder - 10-Layer Architecture Agent Application",
        lifespan=lifespan,
    )

    # ===== L10: Infrastructure =====
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request logging (structured logs + metrics, M13.1/M13.5)
    app.middleware("http")(RequestLoggingMiddleware())

    # Rate limiting (M7.9)
    if settings.RATE_LIMIT_ENABLED:
        app.middleware("http")(
            RateLimitMiddleware(
                enabled=True,
                rps=settings.RATE_LIMIT_RPS,
                burst=settings.RATE_LIMIT_BURST,
            )
        )

    # Auth middleware (optional)
    if settings.API_KEY:
        app.middleware("http")(AuthMiddleware(settings.API_KEY))

    # ===== L8: API Routes =====
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])
    app.include_router(config_router, prefix="/api", tags=["config"])
    app.include_router(sessions_router, prefix="/api", tags=["sessions"])
    app.include_router(tools_router, prefix="/api", tags=["tools"])
    app.include_router(a2a_router, prefix="", tags=["a2a"])
    app.include_router(a2a_api_router, prefix="/api", tags=["a2a"])
    app.include_router(voice_router, prefix="/api", tags=["voice"])
    app.include_router(nlp_router, prefix="/api", tags=["nlp"])
    app.include_router(security_router, prefix="/api", tags=["security"])
    app.include_router(admin_router, prefix="/api", tags=["admin"])
    app.include_router(tasks_router, prefix="/api", tags=["tasks"])
    app.include_router(workspaces_router, prefix="/api", tags=["workspaces"])
    app.include_router(skills_router, prefix="/api", tags=["skills"])
    app.include_router(notifications_router, prefix="/api", tags=["notifications"])
    app.include_router(canvas_router, prefix="/api", tags=["canvas"])
    app.include_router(sandbox_router, prefix="/api", tags=["sandbox"])

    # ===== L10: Metrics endpoint (M13.2) =====
    @app.get("/metrics")
    async def metrics_endpoint():
        """Prometheus-format metrics (M13.2)"""
        return metrics.export_prometheus()

    return app


# Create application instance
app = create_app()


# Start when run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
