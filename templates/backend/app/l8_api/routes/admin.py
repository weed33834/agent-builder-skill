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
    # 新增集合 (M4/M5/M6/M9/M10/M11/M12/G11/M13)
    "security": {"users": [], "roles": {}, "api_keys": [], "audit_log": [], "permission_matrix": {}},
    "a2a_registry": {"agents": []},
    "a2a_tasks": {"tasks": []},
    "alert_history": {"events": []},
    "traces": {"traces": []},
    "logs": {"entries": []},
    "drift": {"series": [], "alerts": []},
    "tasks": {"items": []},
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
        # M2: version history (each save appends a snapshot) + A/B traffic split
        "versions": [
            {
                "version": 1,
                "content": content,
                "name": payload.get("name", "untitled"),
                "ts": int(time.time()),
                "note": "initial",
            }
        ],
        "ab": {"enabled": False, "variants": {}, "traffic": 50},
        "created_at": int(time.time()),
    }
    return _upsert("prompts", item)


@router.put("/admin/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, payload: dict):
    data = _load("prompts")
    for item in data["items"]:
        if item["id"] == prompt_id:
            prev_version = int(item.get("version", 1))
            item.update({k: v for k, v in payload.items() if k not in ("id", "created_at", "versions", "ab")})
            item["version"] = prev_version + 1
            # M2: append a version snapshot for diff / rollback
            versions = item.setdefault("versions", [])
            versions.append(
                {
                    "version": item["version"],
                    "content": item.get("content", ""),
                    "name": item.get("name", ""),
                    "ts": int(time.time()),
                    "note": payload.get("note", ""),
                }
            )
            item["versions"] = versions[-200:]
            _save("prompts", data)
            _audit("prompt.update", prompt_id)
            return item
    raise HTTPException(status_code=404, detail="prompt not found")


@router.get("/admin/prompts/{prompt_id}/versions")
async def list_prompt_versions(prompt_id: str):
    """M2: 提示词版本历史 (用于 diff / 回滚)。"""
    item = _find("prompts", prompt_id)
    return {"prompt_id": prompt_id, "versions": item.get("versions", [])}


@router.post("/admin/prompts/{prompt_id}/rollback")
async def rollback_prompt(prompt_id: str, payload: dict):
    """M2: 回滚到指定版本。contract: {version} -> {ok, current_version}"""
    version = int(payload.get("version", 1))
    data = _load("prompts")
    for item in data["items"]:
        if item["id"] == prompt_id:
            versions = item.get("versions", [])
            target = next((v for v in versions if v["version"] == version), None)
            if not target:
                raise HTTPException(status_code=404, detail=f"version {version} not found")
            versions.append(
                {"version": item.get("version", 0) + 1, "content": item.get("content", ""),
                 "name": item.get("name", ""), "ts": int(time.time()),
                 "note": "rollback to v{}".format(version)}
            )
            item["version"] = versions[-1]["version"]
            item["content"] = target["content"]
            item["name"] = target.get("name", item.get("name", ""))
            item["versions"] = versions[-200:]
            _save("prompts", data)
            _audit("prompt.rollback", prompt_id, f"to v{version}")
            return {"ok": True, "current_version": item["version"], "content": item["content"]}
    raise HTTPException(status_code=404, detail="prompt not found")


@router.post("/admin/prompts/{prompt_id}/ab")
async def set_prompt_ab(prompt_id: str, payload: dict):
    """M2: A/B 分流配置。contract: {enabled, variants, traffic} -> {ok, ab}"""
    data = _load("prompts")
    for item in data["items"]:
        if item["id"] == prompt_id:
            item["ab"] = {
                "enabled": bool(payload.get("enabled", False)),
                "variants": payload.get("variants", {}),  # {variant_id: {content, weight}}
                "traffic": int(payload.get("traffic", 50)),
            }
            _save("prompts", data)
            _audit("prompt.ab", prompt_id)
            return {"ok": True, "ab": item["ab"]}
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


# ---------------------------------------------------------------------------
# M1 — Model key pool / fallback chain (模型 key 池与回退链)
# ---------------------------------------------------------------------------
@router.post("/admin/models/{model_id}/keys")
async def manage_model_keys(model_id: str, payload: dict):
    """增删 key 池条目。contract: {action: add|remove, key?, } -> {ok, key_pool}"""
    action = payload.get("action", "add")
    data = _load("models")
    for m in data["items"]:
        if m["id"] == model_id:
            pool = m.setdefault("key_pool", [])
            if action == "add":
                key = payload.get("key", "")
                if not key:
                    raise HTTPException(status_code=400, detail="key is required")
                pool.append({"id": _new_id("k"), "key": key, "masked": key[:4] + "****", "enabled": True})
            elif action == "remove":
                kid = payload.get("key_id")
                pool[:] = [k for k in pool if k.get("id") != kid]
            _save("models", data)
            return {"ok": True, "key_pool": pool}
    raise HTTPException(status_code=404, detail="model not found")


@router.post("/admin/models/{model_id}/fallback")
async def set_model_fallback(model_id: str, payload: dict):
    """配置回退链。contract: {fallback: [{provider, model, base_url, api_key}]} -> {ok}"""
    data = _load("models")
    for m in data["items"]:
        if m["id"] == model_id:
            m["fallback"] = payload.get("fallback", [])
            _save("models", data)
            return {"ok": True, "fallback": m["fallback"]}
    raise HTTPException(status_code=404, detail="model not found")


# ---------------------------------------------------------------------------
# M5 — Knowledge base document management (知识库文档管理)
# ---------------------------------------------------------------------------
def _chunk_text(text: str, size: int = 500, overlap: int = 50) -> list[str]:
    """按字符分块 (生产可换用 tokenizer/语义切分)。"""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size - overlap
    return chunks


@router.get("/admin/memory/kbs")
async def list_kbs():
    """知识库列表 (含文档数/分块参数)。"""
    data = _load("memory")
    store = data.get("vector_store", {})
    kbs = []
    for kb_id, chunks in store.items():
        kbs.append({
            "id": kb_id,
            "name": data.get("kb_meta", {}).get(kb_id, {}).get("name", kb_id),
            "doc_count": len({c.get("doc_id", "") for c in chunks}),
            "chunk_count": len(chunks),
            "embedding": data.get("kb_meta", {}).get(kb_id, {}).get("embedding", settings.EMBEDDING_MODEL),
        })
    return {"items": kbs, "total": len(kbs)}


@router.post("/admin/memory/kbs")
async def create_kb(payload: dict):
    """创建知识库。contract: {id?, name, chunk_size?, overlap?, embedding?}"""
    kb_id = payload.get("id") or payload.get("name") or _new_id("kb")
    data = _load("memory")
    data.setdefault("vector_store", {}).setdefault(kb_id, [])
    data.setdefault("kb_meta", {})[kb_id] = {
        "name": payload.get("name", kb_id),
        "chunk_size": int(payload.get("chunk_size", settings.RAG_CHUNK_SIZE)),
        "overlap": int(payload.get("overlap", settings.RAG_CHUNK_OVERLAP)),
        "embedding": payload.get("embedding", settings.EMBEDDING_MODEL),
    }
    _save("memory", data)
    _audit("kb.create", kb_id)
    return {"ok": True, "id": kb_id}


@router.delete("/admin/memory/kbs/{kb_id}")
async def delete_kb(kb_id: str):
    data = _load("memory")
    data.get("vector_store", {}).pop(kb_id, None)
    data.get("kb_meta", {}).pop(kb_id, None)
    _save("memory", data)
    _audit("kb.delete", kb_id)
    return {"ok": True}


@router.get("/admin/memory/kbs/{kb_id}/documents")
async def list_kb_documents(kb_id: str):
    """知识库文档列表 (按 doc_id 聚合)。"""
    chunks = _load("memory").get("vector_store", {}).get(kb_id, [])
    docs: Dict[str, dict] = {}
    for c in chunks:
        doc_id = c.get("doc_id", "")
        if doc_id not in docs:
            docs[doc_id] = {"id": doc_id, "name": c.get("doc_name", doc_id), "chunk_count": 0, "created_at": c.get("ts")}
        docs[doc_id]["chunk_count"] += 1
    return {"items": list(docs.values()), "total": len(docs)}


@router.post("/admin/memory/kbs/{kb_id}/documents")
async def add_kb_document(kb_id: str, payload: dict):
    """上传/添加文档并分块入库。contract: {name?, content} -> {ok, doc_id, chunks}"""
    content = payload.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="document content is required")
    data = _load("memory")
    meta = data.setdefault("kb_meta", {}).get(kb_id, {})
    size = int(meta.get("chunk_size", settings.RAG_CHUNK_SIZE))
    overlap = int(meta.get("overlap", settings.RAG_CHUNK_OVERLAP))
    store = data.setdefault("vector_store", {}).setdefault(kb_id, [])
    doc_id = _new_id("doc")
    doc_name = payload.get("name") or f"document_{doc_id}"
    ts = int(time.time())
    for i, text in enumerate(_chunk_text(content, size, overlap)):
        store.append({
            "id": _new_id("chunk"), "doc_id": doc_id, "doc_name": doc_name,
            "text": text, "meta": payload.get("meta", {}), "ts": ts, "index": i,
        })
    _save("memory", data)
    _audit("kb.document.add", doc_id, kb_id)
    return {"ok": True, "doc_id": doc_id, "chunks": len(store) and sum(1 for c in store if c.get("doc_id") == doc_id)}


