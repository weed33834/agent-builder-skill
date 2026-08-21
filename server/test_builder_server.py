"""Tests for the agent-builder MCP server (server/builder_server.py).

Covers: config validation rules, build/verify gates on a real generated
product, and the JSON-RPC protocol surface.
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PLUGIN_ROOT / "server"))

import builder_server as bs  # noqa: E402


VALID_YAML = """
agent:
  name: "TestAgent"
  type: "chat"
  description: "test agent"
llm:
  provider: "openai"
  model: "gpt-4o-mini"
tools:
  enabled: [web_search, current_time]
"""


class TestValidateConfig:
    def test_valid_config_passes(self):
        res = bs.validate_config(VALID_YAML)
        assert res["ok"] is True, res
        assert res["errors"] == []

    def test_missing_required_fields(self):
        res = bs.validate_config("agent:\n  type: chat\n")
        assert res["ok"] is False
        joined = " ".join(res["errors"])
        for field in ("agent.name", "llm.provider", "llm.model"):
            assert field in joined

    def test_bad_yaml(self):
        res = bs.validate_config("key: [unclosed")
        assert res["ok"] is False
        assert any("parse error" in e for e in res["errors"])

    def test_unknown_tool_rejected(self):
        cfg = VALID_YAML.replace(
            "enabled: [web_search, current_time]",
            "enabled: [magic_unknown_tool]")
        res = bs.validate_config(cfg)
        assert res["ok"] is False
        assert any("magic_unknown_tool" in e for e in res["errors"])

    def test_custom_tool_satisfies_allowlist(self):
        cfg = VALID_YAML.replace(
            "tools:\n  enabled: [web_search, current_time]",
            'tools:\n  enabled: [save_note]\n  custom:\n    - name: "save_note"\n'
            '      description: "save"\n      parameters: {}')
        res = bs.validate_config(cfg)
        assert res["ok"] is True, res

    def test_unknown_framework_rejected(self):
        cfg = VALID_YAML + "\nframework: \"madeup\"\n"
        res = bs.validate_config(cfg)
        assert res["ok"] is False

    def test_supervisor_needs_two_agents(self):
        cfg = VALID_YAML + (
            '\norchestration:\n  mode: "supervisor"\n'
            '  agents:\n    - name: "a"\n      role: "r"\n')
        res = bs.validate_config(cfg)
        assert res["ok"] is False
        assert any("at least 2" in e for e in res["errors"])

    def test_duplicate_agent_names_rejected(self):
        cfg = VALID_YAML + (
            '\norchestration:\n  mode: "supervisor"\n'
            '  agents:\n    - name: "a"\n    - name: "a"\n')
        res = bs.validate_config(cfg)
        assert res["ok"] is False


class TestProtocol:
    def _rpc(self, req: dict) -> dict:
        resp = bs.handle_request(req)
        assert resp is not None
        return resp

    def test_initialize_reports_version(self):
        r = self._rpc({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                       "params": {"protocolVersion": "2024-11-05"}})
        assert r["result"]["serverInfo"]["name"] == "agent-builder"
        assert r["result"]["serverInfo"]["version"] == "0.0.1"

    def test_tools_list_has_three_gates(self):
        r = self._rpc({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        names = {t["name"] for t in r["result"]["tools"]}
        assert names == {"validate_config", "build_agent", "verify_product"}

    def test_unknown_method_is_32601(self):
        r = self._rpc({"jsonrpc": "2.0", "id": 3, "method": "nope"})
        assert r["error"]["code"] == -32601

    def test_ping_empty_result(self):
        r = self._rpc({"jsonrpc": "2.0", "id": 4, "method": "ping"})
        assert r["result"] == {}

    def test_stdio_roundtrip(self):
        """Full stdio loop: initialize -> tools/call validate_config."""
        init = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
                "params": {"protocolVersion": "2024-11-05"}}
        call = {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
                "params": {"name": "validate_config",
                           "arguments": {"config": VALID_YAML}}}
        payload = "\n".join(json.dumps(m) for m in (init, call)) + "\n"
        proc = subprocess.run(
            [sys.executable, str(PLUGIN_ROOT / "server" / "builder_server.py")],
            input=payload, capture_output=True, text=True,
            encoding="utf-8", timeout=60)
        lines = [json.loads(l) for l in proc.stdout.strip().splitlines() if l.strip()]
        assert len(lines) == 2
        inner = json.loads(lines[1]["result"]["content"][0]["text"])
        assert inner["ok"] is True


class TestBuildAndVerifyGates:
    """End-to-end: validate -> build -> verify on a real product."""

    @pytest.fixture(scope="class")
    def product_dir(self, tmp_path_factory):
        out = tmp_path_factory.mktemp("gate_e2e") / "prod"
        # non-absolute guard first
        res = bs.build_agent("relative.yaml", "rel_out")
        assert res["ok"] is False and "absolute" in res["error"]
        res = bs.build_agent(str(PLUGIN_ROOT / "templates" / "agent-types" / "chat.yaml"),
                             str(out), framework="langgraph")
        assert res["ok"] is True, res
        return out

    def test_build_refuses_nonempty_without_force(self, product_dir):
        res = bs.build_agent(
            str(PLUGIN_ROOT / "templates" / "agent-types" / "chat.yaml"),
            str(product_dir), framework="langgraph")
        assert res["ok"] is False
        assert "force" in res["hint"]

    def test_verify_product_passes(self, product_dir):
        res = bs.verify_product(str(product_dir))
        assert res["import_ok"] is True
        assert res["ok"] is True, res
        assert (res["passed"] or 0) > 0 and (res["failed"] or 0) == 0

    def test_verify_rejects_non_product(self, tmp_path):
        res = bs.verify_product(str(tmp_path))
        assert res["ok"] is False
        assert "missing app/main.py" in res["error"]
