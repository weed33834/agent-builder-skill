"""L8 - Task execution tracking API (workspace / TaskCard)

Agent tasks are long-running multi-step executions with progress, step logs,
result, retry and cancel. In-memory store (template); swap for a durable
queue (Celery/Redis) in production.

Endpoints:
  POST   /api/tasks                create a task
  GET    /api/tasks                list tasks (filter by status)
  GET    /api/tasks/{id}           task detail + step logs
  POST   /api/tasks/{id}/progress  append a step log / update progress
  POST   /api/tasks/{id}/complete  mark done with result
  POST   /api/tasks/{id}/fail      mark failed with error
  POST   /api/tasks/{id}/retry     reset & re-run
  POST   /api/tasks/{id}/cancel    cancel (if running)
  DELETE /api/tasks/{id}           remove a task
"""

import time
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

# status: pending -> running -> done | failed | cancelled
_TASKS: dict[str, dict] = {}


class TaskStep(BaseModel):
    name: str
    status: str = "running"          # running | done | failed
    detail: str = ""
    ts: float = Field(default_factory=time.time)


class TaskCreate(BaseModel):
    title: str = Field(..., description="task title")
    description: str = ""
    steps: list[TaskStep] = Field(default_factory=list)


class TaskProgress(BaseModel):
    progress: Optional[int] = Field(None, ge=0, le=100, description="0-100")
    step: Optional[TaskStep] = None  # append a step log
    note: Optional[str] = None


class TaskComplete(BaseModel):
    result: str = ""
    progress: int = 100


class TaskFail(BaseModel):
    error: str = ""


def _now():
    return time.time()


def _find(task_id: str) -> dict:
    t = _TASKS.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"task {task_id} not found")
    return t


@router.post("/tasks", status_code=201)
async def create_task(req: TaskCreate):
    task = {
        "id": uuid.uuid4().hex[:12],
        "title": req.title,
        "description": req.description,
        "status": "pending",
        "progress": 0,
        "steps": [s.model_dump() for s in req.steps],
        "result": "",
        "error": "",
        "created_at": _now(),
        "updated_at": _now(),
        "started_at": None,
        "finished_at": None,
    }
    _TASKS[task["id"]] = task
    return task


@router.get("/tasks")
async def list_tasks(status: Optional[str] = Query(None, description="pending|running|done|failed|cancelled")):
    items = [_TASKS[t] for t in sorted(_TASKS, key=lambda x: _TASKS[x]["created_at"], reverse=True)]
    if status:
        items = [t for t in items if t["status"] == status]
    return {"items": items, "total": len(items)}


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    return _find(task_id)


@router.post("/tasks/{task_id}/start")
async def start_task(task_id: str):
    t = _find(task_id)
    t["status"] = "running"
    t["started_at"] = _now()
    t["updated_at"] = _now()
    return t


@router.post("/tasks/{task_id}/progress")
async def progress_task(task_id: str, req: TaskProgress):
    t = _find(task_id)
    if req.progress is not None:
        t["progress"] = req.progress
    if req.step:
        t["steps"].append(req.step.model_dump())
    if req.note:
        t["steps"].append(TaskStep(name=req.note, status="running").model_dump())
    t["updated_at"] = _now()
    return t


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, req: TaskComplete):
    t = _find(task_id)
    t["status"] = "done"
    t["progress"] = req.progress
    t["result"] = req.result
    t["finished_at"] = _now()
    t["updated_at"] = _now()
    return t


@router.post("/tasks/{task_id}/fail")
async def fail_task(task_id: str, req: TaskFail):
    t = _find(task_id)
    t["status"] = "failed"
    t["error"] = req.error
    t["finished_at"] = _now()
    t["updated_at"] = _now()
    return t


@router.post("/tasks/{task_id}/retry")
async def retry_task(task_id: str):
    t = _find(task_id)
    t["status"] = "pending"
    t["progress"] = 0
    t["steps"] = []
    t["result"] = ""
    t["error"] = ""
    t["started_at"] = None
    t["finished_at"] = None
    t["updated_at"] = _now()
    return t


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    t = _find(task_id)
    if t["status"] in ("done", "failed", "cancelled"):
        raise HTTPException(status_code=409, detail=f"task already {t['status']}")
    t["status"] = "cancelled"
    t["finished_at"] = _now()
    t["updated_at"] = _now()
    return t


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    _find(task_id)
    del _TASKS[task_id]
    return {"deleted": True, "id": task_id}


# ---- demo data (foundation smoke / UI preview) ----
def _seed():
    _TASKS.clear()
    base = _now()
    _TASKS["demo_rag"] = {
        "id": "demo_rag", "title": "知识库索引",
        "description": "对产品文档库进行分块、嵌入与入库",
        "status": "running", "progress": 62,
        "steps": [
            {"name": "解析文档", "status": "done", "detail": "126 篇已解析", "ts": base - 120},
            {"name": "分块", "status": "done", "detail": "3420 chunks", "ts": base - 80},
            {"name": "向量嵌入", "status": "running", "detail": "batch 4/8", "ts": base - 20},
        ],
        "result": "", "error": "", "created_at": base - 200,
        "updated_at": base - 20, "started_at": base - 180, "finished_at": None,
    }


_seed()
