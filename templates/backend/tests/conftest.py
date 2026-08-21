"""Backend test suite for agent-builder-skill templates.

Run:  cd templates/backend && python -m pytest tests -v
These tests exercise pure-logic modules (no external services / API keys).
"""

import sys
from pathlib import Path

# Add templates/backend/ (parent of app/) to sys.path so tests import
# `from app.lX_yyy import ...` — this keeps the package-relative imports
# used inside app/ (e.g. `from ..l10_infra.errors import ...`) valid.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
