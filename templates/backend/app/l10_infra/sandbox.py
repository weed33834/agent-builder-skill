"""L10 - Sandbox management (deep-spec sandbox / M3.5)

A manageable, isolated, default-env code-execution sandbox for the generated
agent. Environment templates (base image + preinstalled packages + quota) are
managed at runtime; code runs in a restricted subprocess with timeout and a
minimal environment. Local vs cloud types are tracked; "default" is used by
chat-mode code execution.

In-memory store (template); swap for docker/remote sandbox in production.
"""

import asyncio
import os
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

# ── 预置基础环境模板（base environments）────────────────────────
ENV_TEMPLATES: list[dict] = [
    {"id": "python", "name": "Python 3", "language": "python",
     "packages": ["numpy", "pandas", "requests", "pytest"], "image": "python:3.11-slim",
     "quota": {"cpu": 1, "mem_mb": 512, "timeout": 30}, "type": "local"},
    {"id": "node", "name": "Node 20", "language": "node",
     "packages": [], "image": "node:20-alpine",
     "quota": {"cpu": 1, "mem_mb": 512, "timeout": 30}, "type": "local"},
    {"id": "sh", "name": "Shell", "language": "sh",
     "packages": [], "image": "alpine",
     "quota": {"cpu": 1, "mem_mb": 256, "timeout": 20}, "type": "local"},
    {"id": "data-science", "name": "Data Science", "language": "python",
     "packages": ["numpy", "pandas", "matplotlib", "scipy", "scikit-learn"], "image": "python:3.11-slim",
     "quota": {"cpu": 2, "mem_mb": 1024, "timeout": 60}, "type": "cloud"},
    {"id": "chrome", "name": "Browser Automation", "language": "python",
     "packages": ["playwright"], "image": "mcr.microsoft.com/playwright:latest",
     "quota": {"cpu": 2, "mem_mb": 2048, "timeout": 60}, "type": "cloud"},
]

# 高危命令：命中需强制确认（不在本模块执行，仅标记）
HIGH_DANGER = ["rm -rf /", "mkfs", "format c:", "> /dev/sda", "dd if="]


class SandboxError(Exception):
    pass


class SandboxManager:
    """Manages sandbox environments (CRUD / enable / default) and runs code."""

    def __init__(self):
        self._envs: dict[str, dict] = {}
        self._default_id: Optional[str] = None
        self._enabled = True
        for t in ENV_TEMPLATES:
            env = dict(t)
            env["created_at"] = time.time()
            env["enabled"] = True
            self._envs[t["id"]] = env
        self._default_id = "python"

    # ── management ─────────────────────────────────────────────
    def list_envs(self) -> list[dict]:
        return list(self._envs.values())

    def get_env(self, env_id: str) -> dict:
        env = self._envs.get(env_id)
        if not env:
            raise SandboxError(f"environment {env_id} not found")
        return env

    def create_env(self, data: dict) -> dict:
        env_id = data.get("id") or uuid.uuid4().hex[:10]
        env = {
            "id": env_id,
            "name": data.get("name", env_id),
            "language": data.get("language", "python"),
            "packages": data.get("packages", []),
            "image": data.get("image", ""),
            "quota": data.get("quota", {"timeout": 30}),
            "type": data.get("type", "local"),
            "enabled": True,
            "created_at": time.time(),
        }
        self._envs[env_id] = env
        return env

    def update_env(self, env_id: str, data: dict) -> dict:
        env = self.get_env(env_id)
        for k in ("name", "language", "packages", "image", "quota", "type"):
            if k in data:
                env[k] = data[k]
        return env

    def delete_env(self, env_id: str) -> bool:
        if env_id not in self._envs:
            raise SandboxError(f"environment {env_id} not found")
        if self._default_id == env_id:
            raise SandboxError("cannot delete the default environment")
        del self._envs[env_id]
        return True

    def set_enabled(self, env_id: str, enabled: bool) -> dict:
        env = self.get_env(env_id)
        env["enabled"] = enabled
        return env

    def set_default(self, env_id: str) -> dict:
        env = self.get_env(env_id)
        self._default_id = env_id
        return env

    @property
    def default_id(self) -> Optional[str]:
        return self._default_id

    @property
    def enabled(self) -> bool:
        return self._enabled

    def set_global_enabled(self, enabled: bool) -> None:
        self._enabled = enabled

    # ── execution ──────────────────────────────────────────────
    async def run(self, env_id: Optional[str], language: str, code: str, timeout: Optional[int] = None) -> dict:
        if not self._enabled:
            return {"ok": False, "error": "sandbox globally disabled"}
        env = self.get_env(env_id or self._default_id)
        if not env.get("enabled", True):
            return {"ok": False, "error": f"environment {env['name']} is disabled"}

        # 高危命令检测（shell）
        if language in ("sh", "bash"):
            for pat in HIGH_DANGER:
                if pat in code:
                    return {"ok": False, "error": f"高危命令被拦截: {pat}（如需执行请在界面确认）"}

        t = timeout or env.get("quota", {}).get("timeout", 30)
        start = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._run_sync, language, code, t),
                timeout=t + 5,
            )
        except asyncio.TimeoutError:
            return {"ok": False, "error": f"执行超时（>{t}s）", "latency_ms": (time.perf_counter() - start) * 1000}
        result["latency_ms"] = (time.perf_counter() - start) * 1000
        result["environment"] = env["name"]
        return result

    def _run_sync(self, language: str, code: str, timeout: int) -> dict:
        cmds = {
            "python": [sys.executable, "-c", code],
            "python3": [sys.executable, "-c", code],
            "sh": ["/bin/sh", "-c", code],
            "bash": ["/bin/bash", "-c", code],
        }
        cmd = cmds.get((language or "").lower())
        if cmd is None:
            return {"ok": False, "error": f"不支持的语言 '{language}'"}
        try:
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout,
                env={"PATH": "/usr/bin:/bin", "HOME": "/tmp", "LANG": "C.UTF-8"},
            )
            out = (proc.stdout or "")[-20000:]
            err = (proc.stderr or "")[-20000:]
            return {
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "stdout": out,
                "stderr": err,
                "output": out if proc.returncode == 0 else err,
            }
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": f"执行超时（>{timeout}s）"}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)}


sandbox_manager = SandboxManager()
