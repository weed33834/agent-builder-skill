"""L8 - Canvas API (deep-spec 15-ux-detail CanvasView)

A canvas is a node/edge graph that visually composes agents, tools and data
sources into a workflow. Stored as JSON. In-memory store (template).

Endpoints:
  GET    /api/canvas            list canvases
  POST   /api/canvas            create canvas
  GET    /api/canvas/{id}       canvas with nodes + edges
  PUT    /api/canvas/{id}       update nodes/edges/name
  DELETE /api/canvas/{id}       delete
"""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

_CANVASES: dict[str, dict] = {}


class CanvasNode(BaseModel):
    id: str = Field(..., min_length=1)
    type: str = Field(default="agent", description="agent|tool|memory|llm|trigger|output")
    label: str = ""
    x: float = 0
    y: float = 0
    data: dict = Field(default_factory=dict)


class CanvasEdge(BaseModel):
    id: str = ""
    source: str = Field(..., min_length=1)
    target: str = Field(..., min_length=1)
    label: str = ""


class CanvasCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    nodes: list[CanvasNode] = Field(default_factory=list)
    edges: list[CanvasEdge] = Field(default_factory=list)


class CanvasUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[list[CanvasNode]] = None
    edges: Optional[list[CanvasEdge]] = None


def _now():
    return time.time()


def _find(canvas_id: str) -> dict:
    c = _CANVASES.get(canvas_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"canvas {canvas_id} not found")
    return c


@router.get("/canvas")
async def list_canvases():
    items = sorted(_CANVASES.values(), key=lambda c: c["created_at"], reverse=True)
    # light payload (omit heavy nodes/edges)
    return {"items": [{k: v for k, v in c.items() if k != "nodes" and k != "edges"} for c in items], "total": len(items)}


@router.post("/canvas", status_code=201)
async def create_canvas(req: CanvasCreate):
    canvas = {
        "id": uuid.uuid4().hex[:10],
        "name": req.name,
        "description": req.description,
        "nodes": [n.model_dump() for n in req.nodes],
        "edges": [e.model_dump() for e in req.edges],
        "created_at": _now(),
        "updated_at": _now(),
    }
    _CANVASES[canvas["id"]] = canvas
    return canvas


@router.get("/canvas/{canvas_id}")
async def get_canvas(canvas_id: str):
    return _find(canvas_id)


@router.put("/canvas/{canvas_id}")
async def update_canvas(canvas_id: str, req: CanvasUpdate):
    c = _find(canvas_id)
    if req.name is not None:
        c["name"] = req.name
    if req.description is not None:
        c["description"] = req.description
    if req.nodes is not None:
        c["nodes"] = [n.model_dump() for n in req.nodes]
    if req.edges is not None:
        c["edges"] = [e.model_dump() for e in req.edges]
    c["updated_at"] = _now()
    return c


@router.delete("/canvas/{canvas_id}")
async def delete_canvas(canvas_id: str):
    _find(canvas_id)
    del _CANVASES[canvas_id]
    return {"deleted": True, "id": canvas_id}


def _seed():
    _CANVASES.clear()
    now = _now()
    _CANVASES["cv_default"] = {
        "id": "cv_default", "name": "客服编排", "description": "客服多 Agent 编排画布",
        "nodes": [
            {"id": "trig", "type": "trigger", "label": "用户提问", "x": 60, "y": 160, "data": {}},
            {"id": "sup", "type": "agent", "label": "supervisor", "x": 260, "y": 160, "data": {}},
            {"id": "order", "type": "agent", "label": "order_agent", "x": 500, "y": 60, "data": {}},
            {"id": "refund", "type": "agent", "label": "refund_agent", "x": 500, "y": 260, "data": {}},
            {"id": "agg", "type": "output", "label": "聚合回复", "x": 720, "y": 160, "data": {}},
        ],
        "edges": [
            {"id": "e1", "source": "trig", "target": "sup", "label": ""},
            {"id": "e2", "source": "sup", "target": "order", "label": "订单类"},
            {"id": "e3", "source": "sup", "target": "refund", "label": "退款类"},
            {"id": "e4", "source": "order", "target": "agg", "label": ""},
            {"id": "e5", "source": "refund", "target": "agg", "label": ""},
        ],
        "created_at": now - 600, "updated_at": now - 60,
    }


_seed()
