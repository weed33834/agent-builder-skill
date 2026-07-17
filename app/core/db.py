"""数据库会话 —— async engine + session factory。"""

from collections.abc import AsyncGenerator

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
