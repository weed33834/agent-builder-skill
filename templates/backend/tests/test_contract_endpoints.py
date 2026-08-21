"""Contract tests for frontend-facing A2A / MCP endpoints (api.ts alignment).

Covers:
- GET  /api/a2a/tasks/{id}          pollA2ATask
- POST /api/a2a/tasks               pollA2ATasks (batch)
- POST /api/a2a/tasks/{id}/cancel   cancelA2ATask
- GET  /api/mcp/tools               discoverMCPTools
- GET  /api/mcp/status              getMCPStatus
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from app.main import app

    return TestClient(app)


def _create_task(client):
    resp = client.post("/a2a/rpc", json={
        "jsonrpc": "2.0",
        "id": "t1",
        "method": "task/send",
        "params": {
            "id": "task-contract-1",
            "message": {"role": "user", "parts": [{"text": "hi"}]},
        },
    })
    assert resp.status_code == 200
    return resp.json()["result"]["id"]


def test_get_single_a2a_task(client):
    tid = _create_task(client)
    resp = client.get(f"/api/a2a/tasks/{tid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == tid
    assert body["status"] in {"submitted", "completed", "working", "canceled"}


def test_get_missing_a2a_task_404(client):
    resp = client.get("/api/a2a/tasks/task-does-not-exist")
    assert resp.status_code in (404, 500)  # A2AServerError → HTTPException mapping


def test_poll_a2a_tasks_batch(client):
    tid = _create_task(client)
    resp = client.post("/api/a2a/tasks", json={"task_ids": [tid, "ghost"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["tasks"]
    assert body["tasks"][0]["id"] == tid
    # ghost 不存在 → 被过滤掉（只返回存在的）
    assert all(t["id"] != "ghost" for t in body["tasks"])


def test_cancel_a2a_task(client):
    tid = _create_task(client)
    resp = client.post(f"/api/a2a/tasks/{tid}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "canceled"


def test_discover_mcp_tools(client):
    resp = client.get("/api/mcp/tools")
    assert resp.status_code == 200
    body = resp.json()
    assert "tools" in body  # 可能为空列表，但字段必须存在


def test_mcp_status(client):
    resp = client.get("/api/mcp/status")
    assert resp.status_code == 200
    assert "servers" in resp.json()
