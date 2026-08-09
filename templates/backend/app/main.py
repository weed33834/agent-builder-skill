"""L8+L10 - Application Entry

FastAPI application instantiation, registers all routes and middleware.
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

# Configure logging
setup_logging()
logger = get_logger(__name__)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Universal Agent Builder - 10-Layer Architecture Agent Application",
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

    # Auth middleware (optional)
    if settings.API_KEY:
        app.middleware("http")(AuthMiddleware(settings.API_KEY))

    # ===== L8: API Routes =====
    app.include_router(health_router, prefix="/api", tags=["health"])
    app.include_router(chat_router, prefix="/api", tags=["chat"])
    app.include_router(config_router, prefix="/api", tags=["config"])

    # ===== Startup/Shutdown Events =====
    @app.on_event("startup")
    async def startup():
        """Initialize all layers on application startup"""
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}...")

        # L5: Register base tools
        for tool in BASE_TOOLS:
            ToolRegistry.register(tool, category="general")
            logger.info(f"  Registered tool: {tool.name}")

        # L4: Initialize Agent graph
        from .l4_agent.graph import get_graph
        graph = get_graph()
        logger.info(f"  Agent graph initialized")

        logger.info(f"  LLM provider: {settings.LLM_PROVIDER}")
        logger.info(f"  Model: {settings.LLM_MODEL}")
        logger.info(f"  Registered tools: {len(ToolRegistry.get_all())}")
        logger.info(f"{settings.APP_NAME} started successfully")

    @app.on_event("shutdown")
    async def shutdown():
        """Cleanup on application shutdown"""
        logger.info("Shutting down application...")
        ToolRegistry.clear()
        logger.info("Application closed")

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
