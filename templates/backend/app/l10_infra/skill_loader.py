"""M12 - Skill System (Anthropic Agent Skills 规范)

技能 = 一个目录，包含 SKILL.md（唯一必需文件）+ references/、scripts/、templates/。
加载时只读 frontmatter（name+description）做渐进式披露，正文按需读取，不耗 token。

目录结构约定:
    skills/
      <skill-name>/
        SKILL.md          # YAML frontmatter (name/description) + 正文
        references/       # 参考文档（按需加载）
        scripts/          # 可执行脚本（不注入上下文）
        templates/        # 模板文件
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Skill:
    """A single skill loaded from disk"""

    name: str
    description: str
    path: Path
    frontmatter: dict = field(default_factory=dict)
    body: str = ""
    _body_loaded: bool = False

    def load_body(self) -> str:
        """Lazy-load the full SKILL.md body (progressive disclosure)"""
        if not self._body_loaded:
            md_path = self.path / "SKILL.md"
            if md_path.exists():
                _, self.body = parse_skill_md(md_path.read_text(encoding="utf-8"))
            self._body_loaded = True
        return self.body

    def to_manifest(self) -> dict:
        """Minimal manifest for agent context (does not include body)"""
        return {
            "name": self.name,
            "description": self.description,
            "has_references": (self.path / "references").is_dir(),
            "has_scripts": (self.path / "scripts").is_dir(),
        }


def parse_skill_md(content: str) -> tuple[dict, str]:
    """Parse SKILL.md into (frontmatter dict, body string)"""
    frontmatter: dict = {}
    body = content
    if content.startswith("---"):
        end = content.find("\n---", 3)
        if end != -1:
            raw = content[3:end].strip()
            body = content[end + 4 :].lstrip("\n")
            for line in raw.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    frontmatter[k.strip()] = v.strip()
    return frontmatter, body


class SkillRegistry:
    """Scans skill directories and loads manifests"""

    def __init__(self, roots: Optional[list[Path]] = None):
        self.roots = list(roots or [])
        self._skills: dict[str, Skill] = {}

    def add_root(self, path: str | Path) -> "SkillRegistry":
        self.roots.append(Path(path))
        return self

    def scan(self) -> list[Skill]:
        """Discover all skills under configured roots (manifest only)"""
        self._skills.clear()
        for root in self.roots:
            root = Path(root)
            if not root.is_dir():
                continue
            for skill_dir in sorted(root.iterdir()):
                if not skill_dir.is_dir():
                    continue
                md = skill_dir / "SKILL.md"
                if not md.exists():
                    continue
                frontmatter, body = parse_skill_md(md.read_text(encoding="utf-8"))
                name = frontmatter.get("name") or skill_dir.name
                self._skills[name] = Skill(
                    name=name,
                    description=frontmatter.get("description", ""),
                    path=skill_dir,
                    frontmatter=frontmatter,
                    body=body,
                )
        return list(self._skills.values())

    def get(self, name: str) -> Optional[Skill]:
        return self._skills.get(name)

    def list_manifests(self) -> list[dict]:
        return [s.to_manifest() for s in self._skills.values()]

    def load(self, name: str) -> Optional[str]:
        """Load full body of a skill (progressive disclosure)"""
        skill = self.get(name)
        return skill.load_body() if skill else None
