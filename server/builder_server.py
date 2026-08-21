#!/usr/bin/env python3
"""agent-builder MCP server (stdio, JSON-RPC 2.0)

Exposes three hard-gate tools so an AI cannot claim success without evidence:

  validate_config   agent.yaml must pass schema checks before generation
  build_agent       wraps scripts/generate.py; refuses to clobber non-empty dirs
  verify_product    generated product must import AND pass its shipped pytest

Zero third-party runtime deps for the server itself except PyYAML for config
parsing (the generator needs it anyway). Protocol handling follows the same
conventions as the AgentSeed guard server: unknown methods -> -32601,
internal errors -> -32603, ping -> empty result.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

SERVER_NAME = "agent-builder"
SERVER_VERSION = "0.0.1"

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
GENERATE_SCRIPT = PLUGIN_ROOT / "scripts" / "generate.py"

FRAMEWORKS = ["langgraph", "bare", "openai-agents", "claude-sdk", "adk", "autogen"]
PROD_READY_FRAMEWORKS = ["langgraph", "bare"]

BASE_TOOL_NAMES = [
    "web_search", "web_fetch", "current_time", "calculate",
    "code_execute", "run_code", "file_read", "file_write",
    "read_csv", "analyze_data", "generate_chart",
]

TOOLS_SPEC = [
    {
        "name": "validate_config",
        "description": (
            "Validate an agent.yaml string BEFORE generation. Checks required "
            "fields, framework enum, and that every tools.enabled name is a "
            "known base tool or defined in tools.custom. Never generate with "
            "errors."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"config": {"type": "string", "description": "agent.yaml content"}},
            "required": ["config"],
        },
    },
    {
        "name": "build_agent",
        "description": (
            "Generate a complete runnable full-stack agent project from an "
            "agent.yaml file. Refuses to write into a non-empty directory "
            "unless force=true."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "config_path": {"type": "string", "description": "Absolute path to agent.yaml"},
                "output_dir": {"type": "string", "description": "Absolute path for the generated project"},
                "framework": {"type": "string", "enum": FRAMEWORKS, "default": "langgraph"},
                "force": {"type": "boolean", "default": False},
            },
            "required": ["config_path", "output_dir"],
        },
    },
    {
        "name": "verify_product",
        "description": (
            "Delivery gate for a generated project: 'import app.main' must "
            "succeed and the product's own pytest suite must pass. Do not "
            "report completion while this returns ok=false."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "output_dir": {"type": "string", "description": "Absolute path of the generated project"},
                "pytest_timeout": {"type": "integer", "default": 300},
            },
            "required": ["output_dir"],
        },
    },
]


# ────────────────────────── validate_config ──────────────────────────

def validate_config(config: str) -> dict:
    """Schema-check an agent.yaml string. Returns {ok, errors}."""
    errors: list[str] = []
    try:
        import yaml
    except ImportError:
        return {"ok": False, "errors": ["PyYAML is required: pip install pyyaml"]}

    try:
        cfg = yaml.safe_load(config)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "errors": [f"YAML parse error: {exc}"]}

    if not isinstance(cfg, dict):
        return {"ok": False, "errors": ["Config root must be a mapping"]}

    agent = cfg.get("agent") or {}
    llm = cfg.get("llm") or {}

    # Required fields
    if not str(agent.get("name") or "").strip():
        errors.append("agent.name is required")
    if not str(llm.get("provider") or "").strip():
        errors.append("llm.provider is required")
    if not str(llm.get("model") or "").strip():
        errors.append("llm.model is required")

    # Framework enum
    fw = (cfg.get("framework")
          or (cfg.get("agent_framework") or {}).get("name")
          or "langgraph")
    if fw not in FRAMEWORKS:
        errors.append(f"framework '{fw}' not in {FRAMEWORKS}")
    elif fw not in PROD_READY_FRAMEWORKS:
        errors.append(
            f"framework '{fw}' emits an adapter skeleton only; "
            f"production-ready options are {PROD_READY_FRAMEWORKS}"
        )

    # Tool allowlist
    tools_cfg = cfg.get("tools") or {}
    enabled = tools_cfg.get("enabled") or []
    custom = tools_cfg.get("custom") or []
    custom_names = set()
    for ct in custom:
        name = (ct or {}).get("name")
        if not name:
            errors.append("every tools.custom entry needs a 'name'")
        else:
            custom_names.add(name)
    for t in enabled:
        if t not in BASE_TOOL_NAMES and t not in custom_names:
            errors.append(
                f"tools.enabled contains unknown tool '{t}'; "
                f"use one of {BASE_TOOL_NAMES} or define it in tools.custom"
            )

    # Supervisor sanity
    orch = cfg.get("orchestration") or {}
    agents = orch.get("agents") or []
    if orch.get("mode") == "supervisor":
        if len(agents) < 2:
            errors.append('orchestration.mode="supervisor" needs at least 2 agents[]')
        names = [str((a or {}).get("name") or "") for a in agents]
        dupes = sorted({n for n in names if names.count(n) > 1})
        if dupes:
            errors.append(f"duplicate orchestration.agents[].name: {dupes}")

    return {"ok": not errors, "errors": errors}


# ─────────────────────────── build_agent ─────────────────────────────

def build_agent(config_path: str, output_dir: str,
                framework: str = "langgraph", force: bool = False) -> dict:
    """Run scripts/generate.py as a subprocess. Returns {ok, ...}."""
    cfg_path = Path(config_path)
    out_dir = Path(output_dir)

    if not cfg_path.is_absolute():
        return {"ok": False, "error": "config_path must be an absolute path"}
    if not out_dir.is_absolute():
        return {"ok": False, "error": "output_dir must be an absolute path"}
    if not cfg_path.exists():
        return {"ok": False, "error": f"config not found: {config_path}"}

    # First pass: validate before spending generation time.
    pre = validate_config(cfg_path.read_text(encoding="utf-8"))
    if not pre["ok"]:
        return {"ok": False, "error": "config failed validation",
                "validation_errors": pre["errors"]}

    if out_dir.exists() and any(out_dir.iterdir()) and not force:
        return {
            "ok": False,
            "error": f"output_dir exists and is not empty: {output_dir}",
            "hint": "choose another dir, or pass force=true to overwrite",
        }

    if framework not in PROD_READY_FRAMEWORKS:
        return {"ok": False,
                "error": f"build_agent supports {PROD_READY_FRAMEWORKS}; got '{framework}'"}

    cmd = [sys.executable, str(GENERATE_SCRIPT), str(cfg_path), str(out_dir),
           f"--framework={framework}"]
    env_include_utf8 = {k: v for k, v in __import__("os").environ.items()}
    env_include_utf8.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        proc = subprocess.run(cmd, cwd=str(PLUGIN_ROOT), capture_output=True,
                              text=True, encoding="utf-8", errors="replace",
                              timeout=300, env=env_include_utf8)
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "generation timed out after 300s"}

    tail = "\n".join((proc.stdout or "").strip().splitlines()[-8:])
    if proc.returncode != 0:
        err_tail = "\n".join((proc.stderr or "").strip().splitlines()[-15:])
        return {"ok": False, "error": "generation failed",
                "stdout_tail": tail, "stderr_tail": err_tail}

    files = sum(1 for _ in out_dir.rglob("*") if _.is_file())
    return {
        "ok": True,
        "output_dir": str(out_dir),
        "files_created": files,
        "next_steps": [
            f"cd {out_dir}",
            "pip install -r requirements.txt",
            "uvicorn app.main:app --reload --port 8000",
            "cd frontend && npm install && npm run dev",
        ],
    }


# ────────────────────────── verify_product ───────────────────────────

def _run(cmd: list[str], cwd: Path, timeout: int) -> tuple[int, str]:
    import os
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True,
                              text=True, encoding="utf-8", errors="replace",
                              timeout=timeout, env=env)
        out = (proc.stdout or "") + (proc.stderr or "")
        return proc.returncode, out
    except subprocess.TimeoutExpired:
        return -1, f"timed out after {timeout}s"


def verify_product(output_dir: str, pytest_timeout: int = 300) -> dict:
    """Import gate + pytest gate for a generated product."""
    prod = Path(output_dir)
    if not prod.is_absolute():
        return {"ok": False, "error": "output_dir must be an absolute path"}
    if not (prod / "app" / "main.py").exists():
        return {"ok": False, "error": f"not a generated product (missing app/main.py): {output_dir}"}

    code, out = _run([sys.executable, "-c", "import app.main"], prod, 60)
    import_ok = code == 0
    if not import_ok:
        tail = "\n".join(out.strip().splitlines()[-15:])
        return {"ok": False, "import_ok": False, "error": "import app.main failed",
                "stderr_tail": tail}

    code, out = _run([sys.executable, "-m", "pytest", "tests", "-q"], prod, pytest_timeout)
    import re
    passed = int(m.group(1)) if (m := re.search(r"(\d+) passed", out)) else None
    failed = int(m.group(1)) if (m := re.search(r"(\d+) failed", out)) else None

    ok = code == 0 and (failed or 0) == 0
    summary_lines = out.strip().splitlines()[-3:]
    return {
        "ok": ok,
        "import_ok": True,
        "pytest_exit_code": code,
        "passed": passed,
        "failed": failed,
        "summary": "\n".join(summary_lines),
    }


# ────────────────────────── JSON-RPC plumbing ────────────────────────

def _dispatch_tool(name: str, args: dict) -> dict:
    if name == "validate_config":
        return validate_config(args.get("config", ""))
    if name == "build_agent":
        return build_agent(
            args.get("config_path", ""),
            args.get("output_dir", ""),
            args.get("framework", "langgraph"),
            bool(args.get("force", False)),
        )
    if name == "verify_product":
        return verify_product(
            args.get("output_dir", ""),
            int(args.get("pytest_timeout", 300)),
        )
    raise KeyError(name)


def handle_request(req: dict) -> dict | None:
    """Handle one JSON-RPC request object; return response or None (notification)."""
    rid = req.get("id")
    method = req.get("method", "")
    try:
        if method == "initialize":
            return {"jsonrpc": "2.0", "id": rid, "result": {
                "protocolVersion": req.get("params", {}).get("protocolVersion", "2024-11-05"),
                "capabilities": {"tools": {}},
                "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
            }}
        if method == "notifications/initialized":
            return None
        if method == "ping":
            return {"jsonrpc": "2.0", "id": rid, "result": {}}
        if method == "tools/list":
            return {"jsonrpc": "2.0", "id": rid, "result": {"tools": TOOLS_SPEC}}
        if method == "tools/call":
            params = req.get("params") or {}
            try:
                result = _dispatch_tool(params.get("name", ""), params.get("arguments") or {})
            except KeyError:
                return {"jsonrpc": "2.0", "id": rid, "result": {
                    "content": [{"type": "text", "text": json.dumps(
                        {"ok": False, "error": f"unknown tool '{params.get('name')}'"})}],
                    "isError": True,
                }}
            except Exception as exc:  # noqa: BLE001
                return {"jsonrpc": "2.0", "id": rid, "error": {
                    "code": -32603, "message": f"internal error: {exc}"}}
            return {"jsonrpc": "2.0", "id": rid, "result": {
                "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}]
            }}
        return {"jsonrpc": "2.0", "id": rid, "error": {
            "code": -32601, "message": f"method not found: {method}"}}
    except Exception as exc:  # noqa: BLE001
        return {"jsonrpc": "2.0", "id": rid, "error": {
            "code": -32603, "message": f"internal error: {exc}"}}


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": None, "error": {
                "code": -32700, "message": "parse error"}}) + "\n")
            sys.stdout.flush()
            continue
        resp = handle_request(req)
        if resp is not None:
            sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
