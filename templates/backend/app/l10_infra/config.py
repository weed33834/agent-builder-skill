"""L10 - 配置管理

从环境变量加载应用配置，提供统一的配置访问接口。
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置
    
    所有配置项从环境变量加载，支持 .env 文件。
    """
    
    # 应用信息
    APP_NAME: str = "Agent Builder"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    
    # L1: LLM 配置
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = ""
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 4096
    
    # L2: 模型接口配置
    LLM_RETRY_COUNT: int = 3
    LLM_RETRY_DELAY: float = 1.0
    MODEL_FALLBACK_ENABLED: bool = False
    FALLBACK_MODELS: List[dict] = []
    
    # L5: 工具配置
    MAX_TOOL_CALLS: int = 10
    TOOL_TIMEOUT: int = 30
    
    # L6: 记忆配置
    MEMORY_TYPE: str = "buffer"
    MEMORY_MAX_MESSAGES: int = 50
    
    # L7: 编排配置
    MAX_SUBTASKS: int = 5
    ORCHESTRATOR_TIMEOUT: int = 120
    
    # L8: API 配置
    API_KEY: str = ""
    RATE_LIMIT: int = 60  # 每分钟请求数
    RATE_LIMIT_WINDOW: int = 60  # 窗口大小（秒）
    
    # L10: 基础设施
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # 可选外部服务
    REDIS_URL: str = ""
    DATABASE_URL: str = ""
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# 全局配置实例
settings = Settings()