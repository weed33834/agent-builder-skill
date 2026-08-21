"""L8 - Session Management API

Session CRUD endpoints (M7.3 + M7.4) extended with the workspace feature set
(full-spec G1-G5):
- GET    /api/sessions?q=&group_id=&favorite=   list/search/filter sessions
- POST   /api/sessions                          create session
- GET    /api/sessions/{id}                     session detail
- PUT    /api/sessions/{id}                     rename / regroup / favorite
- GET    /api/sessions/{id}/messages            message history
- DELETE /api/sessions/{id}                     delete session
- GET    /api/sessions/groups                   list session groups (G1)
- POST   /api/sessions/{id}/share               create share token (G4)
- DELETE /api/sessions/{id}/share               revoke share (G4)
- GET    /api/sessions/share/{token}            view a shared session (G4)
- GET    /api/sessions/{id}/export              export as markdown (G4)
- GET    /api/sessions/{id}/files               list attachments (G5)
- POST   /api/sessions/{id}/files               upload attachment (G5)
- DELETE /api/sessions/{id}/files/{att_id}      remove attachment (G5)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from ..schemas import SessionInfo
from ...l6_memory.session_manager import get_session_manager
from ...l10_infra.errors import SessionNotFoundError

router = APIRouter()


class CreateSessionRequest(BaseModel):
    title: str = Field(default="New Chat", max_length=200)
    group_id: str = Field(default="", max_length=100)


class UpdateSessionRequest(BaseModel):
    title: str | None = None
    group_id: str | None = None
    favorite: bool | None = None


def _to_session_info(s: dict) -> SessionInfo:
    return SessionInfo(
        id=s.get("id", ""),
        title=s.get("title", ""),
        created_at=s.get("created_at", ""),
        updated_at=s.get("updated_at", ""),
        message_count=s.get("message_count", 0),
    )


@router.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(q: str = "", group_id: str = "", favorite: bool = False, limit: int = 100, offset: int = 0):
    """List sessions with optional search / group / favorite filters (M7.3 + G1/G2/G3)."""
    mgr = get_session_manager()
    sessions = mgr.list_sessions(q=q, group_id=group_id, favorite=favorite)
    return [_to_session_info(s) for s in sessions[offset:offset + limit]]


@router.get("/sessions/groups")
async def list_session_groups():
    """List session groups (G1 Projects)."""
    return {"items": get_session_manager().list_groups()}


@router.post("/sessions", response_model=SessionInfo)
async def create_session(req: CreateSessionRequest):
    mgr = get_session_manager()
    session_id = mgr.create_session(title=req.title, group_id=req.group_id)
    info = mgr.get_session(session_id)
    if not info:
        raise HTTPException(status_code=500, detail="Session creation failed")
    return _to_session_info(info)


@router.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    mgr = get_session_manager()
    info = mgr.get_session(session_id)
    if not info:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return _to_session_info(info)


@router.put("/sessions/{session_id}", response_model=SessionInfo)
async def update_session(session_id: str, req: UpdateSessionRequest):
    """Rename / regroup / favorite a session (M7.3 + G1/G3)."""
    mgr = get_session_manager()
    fields = {}
    if req.title is not None:
        fields["title"] = req.title
    if req.group_id is not None:
        fields["group_id"] = req.group_id
    if req.favorite is not None:
        fields["favorite"] = req.favorite
    info = mgr.update_session(session_id, **fields)
    if not info:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return _to_session_info(info)


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, limit: int = 100):
    mgr = get_session_manager()
    messages = mgr.get_history(session_id, limit=limit)
    return {"session_id": session_id, "messages": messages}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    mgr = get_session_manager()
    if not mgr.get_session(session_id):
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    mgr.delete_session(session_id)
    return {"deleted": True, "session_id": session_id}


# ---------------------------------------------------------------------------
# G4 — Share / Export
# ---------------------------------------------------------------------------
@router.post("/sessions/{session_id}/share")
async def create_share(session_id: str):
    token = get_session_manager().create_share(session_id)
    if not token:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return {"ok": True, "share_token": token, "url": f"/api/sessions/share/{token}"}


@router.delete("/sessions/{session_id}/share")
async def revoke_share(session_id: str):
    ok = get_session_manager().revoke_share(session_id)
    if ok is None:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return {"ok": True}


@router.get("/sessions/share/{token}")
async def view_shared(token: str):
    mgr = get_session_manager()
    s = mgr.get_by_share_token(token)
    if not s:
        raise HTTPException(status_code=404, detail="share link invalid or revoked")
    return {"id": s["id"], "title": s["title"], "created_at": s["created_at"], "messages": mgr.get_history(s["id"], limit=1000)}


@router.get("/sessions/{session_id}/export")
async def export_session(session_id: str, fmt: str = "md"):
    """Export session as markdown (G4)."""
    md = get_session_manager().export_markdown(session_id)
    if md is None:
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(md, media_type="text/markdown", headers={"Content-Disposition": "attachment; filename=session.md"})


# ---------------------------------------------------------------------------
# G5 — Attachments
# ---------------------------------------------------------------------------
@router.get("/sessions/{session_id}/files")
async def list_files(session_id: str):
    mgr = get_session_manager()
    if not mgr.get_session(session_id):
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    return {"items": mgr.list_attachments(session_id)}


@router.post("/sessions/{session_id}/files")
async def upload_file(session_id: str, file: UploadFile = File(...)):
    """Upload an attachment into a session (G5). Saved under data/uploads/. """
    mgr = get_session_manager()
    if not mgr.get_session(session_id):
        raise SessionNotFoundError(f"Session '{session_id}' not found")
    from pathlib import Path
    uploads_dir = Path(__file__).resolve().parents[4] / "data" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    safe_name = (file.filename or "file").replace("/", "_").replace("\\", "_")
    dest = uploads_dir / f"{session_id[:8]}_{safe_name}"
    content = await file.read()
    dest.write_bytes(content)
    att = mgr.add_attachment(session_id, safe_name, str(dest), len(content), kind=file.content_type or "file")
    return {"ok": True, "attachment": att}


@router.delete("/sessions/{session_id}/files/{att_id}")
async def remove_file(session_id: str, att_id: str):
    ok = get_session_manager().remove_attachment(session_id, att_id)
    if not ok:
        raise HTTPException(status_code=404, detail="attachment not found")
    return {"ok": True}
