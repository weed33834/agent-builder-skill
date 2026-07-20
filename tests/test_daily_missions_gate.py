"""
Phase 4 安全/质量门禁 —— 教官每日任务（Daily Missions）独立验证。

本文件为 quality-engineer 的落地用例，按
tests/security/phase4_daily_missions_security_checklist.md 的 TC-A1..E2 与 §6 静态核查编写。
- 仅创建本文件，绝不修改 app/ 下任何源码。
- 使用隔离的临时 sqlite 库（DATABASE_URL 在 import app 之前设置），不污染仓库真实库。
- 通过 httpx.AsyncClient + ASGITransport 驱动真实端点；fixture 直插行验证 DB 状态。
"""

import os
import tempfile
import uuid
from datetime import timedelta
from pathlib import Path

# ---- 关键：在 import 任何 app.* 之前设置临时 DATABASE_URL ----
_TMP_DIR = tempfile.mkdtemp(prefix="mindmirror_gate_")
_DB_FILE = os.path.join(_TMP_DIR, "gate.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import asyncio

import httpx
import pendulum
import pytest_asyncio
from sqlalchemy import (
    UniqueConstraint,
    func,
    select,
)

from app.core.db import async_session, engine, init_db
from app.main import app
from app.models.base import Base
from app.models.mission import (
    DailyMission,
    MissionCompletion,
    TrainingGoal,
    TrainingStreak,
    TraitTarget,
)
from app.models.user import User

REPO = Path(__file__).resolve().parent.parent
SVC = (REPO / "app" / "services" / "missions.py").read_text(encoding="utf-8")
ROUTES = (REPO / "app" / "api" / "routes" / "missions.py").read_text(encoding="utf-8")
MODELS = (REPO / "app" / "models" / "mission.py").read_text(encoding="utf-8")

import re as _re

# 去掉模块级 docstring（其中含「绝不用 date.today()/datetime.now()」字样，仅为说明，非真实调用）
_SVC_NODOC = _re.sub(r'""".*?"""', "", SVC, count=1, flags=_re.S)
_ROUTES_NODOC = _re.sub(r'""".*?"""', "", ROUTES, count=1, flags=_re.S)

TODAY = pendulum.now("Asia/Shanghai").date()
TOMORROW = TODAY + timedelta(days=1)

H = lambda token: {"X-User-Token": token}  # noqa: E731


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest_asyncio.fixture(scope="session", autouse=True)
async def _setup_db():
    await init_db()
    yield


@pytest_asyncio.fixture(autouse=True)
async def _truncate():
    # 每个用例前清空所有表，保证隔离
    async with engine.begin() as conn:
        for t in reversed(Base.metadata.sorted_tables):
            await conn.execute(t.delete())
    yield


@pytest_asyncio.fixture
async def client():
    # raise_app_exceptions=False 让应用内未捕获异常像真实服务器一样转为 500 响应，
    # 而非穿透到测试（更贴近生产行为，便于断言最终 DB 状态）
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# --------------------------------------------------------------------------- #
# Seed helpers（直插行，不经过端点）
# --------------------------------------------------------------------------- #
async def _seed_user(token: str, nickname: str = "镜中人") -> User:
    async with async_session() as s:
        u = User(token=token, nickname=nickname)
        s.add(u)
        await s.commit()
        await s.refresh(u)
        return u


async def _seed_goal(user_id: str, trait: TraitTarget, fig: str | None) -> TrainingGoal:
    async with async_session() as s:
        g = TrainingGoal(user_id=user_id, trait_target=trait, source_figure=fig, is_active=True)
        s.add(g)
        await s.commit()
        await s.refresh(g)
        return g


async def _seed_mission(user_id: str, mission_date, tasks: list, completed: bool = False) -> DailyMission:
    async with async_session() as s:
        m = DailyMission(
            user_id=user_id,
            mission_date=mission_date,
            tasks=tasks,
            generated_from=[],
            completed=completed,
        )
        s.add(m)
        await s.commit()
        await s.refresh(m)
        return m


def _tasks(*done_flags):
    out = []
    for i, d in enumerate(done_flags, start=1):
        out.append({"id": f"t{i}", "prompt": f"p{i}", "strict_prompt": f"s{i}", "done": d})
    return out


async def _count_completions(user_id: str, mission_id: str) -> int:
    async with async_session() as s:
        res = await s.execute(
            select(func.count())
            .select_from(MissionCompletion)
            .where(MissionCompletion.user_id == user_id, MissionCompletion.mission_id == mission_id)
        )
        return res.scalar_one()


async def _streak_row(user_id: str):
    async with async_session() as s:
        res = await s.execute(select(TrainingStreak).where(TrainingStreak.user_id == user_id))
        return res.scalar_one_or_none()


# --------------------------------------------------------------------------- #
# TC-A 系列：越权 / 资源归属
# --------------------------------------------------------------------------- #
async def test_TC_A1_cross_user_complete_others_mission_404(client):
    ua = await _seed_user(str(uuid.uuid4()))
    ub = await _seed_user(str(uuid.uuid4()))
    b_mission = await _seed_mission(ub.id, TODAY, _tasks(False, False, False))
    r = await client.post(
        f"/api/missions/{b_mission.id}/tasks/t1/complete", headers=H(ua.token)
    )
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "资源不存在"
    # 不得为 A 或 B 新增任何 MissionCompletion
    assert await _count_completions(ua.id, b_mission.id) == 0
    assert await _count_completions(ub.id, b_mission.id) == 0


async def test_TC_A2_complete_nonexistent_mission_404_and_byte_identical(client):
    ua = await _seed_user(str(uuid.uuid4()))
    ub = await _seed_user(str(uuid.uuid4()))
    b_mission = await _seed_mission(ub.id, TODAY, _tasks(False, False, False))
    # 跨用户（真存在但非本人）
    r_cross = await client.post(
        f"/api/missions/{b_mission.id}/tasks/t1/complete", headers=H(ua.token)
    )
    # 真不存在
    fake = str(uuid.uuid4())
    r_missing = await client.post(
        f"/api/missions/{fake}/tasks/t1/complete", headers=H(ua.token)
    )
    assert r_cross.status_code == 404 and r_missing.status_code == 404
    # 字节级一致：不区分「不存在」与「非本人」
    assert r_cross.content == r_missing.content
    assert r_cross.json()["detail"] == "资源不存在"


async def test_TC_A3_task_id_not_in_mission_404(client):
    ua = await _seed_user(str(uuid.uuid4()))
    m = await _seed_mission(ua.id, TODAY, _tasks(False, False, False))
    r = await client.post(f"/api/missions/{m.id}/tasks/zzz_not_exist/complete", headers=H(ua.token))
    assert r.status_code == 404, r.text
    assert r.json()["detail"] == "资源不存在"
    assert await _count_completions(ua.id, m.id) == 0


async def test_TC_A4_read_own_resources_only(client):
    ua = await _seed_user(str(uuid.uuid4()))
    ub = await _seed_user(str(uuid.uuid4()))
    await _seed_goal(ua.id, TraitTarget.more_decisive, "lincoln")
    await _seed_goal(ub.id, TraitTarget.more_courageous, "curie")
    a_mission = await _seed_mission(ua.id, TODAY, _tasks(False, False, False))
    b_mission = await _seed_mission(ub.id, TODAY, _tasks(False, False, False))

    g = await client.get("/api/goals/me", headers=H(ua.token))
    assert g.status_code == 200, g.text
    assert g.json()["source_figure"] == "lincoln"
    assert "curie" not in g.text  # 不得出现 B 的资源

    mt = await client.get("/api/missions/today", headers=H(ua.token))
    assert mt.status_code == 200, mt.text
    assert mt.json()["id"] == a_mission.id
    assert b_mission.id not in mt.text  # 不得出现 B 的 mission

    st = await client.get("/api/missions/streak", headers=H(ua.token))
    assert st.status_code == 200, st.text
    assert isinstance(st.json()["current"], int) and isinstance(st.json()["longest"], int)


async def test_TC_A5_path_param_resource_read_N_A(client):
    # 设计上不存在 /api/goals/{goal_id} 这类路径参数读接口（仅有 /api/goals/me）
    ua = await _seed_user(str(uuid.uuid4()))
    await _seed_goal(ua.id, TraitTarget.more_decisive, "lincoln")
    r = await client.get(f"/api/goals/{uuid.uuid4()!s}", headers=H(ua.token))
    # 无此路由 → 404（路由层，非资源归属）。标记为 N/A：无此类路径参数接口。
    assert r.status_code == 404
    # 若存在应为「资源不存在」，但此处为路由缺失，故 N/A。


# --------------------------------------------------------------------------- #
# TC-B 系列：幂等 / 并发 / streak 服务端
# --------------------------------------------------------------------------- #
async def test_TC_B1_idempotent_full_completion_streak_plus_one(client):
    """REAL contract: streak advances ONLY on full mission completion.

    单任务完成不推进 streak；集齐全部任务(t1,t2,t3)才插 1 行 MissionCompletion 且 streak+1；
    重复完成已 done 任务不产生额外完成记录/增量。
    """
    ua = await _seed_user(str(uuid.uuid4()))
    m = await _seed_mission(ua.id, TODAY, _tasks(False, False, False))

    s0 = (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"]

    # 完成 t1（未集齐）
    r1 = await client.post(f"/api/missions/{m.id}/tasks/t1/complete", headers=H(ua.token))
    assert r1.status_code == 200, r1.text
    assert await _count_completions(ua.id, m.id) == 0  # 未完成 → 无完成记录
    assert (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"] == s0  # 不 +1

    # 完成 t2（仍未集齐）
    r2 = await client.post(f"/api/missions/{m.id}/tasks/t2/complete", headers=H(ua.token))
    assert r2.status_code == 200
    assert await _count_completions(ua.id, m.id) == 0

    # 完成 t3（集齐）→ 插记录 + streak+1
    r3 = await client.post(f"/api/missions/{m.id}/tasks/t3/complete", headers=H(ua.token))
    assert r3.status_code == 200, r3.text
    body3 = r3.json()
    assert body3["mission"]["completed"] is True, f"mission not completed: {body3['mission']}"
    assert await _count_completions(ua.id, m.id) == 1
    assert body3["streak"]["current"] == s0 + 1

    # 重复完成已 done 的 t1 → 幂等，仍 1 行、streak 不变
    r4 = await client.post(f"/api/missions/{m.id}/tasks/t1/complete", headers=H(ua.token))
    assert r4.status_code == 200
    assert await _count_completions(ua.id, m.id) == 1
    assert r4.json()["streak"]["current"] == s0 + 1


async def test_TC_B2_concurrent_completion_no_double_count(client):
    """并发完成同一 mission → 唯一约束折叠为 1 行，streak 仅 +1。"""
    ua = await _seed_user(str(uuid.uuid4()))
    # 预置 t1,t2 已完成，仅 t3 待完成；并发打满 t3 以触发原子 upsert 门
    m = await _seed_mission(ua.id, TODAY, _tasks(True, True, False))

    s0 = (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"]

    N = 10
    calls = [
        client.post(f"/api/missions/{m.id}/tasks/t3/complete", headers=H(ua.token))
        for _ in range(N)
    ]
    results = await asyncio.gather(*calls)
    statuses = [r.status_code for r in results]

    # 至少一次成功；最终 DB 状态必须：恰好 1 行完成记录、streak 仅 +1
    assert 200 in statuses, f"no 200 among {statuses}: {[r.text for r in results]}"
    assert await _count_completions(ua.id, m.id) == 1, statuses
    final = (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"]
    assert final == s0 + 1, f"streak={final}, expected {s0 + 1}"


async def test_TC_B3_future_mission_rejected_no_streak(client):
    ua = await _seed_user(str(uuid.uuid4()))
    m = await _seed_mission(ua.id, TOMORROW, _tasks(False, False, False))
    s0 = (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"]

    r = await client.post(f"/api/missions/{m.id}/tasks/t1/complete", headers=H(ua.token))
    # 行为意图满足：被拒（真实返回 409；清单建议 400，见 F2）
    assert r.status_code in (400, 409), r.text
    assert await _count_completions(ua.id, m.id) == 0
    s1 = (await client.get("/api/missions/streak", headers=H(ua.token))).json()["current"]
    assert s1 == s0, f"streak changed {s0}->{s1}"


async def test_TC_B4_timezone_explicit_asia_shanghai(client):
    # (a) 静态：service 使用 pendulum.now("Asia/Shanghai")，无 date.today()/datetime.now()（已剔除模块 docstring 误报）
    assert 'pendulum.now("Asia/Shanghai")' in SVC
    assert "date.today(" not in _SVC_NODOC
    assert "datetime.now(" not in _SVC_NODOC

    # (b) 功能：完成当天 mission，completed_date == Asia/Shanghai 今天
    ua = await _seed_user(str(uuid.uuid4()))
    m = await _seed_mission(ua.id, TODAY, _tasks(False, False, False))
    for tid in ("t1", "t2", "t3"):
        rr = await client.post(f"/api/missions/{m.id}/tasks/{tid}/complete", headers=H(ua.token))
        assert rr.status_code == 200, rr.text

    async with async_session() as s:
        res = await s.execute(
            select(MissionCompletion).where(
                MissionCompletion.user_id == ua.id, MissionCompletion.mission_id == m.id
            )
        )
        comp = res.scalar_one()
    assert comp.completed_date == TODAY, f"completed_date={comp.completed_date} expected {TODAY}"


# --------------------------------------------------------------------------- #
# TC-C 系列：输入校验
# --------------------------------------------------------------------------- #
async def test_TC_C1_trait_target_not_enum_422(client):
    ua = await _seed_user(str(uuid.uuid4()))
    r = await client.post(
        "/api/goals",
        json={"trait_target": "arbitrary_string_not_in_enum", "source_figure": "lincoln"},
        headers=H(ua.token),
    )
    assert r.status_code == 422, r.text
    # 不落库
    async with async_session() as s:
        cnt = (await s.execute(select(func.count()).select_from(TrainingGoal).where(TrainingGoal.user_id == ua.id))).scalar_one()
    assert cnt == 0
    # F5：记录 pydantic 是否在 422 回显了用户输入（observable，非判定失败条件）
    echoed = "arbitrary_string_not_in_enum" in r.text
    assert isinstance(echoed, bool)  # 仅记录；报告于 F5


async def test_TC_C2_source_figure_not_celebrity_422(client):
    ua = await _seed_user(str(uuid.uuid4()))
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "not_a_real_figure"},
        headers=H(ua.token),
    )
    assert r.status_code == 422, r.text
    async with async_session() as s:
        cnt = (await s.execute(select(func.count()).select_from(TrainingGoal).where(TrainingGoal.user_id == ua.id))).scalar_one()
    assert cnt == 0


async def test_TC_C3_extra_unknown_field_ignored(client):
    ua = await _seed_user(str(uuid.uuid4()))
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln", "foo": "bar"},
        headers=H(ua.token),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert "foo" not in body  # 未知字段不回显
    async with async_session() as s:
        g = (await s.execute(select(TrainingGoal).where(TrainingGoal.user_id == ua.id))).scalar_one()
    assert g.source_figure == "lincoln"
    assert not hasattr(g, "foo")  # 模型无该列，自然不入库


async def test_TC_C4_valid_input_stores_whitelist_id(client):
    ua = await _seed_user(str(uuid.uuid4()))
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln"},
        headers=H(ua.token),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["source_figure"] == "lincoln"
    assert body["source_figure_name"] == "林肯"  # 取自 celebrity.yaml，非用户输入
    assert body["trait_label"] == "更果断"


# --------------------------------------------------------------------------- #
# TC-D 系列：RequireUser / 建号流
# --------------------------------------------------------------------------- #
async def test_TC_D1_valid_uuid_no_db_row_401(client):
    token = str(uuid.uuid4())  # 合法 UUID，但 DB 无记录
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln"},
        headers=H(token),
    )
    assert r.status_code == 401, r.text
    assert r.json()["detail"] == "未授权"
    # 不自动建号
    async with async_session() as s:
        u = (await s.execute(select(User).where(User.token == token))).scalar_one_or_none()
    assert u is None


async def test_TC_D2_invalid_token_format_401(client):
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln"},
        headers=H("not-a-uuid"),
    )
    assert r.status_code == 401, r.text
    assert r.json()["detail"] == "未授权"


async def test_TC_D3_missing_token_401(client):
    r = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln"},
    )
    assert r.status_code == 401, r.text


async def test_TC_D4_normal_flow_no_account_creation_loop(client):
    token = str(uuid.uuid4())
    # 1) POST /api/sessions（current_user 自动建号）
    s = await client.post("/api/sessions?assessment_type=celebrity", headers=H(token))
    assert s.status_code == 200, s.text
    # 2) POST /api/goals（同 UUID，RequireUser 因用户已存在而放行，无 401 死循环）
    g = await client.post(
        "/api/goals",
        json={"trait_target": "more_decisive", "source_figure": "lincoln"},
        headers=H(token),
    )
    assert g.status_code == 201, g.text
    # 3) GET /api/missions/today —— 无测评结果则 404（设计正确），关键：不得 401 死循环
    mt = await client.get("/api/missions/today", headers=H(token))
    assert mt.status_code in (200, 404), mt.text
    assert mt.status_code != 401


# --------------------------------------------------------------------------- #
# TC-E 系列：频控（R5）—— ratelimit.py 已实现，per-user 60s 固定窗口
# --------------------------------------------------------------------------- #
async def test_TC_E1_E2_rate_limiting_enforced(client):
    # 行为证据：同用户短时间内超过阈值 → 429（R5 防刷 streak/徽章）
    from app.core.config import get_settings

    limit = get_settings().rate_limit_per_minute
    ua = await _seed_user(str(uuid.uuid4()))
    codes = []
    for _ in range(limit + 3):
        r = await client.post(
            "/api/goals",
            json={"trait_target": "more_decisive", "source_figure": "lincoln"},
            headers=H(ua.token),
        )
        codes.append(r.status_code)
    assert 429 in codes, f"expected 429 after exceeding limit, got: {codes}"
    # 静态证据：写端点已接入 rate_limit 依赖
    assert "rate_limit" in ROUTES


# --------------------------------------------------------------------------- #
# §6 静态核查
# --------------------------------------------------------------------------- #
async def test_section6_static_checks(client):
    # 1) 所有 missions service 查询带 WHERE user_id；_get_owned_or_404 包裹按 id 查找（R1）
    assert "Model.user_id == user.id" in SVC
    assert "DailyMission.user_id == user_id" in SVC

    # 2) MissionCompletion 含 unique(user_id, mission_id) 约束（P1-6 并发门）

    ucs = [c for c in MissionCompletion.__table_args__ if isinstance(c, UniqueConstraint)]
    assert any({"user_id", "mission_id"} <= {col.name for col in c.columns} for c in ucs), [
        [col.name for col in c.columns] for c in ucs
    ]

    # 3) /api/missions/* 路由全部使用 RequireUser，未使用 current_user 自动建号（P0-3）
    assert "RequireUser" in ROUTES
    assert "current_user" not in ROUTES

    # 4) 服务器时区显式 Asia/Shanghai（R3）—— 已剔除模块 docstring 误报
    assert 'pendulum.now("Asia/Shanghai")' in SVC
    assert "date.today(" not in _SVC_NODOC and "datetime.now(" not in _SVC_NODOC

    # 5) source_figure 回包 name 取自 celebrity.yaml；strict_prompt 由模板构造，无用户可控文本
    assert "_figure_name" in SVC
    # strict_prompt 来自模板 tpl['strict_prompt']，而非用户输入
    assert "tpl['strict_prompt']" in SVC

    # 6) 错误信息统一「资源不存在」（P1-7,含 /api/missions/today,F1 已修复）
    assert 'detail="资源不存在"' in ROUTES
