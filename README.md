# SkillHub

> **A curated hub of practical, ready-to-use AI Skills** — each skill is a self-contained, pre-loaded prompt workflow that lets an AI agent do a job well without multi-round clarification.

**中文** | [日本語](./README.ja.md) | [简体中文](./README.zh.md) · [Deep Docs](./docs/README.md) · [Feature Checklist](./docs/feature-checklist.md)

[![Release](https://img.shields.io/badge/release-v0.1.0-blue.svg)](https://github.com/weed33834/skillhub/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/weed33834/skillhub/ci.yml?branch=main&label=CI&logo=github)](https://github.com/weed33834/skillhub/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Deep Specs](https://img.shields.io/badge/deep--specs-37-green.svg)](docs/deep-spec/00-template.md)
[![Features](https://img.shields.io/badge/features-1465%2B-brightgreen.svg)](docs/feature-checklist.md)
[![Acceptance Tests](https://img.shields.io/badge/acceptance--tests-430-orange.svg)](docs/acceptance-test.md)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg)](templates/backend)
[![React](https://img.shields.io/badge/react-19-61dafb.svg)](templates/frontend)

---

## What is SkillHub?

A **Skill** is not a documentation page — it is a **pre-loaded prompt workflow**. It bakes the entire process of doing a job (the steps, the prompts, the defaults, the UI spec, the acceptance criteria) into one file, so an agent reads it and executes **correctly on the first try, with no back-and-forth**.

SkillHub collects the skills we find genuinely **useful and special**, curated and hardened through real use.

### Flagship skill: **Universal Agent Builder** (`agent-builder`)

The anchor skill of this hub. Given a **one-line requirement**, it builds a **complete, production-grade AI Agent** (backend + frontend + tests) automatically:

- 🏗️ **10-layer architecture** (L1 LLM → L10 infra) with a clear per-layer contract
- 🔌 **Framework-agnostic runtime**: bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen adapters behind one `AgentRuntime` interface
- 📡 **Open protocols**: MCP (tool execution) + A2A (agent-to-agent)
- ⚙️ **Config-driven generation**: `agent.yaml` → `generate.py` emits a full app
- 🖥️ **Full UI**: Chat + Admin console + Workspace (tasks / canvas / skills / notifications / command palette / memory)
- 🔒 **Safety built-in**: prompt-injection defense + PII redaction enforced in the pipeline; sandboxed code execution
- 🧠 **Thinking layer**: optional planning + reflection nodes
- ✅ **Tested**: 43 pytest cases, all 11 agent templates generate & boot in both `bare` and `langgraph` frameworks

---

## Why "pre-loaded prompt workflow" matters

Building an agent the old way = dozens of rounds of clarifying questions. With a Skill:

1. **Defaults are pre-decided** (framework, model, tools, memory, security, layout…) — see the default table in `SKILL.md`.
2. **Every module is fully spec'd** — purpose / location / UI / operations / AI-generation / acceptance — no hollow shells.
3. **Deep engineering is spec'd** — context/token budget, tool-calling, memory tiers, planning, reflection, multi-agent, reliability, observability, eval, ops, performance.
4. **Rule: ask only when it matters, otherwise default.** If unspecified → default. If ambiguous → ask once with a recommendation.

---

## Skill Index

| Skill | Status | What it does |
|---|---|---|
| `agent-builder` (Universal Agent Builder) | ✅ Flagship | Builds a complete production AI agent from a one-line requirement |
| *(add yours here)* | 🆕 | See [How to add a skill](#how-to-add-a-skill) |

### How to add a skill

1. Create `skills/<your-skill>/SKILL.md` (or a top-level `SKILL_<name>.md`) following the same depth template: **Purpose / Location / Invocation / UI spec / Operations / AI-generation / Acceptance**.
2. Fill the frontmatter (`name`, English `description` for indexability).
3. Register it in [SKILLS.md](./SKILLS.md) and add a row in the table above.
4. Give it a smoke test: one-line prompt → expected output.

---

## Quick start (agent-builder skill)

```bash
# 1) describe your agent in agent.yaml (fields dictionary in SKILL.md)
# 2) generate
python scripts/generate.py agent.yaml ./my_agent --framework=langgraph   # or --framework=bare
# 3) run backend
cd my_agent && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# 4) run frontend
cd my_agent/frontend && npm install && npm run dev
```

> Deep docs, feature checklist, acceptance tests: see [`docs/`](./docs/README.md).

---

## Repo layout

```
SKILL.md                 Flagship skill: Universal Agent Builder (the full spec/workflow)
SKILLS.md                Registry of all skills in this hub
scripts/generate.py      The agent generator (config → full project)
templates/               Backend + frontend templates the generator emits
docs/                    Deep specs, feature checklist, acceptance tests
docs/universal-agent-capability-map.md   Market research: universal-agent capability map
```

---

## License

[Apache-2.0](./LICENSE)

**Languages:** English (this page) · [日本語](./README.ja.md) · [简体中文](./README.zh.md)
