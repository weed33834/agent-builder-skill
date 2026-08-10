"""L8 - Admin Console API (管理界面后端, M7/M8/M9/M10/M13)

为前端管理界面提供统一 CRUD 后端，数据持久化到本地 JSON 文件
(data/admin/*.json)，生产环境可替换为数据库实现。

端点划分（对应 admin-console-design.md，契约与 frontend/src/l8_api/api.ts 对齐）:
  /api/admin/prompts       提示词管理 (CRUD + AI 生成 + 外部导入)
  /api/admin/tools         工具管理   (注册 / 启停 / MCP 连接测试)
  /api/admin/memory        记忆管理   (查看 / 保存 / 清理 / 向量检索)
  /api/admin/agents        Agent 模板管理 (CRUD + 流程图保存)
  /api/admin/models        模型供应商管理 (CRUD + 连通性测试, 密钥脱敏)
  /api/admin/workflows     编排工作流管理 (CRUD)
  /api/admin/evaluations   评估管理   (用例 CRUD + 执行)
  /api/admin/metrics       可观测性   (指标序列)
  /api/admin/alerts        告警规则管理 (CRUD)
  /api/admin/settings      系统设置   (GET / PUT)
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from ...l10_infra.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# 轻量 JSON 持久化 (data/admin/*.json); 生产替换为数据库
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "admin"

_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "prompts": {
        "items": [
            {
                "id": "sys_default",
                "name": "system",
                "content": "You are a helpful assistant.",
                "active": True,
                "source": "builtin",
                "version": 1,
                "created_at": int(time.time()),
            }
        ]
    },
    "tools": {"items": []},
    "memory": {"ephemeral": [], "vector_store": {}},
    "agents": {"items": []},
    "sessions": {"items": []},
    "models": {
        "items": [
            {"id": "default", "provider": settings.LLM_PROVIDER, "model": settings.LLM_MODEL, "api_key": "******"}
        ]
    },
    "workflows": {"items": []},
    "evaluations": {"items": [], "results": []},
    "alerts": {"items": []},
    "settings": {},
}


def _load(kind: str) -> Dict[str, Any]:
    """Load a collection from disk, falling back to defaults."""
    path = DATA_DIR / f"{kind}.json"
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, OSError):
            pass
    return json.loads(json.dumps(_DEFAULTS[kind]))  # deep copy


def _save(kind: str, data: Dict[str, Any]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{kind}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _audit(action: str, subject: str, detail: str = "") -> None:
    """Append an audit log entry (M13 security)."""
    sec = _load("security")
    sec.setdefault("audit_log", []).append(
        {"ts": int(time.time()), "action": action, "subject": subject, "detail": detail}
    )
    sec["audit_log"] = sec["audit_log"][-2000:]
    _save("security", sec)


def _list(kind: str) -> Dict[str, Any]:
    """Uniform {items, total} envelope used by the frontend AdminListResult."""
    data = _load(kind)
    return {"items": data.get("items", []), "total": len(data.get("items", []))}


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _find(kind: str, item_id: str) -> Dict[str, Any]:
    for item in _load(kind).get("items", []):
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail=f"{kind}: {item_id} not found")


def _upsert(kind: str, item: Dict[str, Any], match_key: str = "id") -> Dict[str, Any]:
    data = _load(kind)
    items = data.setdefault("items", [])
    for i, existing in enumerate(items):
        if existing.get(match_key) == item.get(match_key):
            items[i] = item
            _save(kind, data)
            return item
    items.append(item)
    _save(kind, data)
    return item


# ---------------------------------------------------------------------------
# Prompts — 提示词管理 (M3.21)
# ---------------------------------------------------------------------------
@router.get("/admin/prompts")
async def list_prompts():
    return _list("prompts")


@router.post("/admin/prompts")
async def create_prompt(payload: dict):
    content = payload.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="prompt content is required")
    item = {
        "id": payload.get("id") or _new_id("p"),
        "name": payload.get("name", "untitled"),
        "content": content,
        "active": bool(payload.get("active", False)),
        "source": payload.get("source", "manual"),  # manual | ai | import
        "tags": payload.get("tags", []),
        "version": 1,
        "created_at": int(time.time()),
    }
    return _upsert("prompts", item)


@router.put("/admin/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, payload: dict):
    data = _load("prompts")
    for item in data["items"]:
        if item["id"] == prompt_id:
            item.update({k: v for k, v in payload.items() if k not in ("id", "created_at")})
            item["version"] = int(item.get("version", 1)) + 1
            _save("prompts", data)
            _audit("prompt.update", prompt_id)
            return item
    raise HTTPException(status_code=404, detail="prompt not found")


@router.delete("/admin/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str):
    data = _load("prompts")
    before = len(data["items"])
    data["items"] = [i for i in data["items"] if i["id"] != prompt_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="prompt not found")
    _save("prompts", data)
    _audit("prompt.delete", prompt_id)
    return {"ok": True}


@router.post("/admin/prompts/generate")
async def generate_prompt(payload: dict):
    """AI 生成/优化/改写/翻译/审查提示词 (M3.21)。
    契约: {action, source?, params?} -> {draft, summary, version}
    action: generate | optimize | rewrite | translate | review | fewshot | explain
    生成逻辑在真实部署中调用 LLMAdapter; 此处产出结构化草稿。
    """
    action = payload.get("action", "generate")
    source = payload.get("source", "")
    params = payload.get("params", {}) or {}
    role = params.get("role", "assistant")
    purpose = params.get("purpose") or source

    actions = {
        "generate": ("Generate a fresh prompt", lambda s: s),
        "optimize": ("Optimized for clarity and reliability", lambda s: s),
        "rewrite": ("Rewritten for consistency", lambda s: s),
        "translate": ("Translated/standardized wording", lambda s: s),
        "review": ("Reviewed with risks flagged", lambda s: s),
        "fewshot": ("Few-shot examples appended", lambda s: s + "\n\nExample:\nQ: ...\nA: ..."),
        "explain": ("Explanation attached", lambda s: s),
    }
    summary, transform = actions.get(action, actions["generate"])

    draft = (
        f"You are an expert {role}.\n"
        f"Your task: {purpose or '(state the goal here)'}.\n\n"
        "Rules:\n"
        "1. Understand the user's intent before acting.\n"
        "2. Use available tools when they help.\n"
        "3. Be concise and accurate; state uncertainty explicitly.\n"
    )
    if source:
        draft = transform(source)

    return {"draft": draft, "summary": summary, "version": 1}


@router.post("/admin/prompts/import")
async def import_prompt(payload: dict):
    """外部导入提示词 (M3.21)。
    契约: {channel, payload?} -> {imported, items}
    channel: file | url | market | git | platform
    """
    channel = payload.get("channel", "file")
    p = payload.get("payload", {}) or {}
    raw = p.get("raw") or p.get("content") or p.get("text") or ""
    name = p.get("name") or f"imported_{channel}"
    fmt = p.get("format", "text")

    if not raw:
        raise HTTPException(status_code=400, detail="no prompt content in payload")
    content = raw
    if fmt == "json":
        try:
            parsed = json.loads(raw)
            content = parsed.get("content") or parsed.get("prompt") or json.dumps(parsed, ensure_ascii=False)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="invalid json payload")

    item = {
        "id": _new_id("p"),
        "name": name,
        "content": content,
        "active": False,
        "source": f"import:{channel}",
        "tags": [f"channel:{channel}"],
        "version": 1,
        "created_at": int(time.time()),
    }
    _upsert("prompts", item)
    _audit("prompt.import", item["id"], channel)
    return {"imported": 1, "items": [item]}


# ---------------------------------------------------------------------------
# Tools — 工具管理 (M5.21)
# ---------------------------------------------------------------------------
@router.get("/admin/tools")
async def list_tools():
    return _list("tools")


@router.post("/admin/tools")
async def register_tool(payload: dict):
    """注册外部工具 (名称 / 描述 / 参数 schema / 启停)。"""
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="tool name is required")
    item = {
        "id": payload.get("id") or _new_id("t"),
        "name": name,
        "description": payload.get("description", ""),
        "schema": payload.get("schema", {}),
        "endpoint": payload.get("endpoint", ""),
        "enabled": bool(payload.get("enabled", True)),
        "params": payload.get("params", {}),
        "created_at": int(time.time()),
    }
    return _upsert("tools", item, match_key="name")


@router.put("/admin/tools/{tool_id}")
async def update_tool(tool_id: str, payload: dict):
    """启停 / 参数配置。"""
    data = _load("tools")
    for t in data["items"]:
        if t["id"] == tool_id:
            t.update({k: v for k, v in payload.items() if k != "id"})
            _save("tools", data)
            _audit("tool.update", t["name"])
            return t
    raise HTTPException(status_code=404, detail="tool not found")


@router.delete("/admin/tools/{tool_id}")
async def delete_tool(tool_id: str):
    data = _load("tools")
    before = len(data["items"])
    data["items"] = [t for t in data["items"] if t["id"] != tool_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="tool not found")
    _save("tools", data)
    _audit("tool.delete", tool_id)
    return {"ok": True}


@router.post("/admin/tools/mcp/connect")
async def test_mcp_connection(payload: dict):
    """MCP 连接测试 (M5.22): 探测远端工具列表。
    contract: {transport: stdio|http|sse, command?, url?, config?} -> AdminTestResult
    """
    transport = payload.get("transport", "http")
    url = payload.get("url", "")
    command = payload.get("command", "")
    try:
        from ...l5_tools.mcp_client import MCPClient

        client = MCPClient(transport=transport, url=url, command=command)
        tools = await client.list_tools()
        return {
            "ok": True,
            "latency_ms": 0,
            "message": f"MCP {transport} connected, {len(tools)} tools discovered",
            "detail": {"tools": tools[:20]},
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "ok": False,
            "latency_ms": 0,
            "message": f"MCP {transport} connect failed: {exc}",
        }


# ---------------------------------------------------------------------------
# Memory — 记忆管理 (M6.22)
# ---------------------------------------------------------------------------
@router.get("/admin/memory")
async def get_memory():
    """记忆总览: 短期 / 向量库。"""
    data = _load("memory")
    return {
        "ephemeral": data.get("ephemeral", [])[-50:],
        "vector_store": data.get("vector_store", {}),
        "stats": {
            "ephemeral_count": len(data.get("ephemeral", [])),
            "kb_count": len(data.get("vector_store", {})),
        },
    }


@router.post("/admin/memory")
async def save_memory(payload: dict):
    """追加短期记忆 / 写向量库条目。"""
    data = _load("memory")
    scope = payload.get("scope", "ephemeral")
    if scope == "ephemeral":
        entry = {"id": _new_id("m"), "content": payload.get("content", ""), "ts": int(time.time())}
        data.setdefault("ephemeral", []).append(entry)
    elif scope == "vector":
        kb = payload.get("kb_id", "default")
        store = data.setdefault("vector_store", {})
        store.setdefault(kb, []).append(
            {"id": _new_id("chunk"), "text": payload.get("content", ""), "meta": payload.get("meta", {})}
        )
    else:
        raise HTTPException(status_code=400, detail=f"unknown scope: {scope}")
    _save("memory", data)
    return {"ok": True}


@router.post("/admin/memory/query")
async def query_memory(payload: dict):
    """向量检索测试 (M6.23): query -> Top-K 召回 (关键词匹配模拟, 生产接向量库)。"""
    kb_id = payload.get("kb_id", "default")
    query = payload.get("query", "")
    top_k = int(payload.get("top_k", 5))
    store = _load("memory").get("vector_store", {}).get(kb_id, [])
    if not query:
        return {"hits": []}
    q_tokens = {w for w in query.lower().split() if len(w) > 1}
    scored = []
    for chunk in store:
        text = chunk.get("text", "").lower()
        score = sum(1 for w in q_tokens if w in text) / max(len(q_tokens), 1)
        if score > 0:
            scored.append((score, chunk))
    scored.sort(key=lambda x: -x[0])
    hits = [
        {"chunk_id": c["id"], "score": round(s, 3), "snippet": c.get("text", "")[:200], "source": kb_id}
        for s, c in scored[:top_k]
    ]
    return {"hits": hits}


@router.delete("/admin/memory")
async def clear_memory(payload: dict = None):
    """清理记忆: scope = all | ephemeral | vector。"""
    scope = (payload or {}).get("scope", "all")
    data = _load("memory")
    if scope in ("all", "ephemeral"):
        data["ephemeral"] = []
    if scope in ("all", "vector"):
        data["vector_store"] = {}
    _save("memory", data)
    _audit("memory.clear", scope)
    return {"ok": True, "cleared": scope}


# ---------------------------------------------------------------------------
# Agents — Agent 模板管理 (M0.22)
# ---------------------------------------------------------------------------
@router.get("/admin/agents")
async def list_agent_templates():
    return _list("agents")


@router.post("/admin/agents")
async def create_agent_template(payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="agent name is required")
    item = {
        "id": payload.get("id") or _new_id("a"),
        "name": name,
        "description": payload.get("description", ""),
        "system_prompt": payload.get("system_prompt", ""),
        "tools": payload.get("tools", []),
        "framework": payload.get("framework", "langgraph"),
        "graph": payload.get("graph", {}),
        "enabled": bool(payload.get("enabled", True)),
        "created_at": int(time.time()),
    }
    return _upsert("agents", item)


@router.post("/admin/agents/graph")
async def save_agent_graph(payload: dict):
    """流程图保存 (M7.24): {agent_id, nodes, edges} -> {ok, version}。"""
    agent_id = payload.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    data = _load("agents")
    for a in data["items"]:
        if a["id"] == agent_id:
            a["graph"] = {"nodes": payload.get("nodes", []), "edges": payload.get("edges", [])}
            a["graph_version"] = int(a.get("graph_version", 0)) + 1
            _save("agents", data)
            _audit("agent.graph.save", agent_id)
            return {"ok": True, "version": a["graph_version"]}
    raise HTTPException(status_code=404, detail="agent not found")


@router.delete("/admin/agents/{agent_id}")
async def delete_agent_template(agent_id: str):
    data = _load("agents")
    before = len(data["items"])
    data["items"] = [a for a in data["items"] if a["id"] != agent_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="agent not found")
    _save("agents", data)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Models — 模型供应商管理 (M1.22)
# ---------------------------------------------------------------------------
@router.get("/admin/models")
async def list_models():
    """模型供应商列表 (密钥脱敏)。"""
    result = _list("models")
    for m in result["items"]:
        if m.get("api_key") and m["api_key"] != "******":
            m["api_key"] = "******"
    return result


@router.post("/admin/models")
async def add_model(payload: dict):
    provider = payload.get("provider")
    if not provider:
        raise HTTPException(status_code=400, detail="provider is required")
    item = {
        "id": payload.get("id") or _new_id("m"),
        "provider": provider,
        "model": payload.get("model", ""),
        "base_url": payload.get("base_url", ""),
        "api_key": payload.get("api_key", "******"),
        "enabled": bool(payload.get("enabled", True)),
        "created_at": int(time.time()),
    }
    if item["api_key"] and item["api_key"] != "******":
        _audit("model.add", item["id"], provider)
    return _upsert("models", item, match_key="provider")


@router.put("/admin/models/{model_id}")
async def update_model(model_id: str, payload: dict):
    data = _load("models")
    for m in data["items"]:
        if m["id"] == model_id:
            for k, v in payload.items():
                if k == "api_key" and (v in ("", "******")):
                    continue  # 空/掩码密钥不改写
                m[k] = v
            _save("models", data)
            _audit("model.update", model_id)
            return m
    raise HTTPException(status_code=404, detail="model not found")


@router.delete("/admin/models/{model_id}")
async def delete_model(model_id: str):
    data = _load("models")
    before = len(data["items"])
    data["items"] = [m for m in data["items"] if m["id"] != model_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="model not found")
    _save("models", data)
    _audit("model.delete", model_id)
    return {"ok": True}


@router.post("/admin/models/test")
async def test_model(payload: dict):
    """连通性测试 (M1.23): 实时 ping 模型端点。
    contract: {provider, model?, base_url?, api_key?} -> AdminTestResult
    """
    provider = payload.get("provider", "")
    model = payload.get("model", "")
    base_url = payload.get("base_url", "")
    started = time.monotonic()
    try:
        from ...l1_llm.factory import create_llm

        llm = create_llm(
            {
                "provider": provider,
                "model": model,
                "base_url": base_url,
                "api_key": payload.get("api_key", ""),
            }
        )
        info = llm.get_model_info()
        latency = int((time.monotonic() - started) * 1000)
        return {
            "ok": True,
            "latency_ms": latency,
            "message": f"{info.get('provider')}/{info.get('model')} reachable",
            "detail": info,
        }
    except Exception as exc:  # noqa: BLE001
        latency = int((time.monotonic() - started) * 1000)
        return {"ok": False, "latency_ms": latency, "message": f"connect failed: {exc}"}


# ---------------------------------------------------------------------------
# Workflows — 编排工作流管理 (M7.25)
# ---------------------------------------------------------------------------
@router.get("/admin/workflows")
async def list_workflows():
    return _list("workflows")


@router.post("/admin/workflows")
async def save_workflow(payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="workflow name is required")
    item = {
        "id": payload.get("id") or _new_id("wf"),
        "name": name,
        "description": payload.get("description", ""),
        "graph": payload.get("graph", {"nodes": [], "edges": []}),
        "framework": payload.get("framework", "langgraph"),
        "enabled": bool(payload.get("enabled", True)),
        "created_at": int(time.time()),
    }
    return _upsert("workflows", item)


@router.delete("/admin/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    data = _load("workflows")
    before = len(data["items"])
    data["items"] = [w for w in data["items"] if w["id"] != workflow_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="workflow not found")
    _save("workflows", data)
    _audit("workflow.delete", workflow_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Evaluations — 评估管理 (M10.22)
# ---------------------------------------------------------------------------
@router.get("/admin/evaluations")
async def list_evaluations():
    data = _load("evaluations")
    return {"items": data.get("items", []), "total": len(data.get("items", []))}


@router.post("/admin/evaluations")
async def save_evaluation(payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="evaluation name is required")
    item = {
        "id": payload.get("id") or _new_id("ev"),
        "name": name,
        "cases": payload.get("cases", []),
        "tags": payload.get("tags", []),
        "created_at": int(time.time()),
    }
    return _upsert("evaluations", item)


@router.post("/admin/evaluations/run")
async def run_evaluation(payload: dict):
    """执行评估: 数据集 + Agent 版本 -> 跑分报告。
    contract: {dataset_id, agent_version, pass_threshold?} -> {task_id, status, report?}
    """
    dataset_id = payload.get("dataset_id", "")
    agent_version = payload.get("agent_version", "")
    threshold = float(payload.get("pass_threshold", 0.8))
    task_id = _new_id("task")
    # 真实执行走 scripts/evaluate.py (LLM 评估); 此处返回待执行任务
    return {
        "task_id": task_id,
        "status": "pending",
        "report": {
            "dataset_id": dataset_id,
            "agent_version": agent_version,
            "pass_threshold": threshold,
            "note": "run via scripts/evaluate.py in production",
        },
    }


# ---------------------------------------------------------------------------
# Metrics & Alerts — 可观测性 (M9.22 / M13.22)
# ---------------------------------------------------------------------------
@router.get("/admin/metrics")
async def get_metrics():
    """指标序列 (内存缓冲, 生产接 Prometheus/时序库)。"""
    try:
        from ...l10_infra import monitoring

        snap = monitoring.get_snapshot()
        now = time.strftime("%H:%M:%S")
        return {
            "series": {"requests": {"ts": [now], "values": [snap.get("requests", 0)]}},
            "summary": snap,
        }
    except Exception:  # noqa: BLE001
        return {
            "series": {"requests": {"ts": [], "values": []}},
            "summary": {"requests": 0, "errors": 0, "latency_ms": 0, "tokens": 0},
        }


@router.get("/admin/alerts")
async def list_alerts():
    return _list("alerts")


@router.post("/admin/alerts")
async def save_alert(payload: dict):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="alert name is required")
    item = {
        "id": payload.get("id") or _new_id("al"),
        "name": name,
        "metric": payload.get("metric", "latency_ms"),
        "condition": payload.get("condition", ">"),
        "threshold": payload.get("threshold", 1000),
        "channels": payload.get("channels", ["log"]),
        "enabled": bool(payload.get("enabled", True)),
        "created_at": int(time.time()),
    }
    return _upsert("alerts", item)


@router.delete("/admin/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    data = _load("alerts")
    before = len(data["items"])
    data["items"] = [a for a in data["items"] if a["id"] != alert_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="alert not found")
    _save("alerts", data)
    _audit("alert.delete", alert_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Settings — 系统设置 (M7.26)
# ---------------------------------------------------------------------------
@router.get("/admin/settings")
async def get_settings():
    data = _load("settings")
    data.setdefault("app", {"name": settings.APP_NAME, "lang": "zh-CN"})
    return data


@router.put("/admin/settings")
async def update_settings(payload: dict):
    data = _load("settings")
    data.update(payload)
    _save("settings", data)
    _audit("settings.update", "global")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Security — 权限与审计 (M13.23)
# ---------------------------------------------------------------------------
@router.get("/admin/security")
async def get_security():
    data = _load("security")
    data["audit_log"] = data.get("audit_log", [])[-200:]
    return data


@router.post("/admin/security/roles")
async def upsert_role(payload: dict):
    role = payload.get("role")
    perms = payload.get("permissions", [])
    if not role:
        raise HTTPException(status_code=400, detail="role is required")
    data = _load("security")
    data.setdefault("roles", {})[role] = perms
    _save("security", data)
    _audit("security.role", role)
    return {"ok": True}
