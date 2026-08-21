#!/usr/bin/env python3
"""Matrix verification: generate + import + pytest every agent template.

For each templates/agent-types/*.yaml x framework this script:
  1. runs scripts/generate.py into a temp dir
  2. imports app.main (catches missing modules / syntax errors)
  3. runs the product's own shipped test suite (pytest)

Exit code 0 only when the whole matrix passes. This is the release gate
promised by the README ("11 模板 x 双框架均可生成并启动") - if this fails,
the claim is not true and must not be merged.

Usage:
    python scripts/verify_all.py                     # full matrix
    python scripts/verify_all.py --framework bare    # one framework
    python scripts/verify_all.py --only chat         # subset of templates
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENERATE = ROOT / "scripts" / "generate.py"
CONFIG_DIR = ROOT / "templates" / "agent-types"
FRAMEWORKS = ["bare", "langgraph"]


def _run(cmd: list[str], cwd: Path) -> tuple[int, str]:
    """Run a subprocess with UTF-8-safe IO; return (returncode, tail of output)."""
    env = os.environ.copy()
    # Guarantee UTF-8 IO regardless of host console codepage (Windows GBK).
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, out.strip().splitlines()[-5:] if out.strip() else []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--framework", choices=FRAMEWORKS, action="append",
                        help="restrict to one framework (repeatable)")
    parser.add_argument("--only", action="append",
                        help="restrict to one config name, e.g. chat (repeatable)")
    args = parser.parse_args()

    frameworks = args.framework or FRAMEWORKS
    configs = sorted(CONFIG_DIR.glob("*.yaml"))
    if args.only:
        wanted = set(args.only)
        configs = [c for c in configs if c.stem in wanted]

    failures: list[str] = []
    results: list[tuple[str, str]] = []

    with tempfile.TemporaryDirectory(prefix="abs_verify_") as tmp:
        for cfg in configs:
            for fw in frameworks:
                tag = f"{fw}/{cfg.stem}"
                out_dir = Path(tmp) / f"{fw}_{cfg.stem}"
                code, tail = _run(
                    [sys.executable, str(GENERATE), str(cfg), str(out_dir),
                     f"--framework={fw}"], ROOT)
                if code != 0:
                    failures.append(tag)
                    results.append((tag, "FAIL(generate)"))
                    print(f"[{tag}] GENERATE FAILED\n  " + "\n  ".join(tail))
                    continue

                code, tail = _run(
                    [sys.executable, "-c", "import app.main"], out_dir)
                if code != 0:
                    failures.append(tag)
                    results.append((tag, "FAIL(import)"))
                    print(f"[{tag}] IMPORT FAILED\n  " + "\n  ".join(tail))
                    continue

                code, tail = _run(
                    [sys.executable, "-m", "pytest", "tests", "-q"], out_dir)
                if code != 0:
                    failures.append(tag)
                    results.append((tag, "FAIL(pytest)"))
                    print(f"[{tag}] PYTEST FAILED\n  " + "\n  ".join(tail))
                    continue

                results.append((tag, "OK"))
                print(f"[{tag}] OK")

    print("\n=== Matrix summary ===")
    for tag, status in results:
        mark = "PASS" if status == "OK" else "FAIL"
        print(f"  [{mark}] {tag:<28} {status}")
    total = len(results)
    passed = sum(1 for _, s in results if s == "OK")
    print(f"\n{passed}/{total} matrix cells green")

    if failures:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
