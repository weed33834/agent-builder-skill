"""L8 - Ability library API (deep-spec 15-ux-detail SkillSidebar)

The ability library exposes three kinds of reusable capabilities to agents:
  * experts   — persona/template packs (e.g. "写作专家")
  * skills    — atomic skills / plugins (e.g. "周报生成")
  * connectors— external service connectors (e.g. "钉钉", "飞书", "GitHub")

In-memory store (template). Endpoints:
  GET    /api/skills            list all (kind filter: expert|skill|connector)
  GET    /api/skills/{kind}/{id}  detail
  POST   /api/skills            create an item
  PUT    /api/skills/{kind}/{id}  update
  DELETE /api/skills/{kind}/{id}  delete
"""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

_LIB: list[dict] = []


class SkillCreate(BaseModel):
    kind: str = Field(..., pattern="^(expert|skill|connector)$")
    name: str = Field(..., min_length=1)
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    config: dict = Field(default_factory=dict)
    enabled: bool = True


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    config: Optional[dict] = None
    enabled: Optional[bool] = None


def _now():
    return time.time()


def _find(kind: str, item_id: str) -> dict:
    for it in _LIB:
        if it["kind"] == kind and it["id"] == item_id:
            return it
    raise HTTPException(status_code=404, detail=f"{kind} {item_id} not found")


@router.get("/skills")
async def list_skills(kind: Optional[str] = Query(None, pattern="^(expert|skill|connector)$"), q: Optional[str] = None):
    items = _LIB
    if kind:
        items = [i for i in items if i["kind"] == kind]
    if q:
        items = [i for i in items if q.lower() in i["name"].lower() or q.lower() in i["description"].lower()]
    return {"items": items, "total": len(items)}


@router.get("/skills/{kind}/{item_id}")
async def get_skill(kind: str, item_id: str):
    return _find(kind, item_id)


@router.post("/skills", status_code=201)
async def create_skill(req: SkillCreate):
    item = {
        "id": uuid.uuid4().hex[:10],
        "kind": req.kind,
        "name": req.name,
        "description": req.description,
        "tags": req.tags,
        "config": req.config,
        "enabled": req.enabled,
        "created_at": _now(),
    }
    _LIB.append(item)
    return item


@router.put("/skills/{kind}/{item_id}")
async def update_skill(kind: str, item_id: str, req: SkillUpdate):
    it = _find(kind, item_id)
    for f, v in req.model_dump(exclude_none=True).items():
        it[f] = v
    return it


@router.delete("/skills/{kind}/{item_id}")
async def delete_skill(kind: str, item_id: str):
    _find(kind, item_id)
    _LIB[:] = [i for i in _LIB if not (i["kind"] == kind and i["id"] == item_id)]
    return {"deleted": True, "id": item_id}


def _seed():
    _LIB.clear()
    now = _now()
    _LIB.append({"id": "exp_writer", "kind": "expert", "name": "写作专家", "description": "营销/公文/社媒文案与润色", "tags": ["writing", "copy"], "config": {"role": "资深文案"}, "enabled": True, "created_at": now - 500})
    _LIB.append({"id": "exp_data", "kind": "expert", "name": "数据分析师", "description": "统计分析、图表与报告", "tags": ["data", "chart"], "config": {"role": "数据分析"}, "enabled": True, "created_at": now - 400})
    _LIB.append({"id": "skl_weekly", "kind": "skill", "name": "周报生成", "description": "从日程/任务聚合生成周报", "tags": ["report", "weekly"], "config": {}, "enabled": True, "created_at": now - 300})
    _LIB.append({"id": "skl_rag", "kind": "skill", "name": "RAG 检索增强", "description": "多路召回 + 引用溯源", "tags": ["rag", "memory"], "config": {"top_k": 5}, "enabled": True, "created_at": now - 200})
    _LIB.append({"id": "con_dingtalk", "kind": "connector", "name": "钉钉", "description": "消息/文档/审批连接器", "tags": ["dingtalk"], "config": {"auth": "oauth"}, "enabled": True, "created_at": now - 100})


_seed()
