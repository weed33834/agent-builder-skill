"""
关系对比（Relation Compare）独立验证。

- 仅创建本文件,绝不修改 app/ 下任何源码。
- 隔离临时 sqlite 库,不污染仓库真实库。
- 覆盖:公开摘要(无鉴权/不泄露归属)、对比(正常/自身无结果/无鉴权/非法码)。
"""

import os
import tempfile
import uuid

# ---- 在 import 任何 app.* 之前设置临时 DATABASE_URL ----
_TMP = tempfile.mkdtemp(prefix="mm_compare_")
_DB = os.path.join(_TMP, "compare.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB}"

import httpx
import pytest_asyncio

from app.core.db import async_session, engine, init_db
from app.main import app
from app.models.base import Base
from app.models.result import Result
from app.models.session import AssessmentSession, SessionStatus
from app.models.user import User

H = lambda token: {"X-User-Token": token}  # noqa: E731


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


async def _seed_user(token: str) -> User:
    async with async_session() as s:
        u = User(token=token, nickname="t")
        s.add(u)
        await s.commit()
        await s.refresh(u)
        return u


async def _seed_result(user: User, percentiles: dict, tags: list, summary: str = "结论") -> Result:
    async with async_session() as s:
        sess = AssessmentSession(
            user_id=user.id, assessment_type="celebrity", status=SessionStatus.completed
        )
        s.add(sess)
        await s.commit()
        await s.refresh(sess)
        r = Result(
            session_id=sess.id,
            user_id=user.id,
            assessment_type="celebrity",
            dimensions={},
            matches=[],
            conflicts=[],
            insights={},
            percentiles=percentiles,
            profile={"tags": tags, "archetype": "x"},
            summary=summary,
        )
        s.add(r)
        await s.commit()
        await s.refresh(r)
        return r


async def test_public_no_auth_and_no_leak(client):
    u = await _seed_user(str(uuid.uuid4()))
    r = await _seed_result(u, {"果断性": 80.0, "共情": 30.0}, ["果断", "领导力"])
    res = await client.get(f"/api/results/{r.id}/public")  # 无 token
    assert res.status_code == 200
    body = res.json()
    assert body["percentiles"]["果断性"] == 80.0
    assert "果断" in body["tags"]
    # 不泄露归属
    assert "user_id" not in body and "session_id" not in body


async def test_public_404(client):
    res = await client.get("/api/results/nope/public")
    assert res.status_code == 404


async def test_compare_ok(client):
    ua = await _seed_user(str(uuid.uuid4()))
    ub = await _seed_user(str(uuid.uuid4()))
    ra = await _seed_result(ua, {"果断性": 80.0, "共情": 30.0}, ["果断"])
    rb = await _seed_result(ub, {"果断性": 40.0, "共情": 70.0}, ["温和"])
    res = await client.get(f"/api/compare?other={rb.id}", headers=H(ua.token))
    assert res.status_code == 200
    body = res.json()
    assert isinstance(body["compatibility"], int)
    assert len(body["dimensions"]) >= 1
    assert body["self_summary"]["id"] == ra.id
    assert body["other_summary"]["id"] == rb.id


async def test_compare_requires_auth(client):
    ub = await _seed_user(str(uuid.uuid4()))
    rb = await _seed_result(ub, {"果断性": 40.0}, ["温和"])
    res = await client.get(f"/api/compare?other={rb.id}")  # 无 token
    assert res.status_code == 401


async def test_compare_no_self_result(client):
    ua = await _seed_user(str(uuid.uuid4()))  # 无结果
    ub = await _seed_user(str(uuid.uuid4()))
    rb = await _seed_result(ub, {"果断性": 40.0}, ["温和"])
    res = await client.get(f"/api/compare?other={rb.id}", headers=H(ua.token))
    assert res.status_code == 404


async def test_compare_bad_other(client):
    ua = await _seed_user(str(uuid.uuid4()))
    await _seed_result(ua, {"果断性": 80.0}, ["果断"])
    res = await client.get("/api/compare?other=nope", headers=H(ua.token))
    assert res.status_code == 404
