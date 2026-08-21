"""L8 - Workspace API (deep-spec 16 enterprise-org / WorkspacePanel)

Workspaces provide department/project/personal resource isolation: agents,
knowledge bases and sessions scoped to a workspace. In-memory store (template).

Endpoints:
  GET    /api/workspaces            list workspaces (filter type)
  POST   /api/workspaces            create workspace
  GET    /api/workspaces/{id}       workspace detail + members + resources
  PUT    /api/workspaces/{id}       update (name/type/quota/description)
  DELETE /api/workspaces/{id}       delete workspace
  POST   /api/workspaces/{id}/members  add member
  DELETE /api/workspaces/{id}/members/{member} remove member
"""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

_WORKSPACES: dict[str, dict] = {}


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    type: str = Field(default="personal", pattern="^(dept|project|personal)$")
    description: str = ""
    owner: str = "admin"
    quota: dict = Field(default_factory=lambda: {"agents": 50, "kbs": 20, "members": 20})


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    quota: Optional[dict] = None


class MemberAdd(BaseModel):
    member: str = Field(..., description="user id")
    role: str = Field(default="member", pattern="^(owner|admin|member)$")


def _now():
    return time.time()


def _find(ws_id: str) -> dict:
    ws = _WORKSPACES.get(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail=f"workspace {ws_id} not found")
    return ws


@router.get("/workspaces")
async def list_workspaces(type: Optional[str] = Query(None, pattern="^(dept|project|personal)$"), member: Optional[str] = None):
    items = list(_WORKSPACES.values())
    if type:
        items = [w for w in items if w["type"] == type]
    if member:
        items = [w for w in items if any(m["id"] == member for m in w["members"]) or w["owner"] == member]
    items.sort(key=lambda w: w["created_at"], reverse=True)
    return {"items": items, "total": len(items)}


@router.post("/workspaces", status_code=201)
async def create_workspace(req: WorkspaceCreate):
    ws = {
        "id": uuid.uuid4().hex[:10],
        "name": req.name,
        "type": req.type,
        "description": req.description,
        "owner": req.owner,
        "quota": req.quota,
        "members": [{"id": req.owner, "role": "owner"}],
        "resources": {"agents": 0, "kbs": 0, "sessions": 0},
        "created_at": _now(),
        "updated_at": _now(),
    }
    _WORKSPACES[ws["id"]] = ws
    return ws


@router.get("/workspaces/{ws_id}")
async def get_workspace(ws_id: str):
    return _find(ws_id)


@router.put("/workspaces/{ws_id}")
async def update_workspace(ws_id: str, req: WorkspaceUpdate):
    ws = _find(ws_id)
    for field, value in req.model_dump(exclude_none=True).items():
        ws[field] = value
    ws["updated_at"] = _now()
    return ws


@router.delete("/workspaces/{ws_id}")
async def delete_workspace(ws_id: str):
    _find(ws_id)
    del _WORKSPACES[ws_id]
    return {"deleted": True, "id": ws_id}


@router.post("/workspaces/{ws_id}/members")
async def add_member(ws_id: str, req: MemberAdd):
    ws = _find(ws_id)
    for m in ws["members"]:
        if m["id"] == req.member:
            m["role"] = req.role
            return ws
    ws["members"].append({"id": req.member, "role": req.role})
    ws["updated_at"] = _now()
    return ws


@router.delete("/workspaces/{ws_id}/members/{member}")
async def remove_member(ws_id: str, member: str):
    ws = _find(ws_id)
    ws["members"] = [m for m in ws["members"] if m["id"] != member]
    ws["updated_at"] = _now()
    return ws


def _seed():
    _WORKSPACES.clear()
    now = _now()
    _WORKSPACES["ws_default"] = {
        "id": "ws_default", "name": "个人工作区", "type": "personal",
        "description": "默认个人空间", "owner": "admin",
        "quota": {"agents": 50, "kbs": 20, "members": 20},
        "members": [{"id": "admin", "role": "owner"}],
        "resources": {"agents": 4, "kbs": 2, "sessions": 12},
        "created_at": now - 86400, "updated_at": now - 60,
    }
    _WORKSPACES["ws_proj_a"] = {
        "id": "ws_proj_a", "name": "智能客服项目组", "type": "project",
        "description": "客服 Agent 研发与运维", "owner": "admin",
        "quota": {"agents": 30, "kbs": 10, "members": 12},
        "members": [{"id": "admin", "role": "owner"}, {"id": "alice", "role": "admin"}, {"id": "bob", "role": "member"}],
        "resources": {"agents": 2, "kbs": 1, "sessions": 5},
        "created_at": now - 3600, "updated_at": now - 30,
    }


_seed()
