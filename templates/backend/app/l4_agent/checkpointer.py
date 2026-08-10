"""L4 - Checkpoint & Persistence

Checkpoint management for LangGraph (M3.12 interrupt/resume + M3.11 HITL).
Provides pluggable checkpointers:

- InMemoryCheckpointer: default, non-persistent (dev)
- SqliteCheckpointer: single-file persistence (light production)
- PostgresCheckpointer: production persistence (optional dependency)
"""

from typing import Optional
from ..l10_infra.config import settings


def create_checkpointer(checkpoint_type: Optional[str] = None):
    """Factory: create a LangGraph BaseCheckpointSaver.

    Args:
        checkpoint_type: "memory" | "sqlite" | "postgres" (default from settings)
    Returns:
        A LangGraph-compatible checkpointer instance.
    """
    ctype = (checkpoint_type or settings.CHECKPOINT_TYPE or "memory").lower()

    if ctype == "postgres":
        return _create_postgres_checkpointer()
    if ctype == "sqlite":
        return _create_sqlite_checkpointer()
    return _create_memory_checkpointer()


def _create_memory_checkpointer():
    """In-memory checkpointer (dev default)"""
    from langgraph.checkpoint.memory import MemorySaver
    return MemorySaver()


def _create_sqlite_checkpointer():
    """SQLite-backed checkpointer for lightweight persistence"""
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        import sqlite3

        db_path = settings.CHECKPOINT_DB_PATH or "./agent_checkpoints.db"
        conn = sqlite3.connect(db_path, check_same_thread=False)
        return SqliteSaver(conn)
    except ImportError as e:
        raise ImportError(
            "SQLite checkpointer requires langgraph-checkpoint-sqlite. "
            "Install with: pip install langgraph-checkpoint-sqlite"
        ) from e


def _create_postgres_checkpointer():
    """PostgreSQL-backed checkpointer for production (M9.12)"""
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg_pool import ConnectionPool

        dsn = settings.CHECKPOINT_DB_DSN or settings.DATABASE_URL
        if not dsn:
            raise ValueError("CHECKPOINT_DB_DSN / DATABASE_URL is required for postgres checkpointer")

        pool = ConnectionPool(conninfo=dsn, max_size=10)
        checkpointer = PostgresSaver(pool)
        checkpointer.setup()
        return checkpointer
    except ImportError as e:
        raise ImportError(
            "Postgres checkpointer requires langgraph-checkpoint-postgres and psycopg[binary]. "
            "Install with: pip install langgraph-checkpoint-postgres psycopg[binary]"
        ) from e


# ── Helper: build graph config with thread_id (M5.1 session binding) ──

def build_thread_config(thread_id: str, checkpoint: object = None, **extra) -> dict:
    """Build a LangGraph run config bound to a thread/session.

    Args:
        thread_id: session thread ID (used by memory persistence)
        checkpoint: checkpointer instance (optional)
        extra: additional config fields (e.g. recursion_limit)
    """
    config: dict = {"configurable": {"thread_id": thread_id}}
    if checkpoint is not None:
        config["checkpoint"] = checkpoint
    config["configurable"].update(extra)
    return config


# ── HITL helpers (M3.11) ────────────────────────────────────────

async def interrupt_for_approval(
    graph,
    state: dict,
    config: dict,
    approval_key: str = "requires_approval",
) -> dict:
    """Run the graph and pause at an interrupt point for human approval.

    Usage pattern (LangGraph 1.0 interrupt):
        - Node returns {"interrupts": [...]} with a special marker
        - After the run, inspect state; if approval needed, wait for user input
        - Resume with graph.ainvoke(Command(resume=...), config)

    Returns the final state dict after the (possibly resumed) run.
    """
    from langgraph.types import Command

    result = await graph.ainvoke(state, config)

    # Check whether an interrupt was raised
    if isinstance(result, dict) and result.get(approval_key):
        return {"status": "awaiting_approval", "state": result}
    return {"status": "completed", "state": result}


def build_resume_command(value) -> "Command":
    """Build a Command to resume an interrupted graph run (M3.11/M3.12)"""
    from langgraph.types import Command
    return Command(resume=value)
