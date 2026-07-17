"""数据库会话 —— async engine + session factory。"""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# SQLite 需要开 check_same_thread=False 才能在 async 下工作
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_async_engine(settings.database_url, echo=False, connect_args=connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    # #19 修复:异常时显式 rollback,避免 Postgres 下锁未释放
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """建表 —— 本地开发用,上线走 Alembic 迁移。"""
    from app.models.base import Base  # noqa: PLC0415 — 延迟导入避免循环

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 本地 SQLite 增量迁移(无 Alembic):补齐 user 表新增列
        await _migrate_users(conn)


async def _migrate_users(conn) -> None:
    """已有库缺 email/password_hash 时 ALTER 补列。

    SQLite 不支持 ALTER ADD COLUMN ... UNIQUE,故分两步:先加裸列,再建唯一索引。
    """

    def _cols(sync_conn):
        from sqlalchemy import inspect as _inspect

        return {c["name"] for c in _inspect(sync_conn).get_columns("users")}

    cols = await conn.run_sync(_cols)
    if "email" not in cols:
        await conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
        # 唯一索引(允许多个 NULL,兼容存量匿名用户)
        await conn.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email)")
        )
    if "password_hash" not in cols:
        await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
