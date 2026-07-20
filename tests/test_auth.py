"""
真实登录(JWT 路径)独立验证 —— register / login / Bearer 鉴权 / 双模回退。

- 隔离临时 sqlite 库,不污染仓库真实库。
- 默认 test env 为 local 模式:验证匿名 uuid 仍可用(双模回退);Bearer JWT 亦可。
"""

import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="mm_auth_")
_DB = os.path.join(_TMP, "auth.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB}"
# 设一个满足长度要求的密钥,避免 InsecureKeyLengthWarning
os.environ.setdefault("AUTH_SECRET", "test-secret-" + "x" * 40)

import httpx
import pytest_asyncio

from app.core.db import engine, init_db
from app.main import app
from app.models.base import Base


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _setup_db():
    await init_db()
    yield


@pytest_asyncio.fixture(autouse=True)
async def _truncate():
    async with engine.begin() as conn:
        for t in reversed(Base.metadata.sorted_tables):
            await conn.execute(t.delete())
    yield


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_register_and_login(client):
    r = await client.post("/api/auth/register", json={"email": "a@b.com", "password": "secret123", "nickname": "阿强"})
    assert r.status_code == 201
    tok = r.json()["access_token"]
    assert tok

    # 同邮箱重复注册 → 409
    r2 = await client.post("/api/auth/register", json={"email": "a@b.com", "password": "secret123"})
    assert r2.status_code == 409

    # 登录正确 → 200 + token
    r3 = await client.post("/api/auth/login", json={"email": "a@b.com", "password": "secret123"})
    assert r3.status_code == 200
    assert r3.json()["access_token"]

    # 密码错误 → 401
    r4 = await client.post("/api/auth/login", json={"email": "a@b.com", "password": "wrong"})
    assert r4.status_code == 401

    # 弱密码(少于 8 位) → 400
    r5 = await client.post("/api/auth/register", json={"email": "c@d.com", "password": "123"})
    assert r5.status_code == 400


async def test_bearer_accepted_on_protected_route(client):
    tok = (await client.post("/api/auth/register", json={"email": "x@y.com", "password": "secret123"})).json()["access_token"]
    # Bearer JWT 访问 RequireUser 端点 → 非 401(404 表示已通过鉴权,只是无 goal)
    r = await client.get("/api/goals/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code != 401


async def test_invalid_bearer_rejected(client):
    r = await client.get("/api/goals/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


async def test_anonymous_fallback_still_works_local_mode(client):
    # 默认 local 模式:已存在的匿名 uuid 仍可过鉴权(双模回退;RequireUser 不自动建号)
    import uuid

    from app.core.db import async_session
    from app.models.user import User

    tok = str(uuid.uuid4())
    async with async_session() as s:
        u = User(token=tok, nickname="anon")
        s.add(u)
        await s.commit()
    r = await client.get("/api/goals/me", headers={"X-User-Token": tok})
    assert r.status_code != 401  # 404 = 通过鉴权但无 goal