@router.delete("/admin/memory/kbs/{kb_id}/documents/{doc_id}")
async def delete_kb_document(kb_id: str, doc_id: str):
    data = _load("memory")
    store = data.get("vector_store", {}).get(kb_id, [])
    before = len(store)
    data["vector_store"][kb_id] = [c for c in store if c.get("doc_id") != doc_id]
    if len(data["vector_store"][kb_id]) == before:
        raise HTTPException(status_code=404, detail="document not found")
    _save("memory", data)
    _audit("kb.document.delete", doc_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# M4 — Tool test-run & hot-reload (工具试跑与热加载)
# ---------------------------------------------------------------------------
@router.post("/admin/tools/{tool_id}/run")
async def run_tool(tool_id: str, payload: dict):
    """工具试跑: 用给定参数执行工具返回结果 (生产接 ToolExecutor)。
    contract: {params} -> {ok, result, latency_ms}"""
    data = _load("tools")
    tool = next((t for t in data["items"] if t["id"] == tool_id), None)
    if not tool:
        raise HTTPException(status_code=404, detail="tool not found")
    started = time.monotonic()
    try:
        from ...l5_tools.executor import ToolExecutor
        result = await ToolExecutor().execute(tool.get("name"), payload.get("params", {}))
        return {"ok": True, "result": result, "latency_ms": int((time.monotonic() - started) * 1000)}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc), "latency_ms": int((time.monotonic() - started) * 1000)}


