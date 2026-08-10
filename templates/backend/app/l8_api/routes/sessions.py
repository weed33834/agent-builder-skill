"""L8 - Session Management API

Session CRUD endpoints (M7.3 + M7.4):
- GET    /api/sessions          list sessions
- POST   /api/sessions          create session
- GET    /api/sessions/{id}     session detail
- GET    /api/sessions/{id}/messages   message history
- DELETE /api/sessions/{id}     delete session
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..schemas import SessionInfo
from ...l6_memory.session_manager import get_session_manager
from ...l10_infra.errors import SessionNotFoundError

router = APIRouter()


class CreateSessionRequest(BaseModel):
    title: str = Field(default="New Chat", max_length=200)


def _to_session_info(s: dict) -> SessionInfo:
    """Map internal session dict to the API schema"""
    return SessionInfo(
        id=s.get("id", ""),
        title=s.get("title", ""),
        created_at=s.get("created_at", ""),
        updated_at=s.get("updated_at", ""),
        message_count=s.get("message_count", 0),
    )


@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(limit: int = 50, offset: int = 0):
    """List sessions (M7.3)"""
    mgr = get_session_manager()
    sessions = mgr.list_sessions()
    return [_to_session_info(s) for s in sessions[offset:offset + limit]]


@router.post("/sessions", response_model=SessionInfo)
async def create_session(req: CreateSessionRequest):
    """Create a new session (M7.3)"""
    mgr = get_session_manager()
    session_id = mgr.create_session(title=req.title)
    info = mgr.get_session(session_id)
    if not info:
        raise HTTPException(status_code=500, detail="Session creation failed")
    return _to_session_info(info)


@router.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session detail (M7.3)"""
    mgr = get_session_manager()
    info = mgr.get_session(session_id)
    if not info:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return _to_session_info(info)


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, limit: int = 100):
    """Get message history (M7.4)"""
    mgr = get_session_manager()
    messages = mgr.get_history(session_id, limit=limit)
    return {"session_id": session_id, "messages": messages}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session (M7.3)"""
    mgr = get_session_manager()
    deleted = mgr.delete_session(session_id)
    if not deleted:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return {"deleted": True, "session_id": session_id}
