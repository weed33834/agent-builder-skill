"""L8 - A2A Protocol API

Exposes this agent to remote agents (M6.16 + M6.17):
- GET  /.well-known/agent.json   → Agent Card (discovery, M6.15)
- POST /a2a/rpc                  → JSON-RPC 2.0 task endpoints
- GET  /api/a2a/tasks            → task introspection (local debug)

The task handler runs the local agent graph on incoming messages.
"""

from typing import Optional

from fastapi import APIRouter, Request

from ...l7_orchestrator.a2a_server import A2AServer
from ...l7_orchestrator.base import AgentCard
from ...l10_infra.config import settings

router = APIRouter()

# Global A2A server instance (initialized in main.py startup)
a2a_server: Optional[A2AServer] = None


def init_a2a_server(base_url: Optional[str] = None, handler=None):
    """Create the global A2A server (called at app startup).

    Args:
        base_url: this server's public base URL (used in Agent Card)
        handler: async (message: dict, metadata: dict) -> result
    """
    global a2a_server
    url = base_url or getattr(settings, "APP_PUBLIC_URL", "http://localhost:8000")
    card = AgentCard(
        name=settings.APP_NAME,
        description="Universal Agent Builder - A2A-enabled agent",
        url=url,
        skills=["chat", "task-execution"],
        endpoints=["/a2a/rpc"],
    )
    a2a_server = A2AServer(card=card, handler=handler or _default_handler)
    return a2a_server


async def _default_handler(message: dict, metadata: dict):
    """Default handler: run the local agent graph with the incoming text.

    message format (A2A): {"role": "user", "parts": [{"type": "text", "text": "..."}]}
    """
    parts = message.get("parts", []) if isinstance(message, dict) else []
    text = "\n".join(
        p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text"
    )
    if not text:
        return "Error: no text content in A2A message"

    from ...l4_agent.graph import get_graph, get_graph_config
    from ...l6_memory.session_manager import get_session_manager

    graph = get_graph()
    thread_id = str(metadata.get("thread_id", "a2a")) if isinstance(metadata, dict) else "a2a"
    config = get_graph_config(thread_id)

    result = await graph.ainvoke({"messages": [("human", text)]}, config)
    messages = result.get("messages", [])
    if messages:
        last = messages[-1]
        return str(getattr(last, "content", last))
    return "No response produced"


@router.get("/.well-known/agent.json")
async def agent_card():
    """A2A Agent Card for discovery (M6.15)"""
    if a2a_server is None:
        init_a2a_server()
    return a2a_server.card_dict()


@router.post("/a2a/rpc")
async def a2a_rpc(request: Request):
    """A2A JSON-RPC 2.0 endpoint (M6.16)"""
    if a2a_server is None:
        init_a2a_server()
    payload = await request.json()
    return await a2a_server.handle_rpc(payload)


@router.get("/a2a/tasks")
async def list_a2a_tasks():
    """List in-flight A2A tasks (introspection)"""
    if a2a_server is None:
        return {"tasks": []}
    return {"tasks": a2a_server.list_tasks()}