@router.post("/admin/tools/reload")
async def reload_tools(payload: dict = None):
    """热加载工具: 从插件目录扫描注册工具。
    contract: {dir?} -> {ok, registered}"""
    tool_dir = (payload or {}).get("dir", "")
    registered = 0
    if tool_dir:
        try:
            from ...l10_infra.plugin_manager import PluginManager
            pm = PluginManager([tool_dir])
            pm.load_all()
            discovered = pm.list_info()
            data = _load("tools")
            for d in discovered:
                if not any(t.get("name") == d.get("name") for t in data["items"]):
                    data["items"].append({
                        "id": _new_id("t"), "name": d.get("name", ""),
                        "description": d.get("description", ""), "schema": d.get("schema", {}),
                        "endpoint": d.get("endpoint", ""), "enabled": True,
                        "params": {}, "source": "hot-reload", "created_at": int(time.time()),
                    })
                    registered += 1
            _save("tools", data)
        except Exception:  # noqa: BLE001
            registered = 0
    return {"ok": True, "registered": registered}


# ---------------------------------------------------------------------------
# M11 — IAM: users / api_keys / permission matrix / audit (权限与用户管理)
# ---------------------------------------------------------------------------
@router.get("/admin/security/users")
async def list_users():
    sec = _load("security")
    return {"items": sec.get("users", []), "total": len(sec.get("users", []))}


@router.post("/admin/security/users")
async def create_user(payload: dict):
    """新增/邀请用户。contract: {username, role?, email?} -> {ok, user}"""
    username = payload.get("username") or payload.get("email") or ""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")
    data = _load("security")
    users = data.setdefault("users", [])
    user = {
        "id": _new_id("u"),
        "username": username,
        "email": payload.get("email", ""),
        "role": payload.get("role", "viewer"),  # admin | developer | viewer
        "status": "invited",
        "created_at": int(time.time()),
    }
    users.append(user)
    _save("security", data)
    _audit("security.user.create", user["id"])
    return {"ok": True, "user": user}


@router.put("/admin/security/users/{user_id}")
async def update_user(user_id: str, payload: dict):
    data = _load("security")
    for u in data.get("users", []):
        if u["id"] == user_id:
            if "role" in payload:
                u["role"] = payload["role"]
            if "status" in payload:
                u["status"] = payload["status"]
            _save("security", data)
            _audit("security.user.update", user_id, f"role={u['role']}")
            return {"ok": True, "user": u}
    raise HTTPException(status_code=404, detail="user not found")


