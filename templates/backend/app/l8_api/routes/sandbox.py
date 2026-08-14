"""L8 - Sandbox management API (M3.5)

Endpoints:
  GET    /api/sandbox/envs                 list environments
  POST   /api/sandbox/envs                 create an environment
  GET    /api/sandbox/envs/{id}            environment detail
  PUT    /api/sandbox/envs/{id}            update
  DELETE /api/sandbox/envs/{id}            delete
  POST   /api/sandbox/envs/{id}/enable     enable/disable
  POST   /api/sandbox/default              set default environment
  POST   /api/sandbox/run                  run code in an environment (or default)
  POST   /api/sandbox/enabled              global sandbox switch
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...l10_infra.sandbox import sandbox_manager, SandboxError

router = APIRouter()


class EnvCreate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1)
    language: str = "python"
    packages: list[str] = Field(default_factory=list)
    image: str = ""
    quota: dict = Field(default_factory=dict)
    type: str = "local"


class EnvUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    packages: Optional[list[str]] = None
    image: Optional[str] = None
    quota: Optional[dict] = None
    type: Optional[str] = None


class EnvEnable(BaseModel):
    enabled: bool = True


class EnvDefault(BaseModel):
    id: str = Field(..., description="environment id")


class SandboxRun(BaseModel):
    env_id: Optional[str] = None
    language: str = "python"
    code: str = Field(..., min_length=1)
    timeout: Optional[int] = None


class GlobalEnabled(BaseModel):
    enabled: bool = True


def _err(e: SandboxError):
    return HTTPException(status_code=404, detail=str(e))


@router.get("/sandbox/envs")
async def list_envs():
    return {"items": sandbox_manager.list_envs(), "default": sandbox_manager.default_id,
            "enabled": sandbox_manager.enabled, "templates": ["python", "node", "sh", "data-science", "chrome"]}


@router.post("/sandbox/envs", status_code=201)
async def create_env(req: EnvCreate):
    return sandbox_manager.create_env(req.model_dump(exclude_none=True))


@router.get("/sandbox/envs/{env_id}")
async def get_env(env_id: str):
    try:
        return sandbox_manager.get_env(env_id)
    except SandboxError as e:
        _err(e)


@router.put("/sandbox/envs/{env_id}")
async def update_env(env_id: str, req: EnvUpdate):
    try:
        return sandbox_manager.update_env(env_id, req.model_dump(exclude_none=True))
    except SandboxError as e:
        _err(e)


@router.delete("/sandbox/envs/{env_id}")
async def delete_env(env_id: str):
    try:
        sandbox_manager.delete_env(env_id)
        return {"deleted": True, "id": env_id}
    except SandboxError as e:
        _err(e)


@router.post("/sandbox/envs/{env_id}/enable")
async def enable_env(env_id: str, req: EnvEnable):
    try:
        return sandbox_manager.set_enabled(env_id, req.enabled)
    except SandboxError as e:
        _err(e)


@router.post("/sandbox/default")
async def set_default(req: EnvDefault):
    try:
        return sandbox_manager.set_default(req.id)
    except SandboxError as e:
        _err(e)


@router.post("/sandbox/run")
async def run_code(req: SandboxRun):
    return await sandbox_manager.run(req.env_id, req.language, req.code, req.timeout)


@router.post("/sandbox/enabled")
async def set_global_enabled(req: GlobalEnabled):
    sandbox_manager.set_global_enabled(req.enabled)
    return {"enabled": req.enabled}
