# DEMO — Create your first Agent with Agent-Builder-Skill

This walkthrough proves the core promise of this skill: **an agent reads `SKILL.md`, follows it, and produces a complete, runnable agent — with no multi-round clarification.**

We go from a one-line requirement to a running agent in a few commands.

## 0. The requirement (one line)

> "I want a customer-service agent that answers from a knowledge base, can search the web, and escalates to a human."

That's all we need. Everything unspecified is filled by the **defaults table** in `SKILL.md`.

## 1. Write `agent.yaml` (use the field dictionary)

Choose the closest template, or write minimal config — unspecified fields default:

```yaml
agent:
  name: "MyAgent"
  type: "customer_service"
llm:
  provider: "openai"   # default; swap to deepseek/qwen if you prefer
  model: "gpt-4o"
prompt:
  system_prompt: "你是客服助手：优先查知识库回答，可联网补充，无法解决时升级人工。"
tools:
  enabled: [web_search, web_fetch, current_time, read_csv, analyze_data]
```

> Tip: `templates/agent-types/` has 6 ready templates (A–F). Copy the closest one and edit.

## 2. Generate the full project

```bash
python scripts/generate.py agent.yaml ./my_agent --framework=langgraph
# zero-dependency runtime? use --framework=bare
```

This emits a complete project: `my_agent/app/` (10-layer backend) + `my_agent/frontend/` (Chat + Admin + Workspace).

## 3. Run it

```bash
cd my_agent
cp .env.example .env            # paste your LLM API key
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000      # backend

cd frontend && npm install && npm run dev       # frontend (port 5173)
```

## 4. Verify it really works

- Backend: `curl localhost:8000/api/health` → `200`; `/api/tasks`, `/api/sandbox/envs`, `/api/workspaces`, `/api/skills` all reachable.
- Chat: open the UI → toggle 🌐 联网 / 🧠 深度思考 / 📚 知识库 / ⚙️ 沙箱 and send a message. The toggles genuinely change the answer (web results / RAG citations / plan-then-answer).
- Admin: manage prompts / models / tools / sandbox / memory / eval / monitoring.
- Tests: `pytest` in `my_agent` passes.

## What the skill did for you

| You did | The skill (pre-loaded defaults + specs) did |
|---|---|
| 1 line requirement | Filled framework, model, tools, memory, security, UI, sandbox |
| — | Built 10 layers (L1 LLM → L10 infra) with real code |
| — | Wired MCP/A2A, chat mode toggles, admin, workspace, sandbox |
| — | Enforced injection-defense + PII redaction by default |
| — | Provided acceptance checklist so you can verify before shipping |

## Doing it as an agent (the real use case)

An AI agent (Claude/Cursor/Copilot/etc.) that loads `SKILL.md` and this `DEMO.md` can perform steps 1–4 **autonomously**: read the requirement → apply defaults → write `agent.yaml` → run `generate.py` → boot → verify → deliver the agent's code. No back-and-forth.
