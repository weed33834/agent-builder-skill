"""L3 - Few-shot Example Management

Loads, stores, and formats few-shot examples (M2.4).
Supports YAML/JSON example files and programmatic registration.
"""

import json
import os
from pathlib import Path
from typing import Optional, Union

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:  # pragma: no cover
    YAML_AVAILABLE = False


class FewShotManager:
    """Manages few-shot examples for prompt construction.

    Examples are stored as (input, output) or full message triplets.
    Supports loading from a directory of YAML/JSON files.
    """

    def __init__(self, examples_dir: Optional[str] = None):
        self._examples: list[dict] = []
        if examples_dir:
            self.load_dir(examples_dir)

    # ── Registration ───────────────────────────────────────────

    def add(self, input_text: str, output_text: str, metadata: Optional[dict] = None):
        """Add a single example (M2.4)"""
        self._examples.append({
            "input": input_text,
            "output": output_text,
            "metadata": metadata or {},
        })

    def add_messages(self, messages: list[dict]):
        """Add a full message-triplet example: [{"role": ..., "content": ...}, ...]"""
        self._examples.append({"messages": messages})

    def clear(self):
        self._examples = []

    def __len__(self) -> int:
        return len(self._examples)

    # ── File loading ───────────────────────────────────────────

    def load_dir(self, directory: str):
        """Load all .yaml/.yml/.json example files from a directory"""
        path = Path(directory)
        if not path.is_dir():
            return
        for f in sorted(path.iterdir()):
            if f.suffix in (".yaml", ".yml"):
                self._load_yaml(f)
            elif f.suffix == ".json":
                self._load_json(f)

    def _load_yaml(self, path: Path):
        if not YAML_AVAILABLE:
            return
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            self._ingest(data)
        except Exception:
            pass

    def _load_json(self, path: Path):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            self._ingest(data)
        except Exception:
            pass

    def _ingest(self, data: Union[list, dict]):
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    self._examples.append(item)
        elif isinstance(data, dict):
            examples = data.get("examples", [])
            for item in examples:
                if isinstance(item, dict):
                    self._examples.append(item)

    # ── Formatting (M2.4: inject into prompt) ─────────────────

    def format(
        self,
        max_examples: int = 3,
        template: str = "Example {i}:\nUser: {input}\nAssistant: {output}",
    ) -> str:
        """Format examples as a prompt block"""
        blocks = []
        for i, ex in enumerate(self._examples[:max_examples], start=1):
            if "messages" in ex:
                blocks.append(self._format_messages(ex["messages"]))
            else:
                blocks.append(template.format(i=i, **ex))
        return "\n\n".join(blocks)

    def _format_messages(self, messages: list[dict]) -> str:
        lines = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            lines.append(f"{role.capitalize()}: {content}")
        return "\n".join(lines)

    def to_messages(self, max_examples: int = 3) -> list[dict]:
        """Return examples as OpenAI-style message lists for direct injection"""
        result = []
        for ex in self._examples[:max_examples]:
            if "messages" in ex:
                result.extend(ex["messages"])
            else:
                result.append({"role": "user", "content": ex.get("input", "")})
                result.append({"role": "assistant", "content": ex.get("output", "")})
        return result
