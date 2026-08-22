"""L10 - Sandbox management (deep-spec sandbox / M3.5)

A manageable code-execution sandbox for the generated agent. Environment
templates (base image + preinstalled packages + quota) are managed at runtime;
code runs in a restricted subprocess with a clamped timeout, an isolated
working directory and a minimal environment.

SECURITY NOTE — read before exposing this to any network:
The local runner is NOT a security boundary. It executes code with the same
OS user as the backend; the env allowlist cannot stop filesystem or network
access from the spawned process. Set SANDBOX_ENABLED=false (the default) for
anything beyond trusted local development, and use container-level isolation
(docker/gVisor) plus authentication in production.
"""

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from .config import settings

# Hard clamp regardless of what the request asks for.
MAX_TIMEOUT_S = 60

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
        self._workdir: Optional[str] = None
        self._default_id: Optional[str] = None
        # Default OFF: local code execution is not a security boundary (see
        # module docstring). Operators must opt in explicitly.
        self._enabled = bool(getattr(settings, "SANDBOX_ENABLED", False))
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
            return {"ok": False, "error": "sandbox disabled (SANDBOX_ENABLED=false); local execution is not a security boundary"}
        env = self.get_env(env_id or self._default_id)
        if not env.get("enabled", True):
            return {"ok": False, "error": f"environment {env['name']} is disabled"}

        # 高危命令检测（shell）
        if language in ("sh", "bash"):
            for pat in HIGH_DANGER:
                if pat in code:
                    return {"ok": False, "error": f"高危命令被拦截: {pat}（如需执行请在界面确认）"}

        # Clamp the caller-supplied timeout — never trust request bodies.
        try:
            t = int(timeout or env.get("quota", {}).get("timeout", 30))
        except (TypeError, ValueError):
            t = 30
        t = max(1, min(t, MAX_TIMEOUT_S))

        start = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(self._run_sync, language, code, t, env_id),
                timeout=t + 5,
            )
        except asyncio.TimeoutError:
            return {"ok": False, "error": f"执行超时（>{t}s）", "latency_ms": (time.perf_counter() - start) * 1000}
        result["latency_ms"] = (time.perf_counter() - start) * 1000
        result["environment"] = env["name"]
        return result

    def _resolve_runtime(self, env: dict) -> tuple[str, list[str], dict]:
        """Pick the execution runtime. Returns (runtime_name, cmd_prefix, extra).

        "docker" gives real container isolation (no network, tmpfs workdir,
        cpu/mem caps from the env quota). Falls back to "subprocess" when
        SANDBOX_RUNTIME=auto and the Docker daemon is unreachable.
        """
        runtime = (getattr(settings, "SANDBOX_RUNTIME", "auto") or "auto").lower()
        docker_ok = False
        if runtime in ("auto", "docker"):
            try:
                probe = subprocess.run(
                    ["docker", "info"], capture_output=True, timeout=10,
                )
                docker_ok = probe.returncode == 0
            except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
                docker_ok = False
        if runtime == "docker" and not docker_ok:
            raise SandboxError("SANDBOX_RUNTIME=docker but the Docker daemon is unreachable")
        if docker_ok and runtime != "subprocess":
            quota = env.get("quota", {}) or {}
            image = env.get("image") or ("python:3.11-slim" if env.get("language", "python").startswith("py") else "alpine")
            # A missing image would surface as an opaque daemon error; in
            # "auto" mode fall back to the subprocess runner instead.
            try:
                inspect = subprocess.run(
                    ["docker", "image", "inspect", image],
                    capture_output=True, timeout=15,
                )
                if inspect.returncode != 0 and runtime == "auto":
                    return "subprocess", [], {"fallback_reason": f"docker image {image!r} not pulled"}
            except (subprocess.TimeoutExpired, OSError):
                if runtime == "auto":
                    return "subprocess", [], {"fallback_reason": "docker probe failed"}
            prefix = [
                "docker", "run", "--rm",
                "--network=none",                      # no egress from sandbox
                "-v", f"{self._workdir}:/sandbox:rw",
                "-w", "/sandbox",
                "--memory", f"{int(quota.get('mem_mb', 512))}m",
                "--cpus", str(quota.get("cpu", 1)),
                "-e", "LANG=C.UTF-8",
            ]
            return "docker", prefix, {"image": image}
        return "subprocess", [], {}

    def _run_sync(self, language: str, code: str, timeout: int, env_id: Optional[str] = None) -> dict:
        cmds = {
            "python": [sys.executable, "-c", code],
            "python3": [sys.executable, "-c", code],
            "sh": ["/bin/sh", "-c", code],
            "bash": ["/bin/bash", "-c", code],
        }
        inner_cmd = cmds.get((language or "").lower())
        if inner_cmd is None:
            return {"ok": False, "error": f"不支持的语言 '{language}'"}

        # Isolated scratch cwd so the child cannot trivially read the
        # backend's .env / data files by relative path. Under Docker the
        # workdir is bind-mounted read-write into the container instead.
        self._workdir = tempfile.mkdtemp(prefix="agent_sandbox_")
        env = {
            "PATH": os.environ.get("PATH", "") if os.name == "nt" else "/usr/bin:/bin",
            "HOME": self._workdir,
            "LANG": "C.UTF-8",
            "TMPDIR": self._workdir,
        }
        try:
            runtime, prefix, extra = self._resolve_runtime(env or {})
            if runtime == "docker":
                cmd = prefix + [extra["image"]] + inner_cmd
                runtime_label = "docker"
            else:
                cmd = inner_cmd
                runtime_label = "subprocess"
            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout,
                cwd=self._workdir, env=env,
            )
            out = (proc.stdout or "")[-20000:]
            err = (proc.stderr or "")[-20000:]
            return {
                "ok": proc.returncode == 0,
                "returncode": proc.returncode,
                "stdout": out,
                "stderr": err,
                "output": out if proc.returncode == 0 else err,
                "runtime": runtime_label,
            }
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": f"执行超时（>{timeout}s）"}
        except SandboxError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": str(e)}
        finally:
            shutil.rmtree(self._workdir, ignore_errors=True)
            self._workdir = None


sandbox_manager = SandboxManager()
