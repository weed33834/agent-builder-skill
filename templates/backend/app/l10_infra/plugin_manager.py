"""M12 - Plugin System (插件系统)

插件 = 可动态加载的扩展包，提供工具/钩子/路由等扩展点。
对齐生产规范：显式注册、生命周期钩子、沙箱隔离提示、热加载。
"""

from __future__ import annotations

import importlib
import importlib.util
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class Plugin:
    """A loaded plugin with its extension points"""

    name: str
    version: str
    module: Any
    tools: dict[str, Callable] = field(default_factory=dict)
    hooks: dict[str, Callable] = field(default_factory=dict)
    routes: list = field(default_factory=list)
    enabled: bool = True

    def info(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "tools": list(self.tools.keys()),
            "hooks": list(self.hooks.keys()),
            "enabled": self.enabled,
        }


class PluginManager:
    """Discovers and loads plugins from a plugins/ directory.

    Each plugin is a Python file (or package) exposing:
        PLUGIN_NAME, PLUGIN_VERSION,
        register(plugin: Plugin) -> None   # required entry point
    """

    def __init__(self, plugin_dirs: Optional[list[str | Path]] = None):
        self.plugin_dirs = [Path(p) for p in (plugin_dirs or ["plugins"])]
        self.plugins: dict[str, Plugin] = {}

    def discover(self) -> list[str]:
        """Find candidate plugin modules (files ending in _plugin.py or plugin.py)"""
        candidates: list[str] = []
        for d in self.plugin_dirs:
            if not d.is_dir():
                continue
            for f in sorted(d.glob("*.py")):
                if f.name.startswith("_"):
                    continue
                candidates.append(str(f))
        return candidates

    def load_all(self) -> list[Plugin]:
        for path in self.discover():
            try:
                self._load_file(path)
            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to load plugin %s: %s", path, exc)
        return list(self.plugins.values())

    def _load_file(self, path: str) -> None:
        module_path = Path(path)
        module_name = f"agent_plugin_{module_path.stem}"
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load plugin from {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        name = getattr(module, "PLUGIN_NAME", module_path.stem)
        version = getattr(module, "PLUGIN_VERSION", "0.1.0")
        plugin = Plugin(name=name, version=version, module=module)

        register = getattr(module, "register", None)
        if callable(register):
            register(plugin)
        else:
            logger.warning("Plugin %s has no register(plugin) entry point", name)

        self.plugins[name] = plugin
        logger.info("Loaded plugin %s v%s (%d tools)", name, version, len(plugin.tools))

    def get(self, name: str) -> Optional[Plugin]:
        return self.plugins.get(name)

    def list_info(self) -> list[dict]:
        return [p.info() for p in self.plugins.values()]

    def unload(self, name: str) -> bool:
        if name in self.plugins:
            del self.plugins[name]
            return True
        return False


def register_tool(plugin: Plugin, name: str, fn: Callable) -> None:
    """Helper: plugin.register() can call this to add a tool"""
    plugin.tools[name] = fn


def register_hook(plugin: Plugin, event: str, fn: Callable) -> None:
    """Helper: plugin.register() can call this to add a lifecycle hook"""
    plugin.hooks[event] = fn
