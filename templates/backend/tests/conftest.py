"""Backend test suite for agent-builder-skill templates.

Run:  cd templates/backend && python -m pytest tests -v
These tests exercise pure-logic modules (no external services / API keys).
"""

import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))