@router.delete("/admin/security/users/{user_id}")
async def delete_user(user_id: str):
    data = _load("security")
    before = len(data.get("users", []))
    data["users"] = [u for u in data.get("users", []) if u["id"] != user_id]
    if len(data["users"]) == before:
        raise HTTPException(status_code=404, detail="user not found")
    _save("security", data)
    return {"ok": True}


@router.get("/admin/security/api_keys")
async def list_api_keys():
    sec = _load("security")
    return {"items": sec.get("api_keys", []), "total": len(sec.get("api_keys", []))}


@router.post("/admin/security/api_keys")
async def create_api_key(payload: dict):
    """生成 API Key。contract: {name?, scope?, expires_at?} -> {ok, key, id}"""
    import secrets
    data = _load("security")
    keys = data.setdefault("api_keys", [])
    token = secrets.token_urlsafe(32)
    item = {
        "id": _new_id("ak"),
        "name": payload.get("name", "default"),
        "key": f"sk-{token}",  # 生产仅存哈希
        "scope": payload.get("scope", "read"),
        "status": "active",
        "created_at": int(time.time()),
    }
    keys.append(item)
    _save("security", data)
    _audit("security.api_key.create", item["id"])
    return {"ok": True, "id": item["id"], "key": item["key"]}


@router.delete("/admin/security/api_keys/{key_id}")
async def revoke_api_key(key_id: str):
    data = _load("security")
    for k in data.get("api_keys", []):
        if k["id"] == key_id:
            k["status"] = "revoked"
            _save("security", data)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="api_key not found")


@router.put("/admin/security/permissions")
async def set_permission_matrix(payload: dict):
    """权限矩阵: {matrix: {module: {role: [actions]}}} -> {ok}"""
    data = _load("security")
    data["permission_matrix"] = payload.get("matrix", {})
    _save("security", data)
    _audit("security.permissions", "global")
    return {"ok": True}


@router.get("/admin/security/audit")
async def get_audit_log():
    sec = _load("security")
    return {"items": sec.get("audit_log", [])[-500:], "total": len(sec.get("audit_log", []))}


# ---------------------------------------------------------------------------
# M12 — Agent AI 生成 / 导入 / 模板市场 / 发布灰度
# ---------------------------------------------------------------------------
@router.post("/admin/agents/generate")
async def generate_agent(payload: dict):
    """AI 生成 Agent 草稿。contract: {description, kind?} -> {draft, yaml}"""
    desc = payload.get("description", "")
    if not desc:
        raise HTTPException(status_code=400, detail="description is required")
    kind = payload.get("kind", "chat")
    # 生产走 LLM; 此处产出结构化 yaml 草稿
    import yaml as _yaml
    draft = {
        "name": f"agent_{_new_id('a')[2:]}",
        "type": kind,
        "description": desc,
        "system_prompt": f"You are an expert assistant. Task: {desc}",
        "tools": [],
        "framework": "langgraph",
        "graph": {"nodes": [], "edges": []},
        "memory": "buffer",
    }
    return {"draft": draft, "yaml": _yaml.safe_dump(draft, allow_unicode=True, sort_keys=False)}


@router.post("/admin/agents/import")
async def import_agent(payload: dict):
    """导入 Agent (yaml/json/平台转换)。contract: {format, content, source?} -> {imported, items}"""
    fmt = payload.get("format", "yaml")
    content = payload.get("content", "")
    source = payload.get("source", "")
    if not content:
        raise HTTPException(status_code=400, detail="content is required")
    item = {"id": _new_id("a"), "name": f"imported_{source or fmt}", "system_prompt": content,
            "tools": [], "framework": "langgraph", "graph": {}, "enabled": False,
            "source": f"import:{fmt}", "created_at": int(time.time())}
    if fmt == "json":
        try:
            parsed = json.loads(content)
            item["name"] = parsed.get("name", item["name"])
            item["system_prompt"] = parsed.get("system_prompt", parsed.get("description", content))
            item["tools"] = parsed.get("tools", [])
            item["framework"] = parsed.get("framework", "langgraph")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="invalid json")
    _upsert("agents", item)
    _audit("agent.import", item["id"], source)
    return {"imported": 1, "items": [item]}


