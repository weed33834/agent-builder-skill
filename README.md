# Agent-Builder

> A production-grade AI agent scaffold, packaged as an [Agent Plugins 1.0.0](https://agent-plugins.org) plugin —
> with hard MCP gates so an AI can never claim success without evidence.

[简体中文](./README.zh.md) | [日本語](./README.ja.md) · Docs: [SKILL workflow](./skills/build-agent/SKILL.md) · [Roadmap](./docs/roadmap/)

## What it is

Give it one line of intent and an `agent.yaml`, and it generates a **complete, runnable
full-stack agent project**: FastAPI backend (10-layer architecture) + React frontend +
a shipped pytest suite. Three MCP tools enforce the pipeline:

| Gate | Tool | Guarantee |
|---|---|---|
| 1 | `validate_config` | bad config is rejected before generation |
| 2 | `build_agent` | generation runs, never clobbers a non-empty dir |
| 3 | `verify_product` | product imports AND its tests pass |

**The differentiator**: every template × framework combination is verified in CI by
[`scripts/verify_all.py`](scripts/verify_all.py) (generate → import → pytest).
You receive an engineering artifact born under a CI gate — not a demo.

## Quick start

### For humans (CLI)

```bash
python scripts/generate.py templates/agent-types/chat.yaml ./my_agent --framework=langgraph
cd my_agent && pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests -q        # the product ships with its own test suite
uvicorn app.main:app --reload --port 8000
```

### For AI clients (plugin)

Drop this repo into any Agent Plugins / MCP-capable client. The client discovers:

- `skills/build-agent/SKILL.md` — the ~130-line authoritative build workflow
- `mcp.json` — the three gate tools (`validate_config` / `build_agent` / `verify_product`)

The AI must pass every gate before reporting completion. Prompt-only skills can be
skipped; these tools cannot.

## Repository layout

```
plugin.json / mcp.json     Agent Plugins 1.0.0 manifest
server/builder_server.py   stdio MCP server (3 hard-gate tools)
skills/build-agent/        SKILL.md + references (defaults / field dictionary / API)
scripts/generate.py        config -> full project generator
scripts/verify_all.py      CI matrix gate: 12 configs x 2 frameworks
templates/                 backend + frontend reference templates
docs/roadmap/              architecture vision archive (NOT delivery criteria)
```

## License

Apache-2.0
