# Agent-Builder-Skill

> **A skill that creates AI agents.** A self-contained, pre-loaded prompt workflow: given a one-line requirement, it builds a **complete, production-grade AI agent** (backend + frontend + tests) — no multi-round clarification.

**中文** | [日本語](./README.ja.md) | [简体中文](./README.zh.md) · [Deep Docs](./docs/README.md) · [Feature Checklist](./docs/feature-checklist.md)

[![Release](https://img.shields.io/badge/release-v0.1.0-blue.svg)](https://github.com/weed33834/agent-builder-skill/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/weed33834/agent-builder-skill/ci.yml?branch=main&label=CI&logo=github)](https://github.com/weed33834/agent-builder-skill/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Deep Specs](https://img.shields.io/badge/deep--specs-37-green.svg)](docs/deep-spec/00-template.md)
[![Features](https://img.shields.io/badge/features-1465%2B-brightgreen.svg)](docs/feature-checklist.md)
[![Acceptance Tests](https://img.shields.io/badge/acceptance--tests-430-orange.svg)](docs/acceptance-test.md)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg)](templates/backend)
[![React](https://img.shields.io/badge/react-19-61dafb.svg)](templates/frontend)

---

## What this skill is

A **Skill** is not a documentation page — it is a **pre-loaded prompt workflow**. It bakes the entire process of *creating an agent* (the steps, the prompts, the defaults, the UI spec, the acceptance criteria) into one file, so an agent reads it and executes **correctly on the first try, with no back-and-forth**.

**Agent-Builder-Skill** is that workflow for **creating AI agents**. Its positioning is singular and clear: **build a complete, runnable agent from a requirement, by default.**

### What it builds

Given a one-line requirement, this skill produces a full agent with:

- 🏗️ **10-layer architecture** (L1 LLM → L10 infra), each layer with a clear contract
- 🔌 **Framework-agnostic runtime**: bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen behind one `AgentRuntime` interface
- 📡 **Open protocols**: MCP (tool execution) + A2A (agent-to-agent)
- ⚙️ **Config-driven generation**: `agent.yaml` → `generate.py` emits a full app
- 🖥️ **Complete UI**: Chat + Admin console + Workspace (tasks / canvas / skills / notifications / command palette / memory)
- 🔒 **Safety built-in**: prompt-injection defense + PII redaction enforced in the pipeline; sandboxed code execution
- 🧠 **Thinking layer**: optional planning + reflection nodes
- ✨ **Chat mode toggles that actually work**: 🌐 web search / 🧠 deep think / 📚 knowledge base / ⚙️ sandbox
- ✅ **Tested**: 46 pytest cases; all 11 agent templates generate & boot in both `bare` and `langgraph` frameworks

---

## Why "pre-loaded prompt workflow" matters

Creating an agent the old way = dozens of rounds of clarifying questions. With this skill:

1. **Defaults are pre-decided** (framework, model, tools, memory, security, layout…) — see the default table in `SKILL.md`.
2. **Every module is fully spec'd** — purpose / location / UI / operations / AI-generation / acceptance — no hollow shells.
3. **Deep engineering is spec'd** — context/token budget, tool-calling, memory tiers, planning, reflection, multi-agent, reliability, observability, eval, ops, performance.
4. **Rule: ask only when it matters, otherwise default.** If unspecified → default. If ambiguous → ask once with a recommendation.

---

## Quick start

```bash
# 1) describe your agent in agent.yaml (fields dictionary in SKILL.md)
# 2) generate
python scripts/generate.py agent.yaml ./my_agent --framework=langgraph   # or --framework=bare
# 3) run backend
cd my_agent && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# 4) run frontend
cd my_agent/frontend && npm install && npm run dev
```

> **Quickstart:** [`DEMO.md`](./DEMO.md)
> Deep docs, feature checklist, acceptance tests: see [`docs/`](./docs/README.md).
> Universal-agent capability map & market research: [`docs/universal-agent-capability-map.md`](./docs/universal-agent-capability-map.md).

---

## Repo layout

```
SKILL.md                 The skill itself: the full spec/workflow for building agents
scripts/generate.py      The agent generator (config → full project)
templates/               Backend + frontend templates the generator emits
docs/                    Deep specs, feature checklist, acceptance tests
```

---

## License

[Apache-2.0](./LICENSE)

**Languages:** English (this page) · [日本語](./README.ja.md) · [简体中文](./README.zh.md)