@router.get("/admin/agents/templates")
async def list_agent_templates_market():
    """模板市场: 内置 agent-types 模板列表。"""
    templates_dir = Path(__file__).resolve().parents[4] / "agent-types"
    items = []
    if templates_dir.exists():
        for f in sorted(templates_dir.glob("*.yaml")):
            try:
                import yaml as _yaml
                doc = _yaml.safe_load(f.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                doc = {}
            items.append({"name": f.stem, "path": str(f), "desc": doc.get("description", "") if doc else ""})
    return {"items": items, "total": len(items)}


@router.post("/admin/agents/{agent_id}/publish")
async def publish_agent(agent_id: str, payload: dict):
    """发布版本 / 灰度流量。contract: {version?, traffic?} -> {ok, version, traffic}"""
    data = _load("agents")
    for a in data["items"]:
        if a["id"] == agent_id:
            a["published_version"] = int(payload.get("version", a.get("published_version", 1)))
            a["gray_traffic"] = int(payload.get("traffic", 100))
            a["status"] = "published"
            _save("agents", data)
            return {"ok": True, "version": a["published_version"], "traffic": a["gray_traffic"]}
    raise HTTPException(status_code=404, detail="agent not found")


# ---------------------------------------------------------------------------
# M6 — A2A 远端注册表 + 任务监控 (编排)
# ---------------------------------------------------------------------------
@router.get("/admin/a2a")
async def list_a2a_registry():
    """A2A 远端 Agent 注册表。"""
    data = _load("a2a_registry")
    return {"items": data.get("agents", []), "total": len(data.get("agents", []))}


@router.post("/admin/a2a")
async def register_a2a_agent(payload: dict):
    """注册远端 Agent (Agent Card URL 导入)。contract: {name?, url} -> {ok, agent}"""
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    data = _load("a2a_registry")
    agent = {
        "id": _new_id("a2a"),
        "name": payload.get("name") or url.rstrip("/").split("/")[-1] or "remote",
        "url": url,
        "card": payload.get("card", {}),
        "status": "registered",
        "created_at": int(time.time()),
    }
    data.setdefault("agents", []).append(agent)
    _save("a2a_registry", data)
    _audit("a2a.register", agent["id"], url)
    return {"ok": True, "agent": agent}


@router.delete("/admin/a2a/{agent_id}")
async def delete_a2a_agent(agent_id: str):
    data = _load("a2a_registry")
    before = len(data.get("agents", []))
    data["agents"] = [a for a in data.get("agents", []) if a["id"] != agent_id]
    if len(data["agents"]) == before:
        raise HTTPException(status_code=404, detail="a2a agent not found")
    _save("a2a_registry", data)
    return {"ok": True}


@router.get("/admin/a2a/tasks")
async def list_a2a_tasks():
    """任务运行监控。"""
    data = _load("a2a_tasks")
    return {"items": data.get("tasks", []), "total": len(data.get("tasks", []))}


# ---------------------------------------------------------------------------
# M9 — 告警通知历史
# ---------------------------------------------------------------------------
@router.get("/admin/alerts/history")
async def get_alert_history(limit: int = 100):
    data = _load("alert_history")
    events = data.get("events", [])[-limit:]
    return {"items": events, "total": len(events)}


# ---------------------------------------------------------------------------
# M10 — Trace / Log / Data-drift 查看器 (质量层)
# ---------------------------------------------------------------------------
@router.get("/admin/traces")
async def list_traces(limit: int = 50):
    """Trace 列表。"""
    data = _load("traces")
    items = data.get("traces", [])[-limit:]
    return {"items": items, "total": len(items)}


@router.get("/admin/traces/{trace_id}")
async def get_trace(trace_id: str):
    data = _load("traces")
    for t in data.get("traces", []):
        if t["id"] == trace_id:
            return t
    raise HTTPException(status_code=404, detail="trace not found")


@router.get("/admin/logs")
async def get_logs(level: str = "", service: str = "", limit: int = 100):
    """结构化日志查看器。"""
    data = _load("logs")
    items = data.get("entries", [])
    if level:
        items = [e for e in items if e.get("level", "").upper() == level.upper()]
    if service:
        items = [e for e in items if e.get("service") == service]
    return {"items": items[-limit:], "total": len(items)}


@router.get("/admin/drift")
async def get_drift():
    """数据漂移检测。"""
    data = _load("drift")
    return {"series": data.get("series", []), "alerts": data.get("alerts", [])}


# ---------------------------------------------------------------------------
# G11 — 定时任务管理 (schedule)
# ---------------------------------------------------------------------------
@router.get("/admin/tasks")
async def list_schedule_tasks():
    data = _load("tasks")
    return {"items": data.get("items", []), "total": len(data.get("items", []))}


@router.post("/admin/tasks")
async def create_schedule_task(payload: dict):
    """定时任务。contract: {name, cron, action, enabled?} -> {ok, item}"""
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    data = _load("tasks")
    item = {
        "id": payload.get("id") or _new_id("t"),
        "name": name,
        "cron": payload.get("cron", "0 9 * * *"),
        "action": payload.get("action", {}),
        "enabled": bool(payload.get("enabled", True)),
        "last_run": payload.get("last_run"),
        "created_at": int(time.time()),
    }
    data.setdefault("items", []).append(item)
    _save("tasks", data)
    return {"ok": True, "item": item}


@router.delete("/admin/tasks/{task_id}")
async def delete_schedule_task(task_id: str):
    data = _load("tasks")
    before = len(data.get("items", []))
    data["items"] = [t for t in data.get("items", []) if t["id"] != task_id]
    if len(data["items"]) == before:
        raise HTTPException(status_code=404, detail="task not found")
    _save("tasks", data)
    return {"ok": True}


# ---------------------------------------------------------------------------
# M13 — 备份 / 迁移
# ---------------------------------------------------------------------------
@router.get("/admin/backup")
async def export_backup():
    """全量导出配置包 (yaml)。"""
    kinds = ["prompts", "tools", "memory", "agents", "models", "workflows",
             "evaluations", "alerts", "settings", "security", "tasks", "a2a_registry"]
    bundle = {k: _load(k) for k in kinds}
    bundle["_meta"] = {"exported_at": int(time.time()), "version": settings.APP_VERSION}
    return bundle


@router.post("/admin/backup/restore")
async def restore_backup(payload: dict):
    """恢复配置包。contract: {bundle} -> {ok, restored}"""
    bundle = payload.get("bundle", {}) or {}
    restored = 0
    kinds = ["prompts", "tools", "memory", "agents", "models", "workflows",
             "evaluations", "alerts", "settings", "security", "tasks", "a2a_registry"]
    for k in kinds:
        if k in bundle and isinstance(bundle[k], dict):
            _save(k, bundle[k])
            restored += 1
    _audit("backup.restore", "global", f"{restored} collections")
    return {"ok": True, "restored": restored}


# ---------------------------------------------------------------------------
# 23-cost-billing — Usage & cost tracking (用量与成本计费)
# ---------------------------------------------------------------------------
@router.get("/admin/usage")
async def get_usage(days: int = 7):
    """用量/成本汇总（按日/模型/会话 + 预算）。"""
    from ...l10_infra.usage import get_usage_summary
    return get_usage_summary(days)


@router.post("/admin/usage/budget")
async def set_usage_budget(payload: dict):
    """设置月度预算。contract: {monthly_usd, enabled}"""
    from ...l10_infra.usage import set_budget
    return set_budget(float(payload.get("monthly_usd", 100.0)), bool(payload.get("enabled", True)))


# ---------------------------------------------------------------------------
# 25-performance-engineering — Circuit breaker status (熔断器)
# ---------------------------------------------------------------------------
@router.get("/admin/breakers")
async def list_circuit_breakers():
    from ...l10_infra.circuit_breaker import get_circuit_breakers
    return {"items": get_circuit_breakers().list()}


# ---------------------------------------------------------------------------
# M13 / M10 — 运行期观测：写入 trace / 日志 / 告警事件 (供观测端点读取)
# ---------------------------------------------------------------------------
def record_trace(span: dict) -> None:
    """记录一条 trace span (供运行时调用)。"""
    data = _load("traces")
    data.setdefault("traces", []).append({
        "id": _new_id("tr"), "ts": int(time.time() * 1000), **span,
    })
    data["traces"] = data["traces"][-1000:]
    _save("traces", data)


def record_log(entry: dict) -> None:
    """记录一条结构化日志。"""
    data = _load("logs")
    data.setdefault("entries", []).append({"ts": int(time.time() * 1000), **entry})
    data["entries"] = data["entries"][-2000:]
    _save("logs", data)


def record_alert_event(event: dict) -> None:
    """记录一条告警触发事件。"""
    data = _load("alert_history")
    data.setdefault("events", []).append({"ts": int(time.time() * 1000), **event})
    data["events"] = data["events"][-1000:]
    _save("alert_history", data)
