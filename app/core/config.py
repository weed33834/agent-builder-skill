"""配置层 —— 全部走 .env,密钥永不入库。

#21 修复:生产环境 fail closed,缺少安全配置时拒绝启动。
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "心镜 MindMirror"
    env: str = "local"  # local | staging | production
    debug: bool = True  # 仅 local 环境默认 True

    database_url: str = "sqlite+aiosqlite:///./data/db/mindmirror.db"

    cors_origins: str = "http://localhost:5173,http://localhost:8000"

    auth_secret: str = "change-me-in-production"
    auth_provider: str = "local"  # local | jwt | wx

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    def validate_production(self) -> None:
        """生产环境安全校验 —— 缺少关键配置时抛 RuntimeError 拒绝启动。

        #21 修复:防止以不安全默认值上线。
        """
        if not self.is_production:
            return
        problems: list[str] = []
        if self.debug:
            problems.append("生产环境不允许 debug=True")
        if self.auth_secret in ("change-me-in-production", ""):
            problems.append("生产环境必须设置 auth_secret")
        if self.auth_provider == "local":
            problems.append("生产环境必须配置非 local 的 auth_provider")
        if self.database_url.startswith("sqlite"):
            problems.append("生产环境不应使用 SQLite")
        if problems:
            raise RuntimeError("生产配置校验失败:\n  - " + "\n  - ".join(problems))


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.validate_production()
    return s
