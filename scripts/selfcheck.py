#!/usr/bin/env python3
"""Full-scenario self-check for the deployed agent-builder MCP server.

Drives server/builder_server.py exactly like a real MCP client would (stdio,
line-delimited JSON-RPC) and exercises validate/build/verify gates plus the
protocol surface. Exit 0 only when every scenario passes.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(r"D:\github\agent-builder-skill")
SERVER = ROOT / "server" / "builder_server.py"
TEMPLATES = ROOT / "templates" / "agent-types"
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

results: list[tuple[str, str, str]] = []  # (group, name, PASS/FAIL + note)


def record(group: str, name: str, ok: bool, note: str = ""):
    results.append((group, name, ("PASS" if ok else "FAIL") + (f" | {note}" if note else "")))


class Client:
    """Line-delimited JSON-RPC client over the server's stdio."""

    def __init__(self):
        self.proc = subprocess.Popen(
            [sys.executable, str(SERVER)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            text=True, encoding="utf-8", errors="replace")

    def send(self, obj):
        line = obj if isinstance(obj, str) else json.dumps(obj)
        self.proc.stdin.write(line + "\n")
        self.proc.stdin.flush()

    def recv(self) -> dict:
        line = self.proc.stdout.readline()
        assert line.strip(), "server closed stdout unexpectedly"
        return json.loads(line)

    def request(self, method: str, params: dict | None = None, id_=1) -> dict:
        req = {"jsonrpc": "2.0", "id": id_, "method": method}
        if params is not None:
            req["params"] = params
        self.send(req)
        return self.recv()

    def call(self, tool: str, args: dict, id_=10) -> dict:
        r = self.request("tools/call",
                         {"name": tool, "arguments": args}, id_)
        assert "result" in r, r
        return json.loads(r["result"]["content"][0]["text"])

    def close(self):
        try:
            self.proc.stdin.close()
        except Exception:
            pass
        self.proc.wait(timeout=15)


VALID = """
agent: {name: T, type: chat, description: d}
llm: {provider: openai, model: gpt-4o-mini}
tools: {enabled: [web_search, current_time]}
"""


def sc_validate():
    g = "validate_config"
    def v(yaml_text):
        c = Client(); r = c.call("validate_config", {"config": yaml_text}); c.close(); return r

    cases = [
        ("minimal valid", VALID, True),
        ("missing agent.name", "agent: {type: chat}\nllm: {provider: openai, model: m}\n", False),
        ("missing llm.*", "agent: {name: X}\n", False),
        ("broken YAML", "key: [unclosed", False),
        ("non-mapping root", "- just\n- a list\n", False),
        ("empty config", "", False),
        ("unknown tool", VALID.replace("[web_search, current_time]", "[magic_wand]"), False),
        ("custom tool fills allowlist",
         'agent: {name: T, type: chat}\nllm: {provider: openai, model: m}\n'
         'tools: {enabled: [save_note], custom: [{name: save_note, description: s, parameters: {}}]}', True),
        ("custom entry missing name",
         VALID.replace("enabled: [web_search, current_time]",
                       "enabled: [x]\n  custom: [{description: no-name}]"), False),
        ("unknown framework", VALID + "\nframework: madeup\n", False),
        ("non-prod framework blocked", VALID + '\nframework: "openai-agents"\n', False),
        ("supervisor with one agent",
         VALID + '\norchestration:\n  mode: supervisor\n  agents:\n    - {name: a}\n', False),
        ("supervisor duplicate names",
         VALID + '\norchestration:\n  mode: supervisor\n  agents:\n    - {name: a}\n    - {name: a}\n', False),
        ("supervisor two agents ok",
         VALID + '\norchestration:\n  mode: supervisor\n  agents:\n    - {name: a}\n    - {name: b}\n', True),
    ]
    for name, y, expect_ok in cases:
        r = v(y)
        record(g, name, r.get("ok") is expect_ok,
               "" if r.get("ok") is expect_ok else f"got ok={r.get('ok')} err={r.get('errors') or r.get('error')}")

    # every shipped template must validate clean via the server path
    bad = []
    for cfg in sorted(TEMPLATES.glob("*.yaml")):
        r = v(cfg.read_text(encoding="utf-8"))
        if not r["ok"]:
            bad.append(f"{cfg.stem}:{r['errors'][:1]}")
    record(g, "all 12 shipped templates valid", not bad, "; ".join(bad))


def sc_build_verify(tmp: Path):
    g = "build_agent/verify_product"

    def call_build(args):
        c = Client(); r = c.call("build_agent", args); c.close(); return r

    # path guards
    r = call_build({"config_path": "rel.yaml", "output_dir": str(tmp / "o1")})
    record(g, "relative config_path rejected", not r["ok"] and "absolute" in r["error"])
    r = call_build({"config_path": str(TEMPLATES / "chat.yaml"), "output_dir": "rel_out"})
    record(g, "relative output_dir rejected", not r["ok"] and "absolute" in r["error"])
    r = call_build({"config_path": str(tmp / "nope.yaml"), "output_dir": str(tmp / "o2")})
    record(g, "missing config rejected", not r["ok"] and "not found" in r["error"])
    r = call_build({"config_path": str(TEMPLATES / "chat.yaml"),
                    "output_dir": str(tmp / "o3"), "framework": "madeup"})
    record(g, "bad framework rejected", not r["ok"])

    # invalid config refused before generation
    bad_cfg = tmp / "bad.yaml"; bad_cfg.write_text("agent: {}\n", encoding="utf-8")
    r = call_build({"config_path": str(bad_cfg), "output_dir": str(tmp / "o4")})
    record(g, "invalid config refused pre-build",
           not r["ok"] and "validation_errors" in r)

    # real generation, both frameworks
    prod_dirs = {}
    for fw in ("bare", "langgraph"):
        out = tmp / f"prod_{fw}"
        r = call_build({"config_path": str(TEMPLATES / "chat.yaml"),
                        "output_dir": str(out), "framework": fw})
        record(g, f"generate chat/{fw}", r.get("ok") is True and r.get("files_created", 0) > 20,
               f"files={r.get('files_created')}")
        prod_dirs[fw] = out

    # non-empty dir guard, then force
    out = prod_dirs["bare"]
    r = call_build({"config_path": str(TEMPLATES / "chat.yaml"),
                    "output_dir": str(out), "framework": "bare"})
    record(g, "non-empty dir refused without force",
           not r["ok"] and "force" in r.get("hint", ""))
    (tmp / "sentinel.txt").write_text("keep-me", encoding="utf-8")

    # representative multi-template sweep through the server path
    sweep_fail = []
    for stem in ("research", "customer_service", "data_analysis"):
        o = tmp / f"sweep_{stem}"
        r = call_build({"config_path": str(TEMPLATES / f"{stem}.yaml"),
                        "output_dir": str(o), "framework": "langgraph"})
        if not r["ok"]:
            sweep_fail.append(stem)
    record(g, "multi-template build sweep (3 more)", not sweep_fail, ",".join(sweep_fail))

    # verify_product gates
    def call_verify(args):
        c = Client(); r = c.call("verify_product", args); c.close(); return r

    r = call_verify({"output_dir": "relative/path"})
    record(g, "verify rejects relative path", not r["ok"])
    r = call_verify({"output_dir": str(tmp)})
    record(g, "verify rejects non-product dir", not r["ok"] and "main.py" in r["error"])

    r = call_verify({"output_dir": str(prod_dirs["langgraph"])})
    record(g, "verify passes on langgraph product",
           r.get("ok") is True and (r.get("passed") or 0) > 0 and (r.get("failed") or 0) == 0,
           f"passed={r.get('passed')} failed={r.get('failed')}")

    # regression simulation: inject a failing test into a copy of bare product
    broken_root = tmp / "prod_bare_broken"
    import shutil
    shutil.copytree(prod_dirs["bare"], broken_root)
    (broken_root / "tests" / "test_injected_failure.py").write_text(
        "def test_injected():\n    assert False, 'regression'\n", encoding="utf-8")
    r = call_verify({"output_dir": str(broken_root)})
    record(g, "verify FAILS when a regression is injected",
           r.get("ok") is False and (r.get("failed") or 0) >= 1,
           f"failed={r.get('failed')}")


def sc_protocol():
    g = "stdio protocol"
    c = Client()
    r = c.request("initialize", {"protocolVersion": "2024-11-05"}, 1)
    info = r["result"]["serverInfo"]
    record(g, "initialize handshake", info["name"] == "agent-builder" and info["version"] == "0.0.1")

    r = c.request("ping", None, 2)
    record(g, "ping -> empty result", r.get("result") == {})

    r = c.request("tools/list", None, 3)
    names = [t["name"] for t in r["result"]["tools"]]
    record(g, "tools/list three gates", set(names) == {"validate_config", "build_agent", "verify_product"})

    # notification must produce NO response; next response belongs to next request
    c.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
    r = c.request("echo-test", None, 4)
    record(g, "notification silent, stream stays aligned",
           r.get("id") == 4 and r.get("error", {}).get("code") == -32601)

    r = c.request("tools/call", {"name": "no_such_tool", "arguments": {}}, 5)
    record(g, "unknown tool -> isError result",
           r.get("result", {}).get("isError") is True)

    c.send("this is not json")   # raw non-JSON line -> server replies -32700
    err = c.recv()               # the -32700 error frame
    r = c.request("ping", None, 6)
    record(g, "garbage line -> -32700, connection survives",
           err.get("error", {}).get("code") == -32700 and r.get("id") == 6)

    c.send('"just a json string"')  # valid JSON but not an object -> -32600
    err2 = c.recv()
    r = c.request("ping", None, 7)
    record(g, "non-object JSON -> -32600, connection survives",
           err2.get("error", {}).get("code") == -32600 and r.get("id") == 7)
    c.close()

    # GBK console: run full dialogue WITHOUT PYTHONIOENCODING, under cmd
    import os
    env = {k: v for k, v in os.environ.items() if k != "PYTHONIOENCODING"}
    payload = "\n".join(json.dumps(m) for m in [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize",
         "params": {"protocolVersion": "2024-11-05"}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
         "params": {"name": "validate_config", "arguments": {"config": VALID}}},
    ]) + "\n"
    proc = subprocess.run(["cmd", "/c", "python", str(SERVER)], input=payload,
                          capture_output=True, text=True, encoding="gbk",
                          errors="replace", env=env, timeout=60)
    lines = [json.loads(l) for l in proc.stdout.splitlines() if l.strip()]
    inner = json.loads(lines[1]["result"]["content"][0]["text"])
    record(g, "GBK console full dialogue (no PYTHONIOENCODING)",
           len(lines) == 2 and inner["ok"] is True)


def main():
    with tempfile.TemporaryDirectory(prefix="abs_selfcheck_") as tmp:
        tmp = Path(tmp).resolve()
        print(f"workspace: {tmp}")
        sc_validate()
        sc_build_verify(tmp)
        sc_protocol()

    print("\n=== SELF-CHECK MATRIX ===")
    fails = 0
    last_group = None
    for grp, name, status in results:
        if grp != last_group:
            print(f"\n[{grp}]")
            last_group = grp
        mark = "PASS" if status.startswith("PASS") else "FAIL"
        if mark == "FAIL":
            fails += 1
        print(f"  [{mark}] {name}" + (f"  ({status.split(' | ',1)[1]})" if " | " in status else ""))
    total = len(results)
    print(f"\n{total - fails}/{total} scenarios passed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
