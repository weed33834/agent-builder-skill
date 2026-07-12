"""配置层 —— 全部走 .env,密钥永不入库。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "心镜 MindMirror"
    env: str = "local"
    debug: bool = True

    database_url: str = "sqlite+aiosqlite:///./data/db/mindmirror.db"

    cors_origins: str = "http://localhost:5173,http://localhost:8000"

    auth_secret: str = "change-me-in-production"
    auth_provider: str = "local"  # local | jwt | wx

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
