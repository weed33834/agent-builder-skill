"""L8 - Notification center API (deep-spec 15-ux-detail NotificationBell)

In-memory notification store (template). Includes a WebSocket endpoint for
real-time push. Endpoints:
  GET    /api/notifications         list (filter unread)
  GET    /api/notifications/unread_count
  POST   /api/notifications         create a notification (from any module)
  POST   /api/notifications/{id}/read     mark one read
  POST   /api/notifications/read_all      mark all read
  DELETE /api/notifications/{id}    delete
  WS     /api/notifications/ws      real-time stream
"""

import asyncio
import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

router = APIRouter()

_NOTIFICATIONS: list[dict] = []
_WS_CLIENTS: set[WebSocket] = set()


class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1)
    body: str = ""
    level: str = Field(default="info", pattern="^(info|success|warning|error)$")
    module: str = "system"
    link: str = ""


def _now():
    return time.time()


def _bump():
    """Best-effort push to WS subscribers."""
    for ws in list(_WS_CLIENTS):
        asyncio.get_event_loop().call_soon_threadsafe(ws.send_json, {"event": "updated"})


@router.get("/notifications")
async def list_notifications(unread_only: bool = False, module: Optional[str] = None):
    items = _NOTIFICATIONS
    if unread_only:
        items = [n for n in items if not n["read"]]
    if module:
        items = [n for n in items if n["module"] == module]
    items.sort(key=lambda n: n["created_at"], reverse=True)
    return {"items": items, "total": len(items)}


@router.get("/notifications/unread_count")
async def unread_count():
    return {"unread": sum(1 for n in _NOTIFICATIONS if not n["read"])}


@router.post("/notifications", status_code=201)
async def create_notification(req: NotificationCreate):
    note = {
        "id": uuid.uuid4().hex[:10],
        "title": req.title,
        "body": req.body,
        "level": req.level,
        "module": req.module,
        "link": req.link,
        "read": False,
        "created_at": _now(),
    }
    _NOTIFICATIONS.append(note)
    _bump()
    return note


@router.post("/notifications/{note_id}/read")
async def mark_read(note_id: str):
    for n in _NOTIFICATIONS:
        if n["id"] == note_id:
            n["read"] = True
            return {"ok": True, "id": note_id}
    raise HTTPException(status_code=404, detail=f"notification {note_id} not found")


@router.post("/notifications/read_all")
async def mark_all_read():
    for n in _NOTIFICATIONS:
        n["read"] = True
    return {"ok": True, "updated": len(_NOTIFICATIONS)}


@router.delete("/notifications/{note_id}")
async def delete_notification(note_id: str):
    _NOTIFICATIONS[:] = [n for n in _NOTIFICATIONS if n["id"] != note_id]
    return {"deleted": True, "id": note_id}


@router.websocket("/notifications/ws")
async def notifications_ws(ws: WebSocket):
    await ws.accept()
    _WS_CLIENTS.add(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _WS_CLIENTS.discard(ws)


def _seed():
    _NOTIFICATIONS.clear()
    now = _now()
    _NOTIFICATIONS.append({"id": "n1", "title": "评估完成", "body": "ev_20260811 12/12 通过", "level": "success", "module": "eval", "link": "/admin/evaluations", "read": False, "created_at": now - 300})
    _NOTIFICATIONS.append({"id": "n2", "title": "模型延迟告警", "body": "gpt-4o P95 > 3.5s 持续 5 分钟", "level": "warning", "module": "monitor", "link": "/admin/monitoring", "read": False, "created_at": now - 900})
    _NOTIFICATIONS.append({"id": "n3", "title": "知识库更新", "body": "产品文档库 +126 chunks", "level": "info", "module": "memory", "link": "/admin/memory", "read": True, "created_at": now - 3600})


_seed()
