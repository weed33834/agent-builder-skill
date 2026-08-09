"""L10 - Configuration Management

Loads application configuration from environment variables and provides a unified configuration access interface.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application global configuration

    All configuration items are loaded from environment variables, with .env file support.
    """

    # Application info
    APP_NAME: str = "Agent Builder"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    # L1: LLM configuration
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = ""
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 4096

    # L2: Model interface configuration
    LLM_RETRY_COUNT: int = 3
    LLM_RETRY_DELAY: float = 1.0
    MODEL_FALLBACK_ENABLED: bool = False
    FALLBACK_MODELS: List[dict] = []

    # L5: Tools configuration
    MAX_TOOL_CALLS: int = 10
    TOOL_TIMEOUT: int = 30

    # L6: Memory configuration
    MEMORY_TYPE: str = "buffer"
    MEMORY_MAX_MESSAGES: int = 50

    # L7: Orchestration configuration
    MAX_SUBTASKS: int = 5
    ORCHESTRATOR_TIMEOUT: int = 120

    # L8: API configuration
    API_KEY: str = ""
    RATE_LIMIT: int = 60  # Requests per minute
    RATE_LIMIT_WINDOW: int = 60  # Window size (seconds)

    # L10: Infrastructure
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Optional external services
    REDIS_URL: str = ""
    DATABASE_URL: str = ""
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global configuration instance
settings = Settings()
