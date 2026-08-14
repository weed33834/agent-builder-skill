# Agent-Builder-Skill

> **一个精选"好用、特别"的 AI Skill 集合** —— 每个 Skill 都是**自包含、预装载的提示词工作流**，让智能体读一遍就能一次做对，不用多轮澄清。

[English](./README.md) | **简体中文** | [日本語](./README.ja.md) · [文档中心](./docs/README.md) · [功能清单](./docs/feature-checklist.md)

[![Release](https://img.shields.io/badge/release-v0.1.0-blue.svg)](https://github.com/weed33834/agent-builder-skill/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/weed33834/agent-builder-skill/ci.yml?branch=main&label=CI&logo=github)](https://github.com/weed33834/agent-builder-skill/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Deep Specs](https://img.shields.io/badge/deep--specs-37-green.svg)](docs/deep-spec/00-template.md)
[![Features](https://img.shields.io/badge/features-1465%2B-brightgreen.svg)](docs/feature-checklist.md)

---

## Agent-Builder-Skill 是什么？

**Skill 不是文档，而是一套预装载的提示词工作流**。它把"做某件事"的完整流程（步骤、提示词、默认值、界面规格、验收标准）固化进一个文件，智能体读一遍就能**一次做对、无需来回澄清**。

Agent-Builder-Skill 收集那些我们觉得**真正好用、比较特别**的 Skill，经过真实使用打磨沉淀。

### 旗舰 Skill：Universal Agent Builder（`agent-builder`）

本集合的锚点。给一句话需求，自动构建一个**完整、可运行、生产级**的 AI Agent（后端 + 前端 + 测试）：

- 🏗️ **10 层架构**（L1 LLM → L10 基建），每层契约清晰、可独立替换
- 🔌 **框架中立**：bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen，统一 `AgentRuntime` 接口
- 📡 **开放协议**：MCP（工具执行）+ A2A（智能体互操作）
- ⚙️ **配置驱动生成**：`agent.yaml` → `generate.py` 一键生成完整工程
- 🖥️ **完整前端**：对话 + 管理台 + 工作台（任务/画布/技能/通知/命令面板/记忆）
- 🔒 **安全内置**：提示词注入防御 + PII 脱敏强制入管线；沙箱化代码执行
- 🧠 **思考层**：可选规划 + 反思节点
- ✅ **有测试**：43 条 pytest；11 个 Agent 模板在 `bare` / `langgraph` 双框架下均可生成并启动

---

## 为什么"预装载工作流"重要

老做法造一个 Agent = 几十轮澄清提问。用了 Skill：

1. **默认值预置**（框架/模型/工具/记忆/安全/布局…）——见 `SKILL.md` 默认值表
2. **每个模块完整规格**——用途/位置/界面/操作/AI 生成/验收，杜绝空壳
3. **深度工程已规格化**——上下文/Token、工具调用、记忆分层、规划、反思、多智能体、可靠性、可观测性、评估、运维、性能
4. **规则：有问题才问，否则按默认**——未指定→默认；真歧义→问一次带推荐

---

## 定位

本 Skill 的定位是**创建一个智能体**：给一句话需求，按默认值直接产出完整、可运行、生产级的 AI Agent（后端 + 前端 + 测试），无需多轮澄清。

## 快速开始（agent-builder）

```bash
# 1) 在 agent.yaml 描述你的 Agent（字段字典见 SKILL.md）
# 2) 生成
python scripts/generate.py agent.yaml ./my_agent --framework=langgraph   # 或 --framework=bare
# 3) 起后端
cd my_agent && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
# 4) 起前端
cd my_agent/frontend && npm install && npm run dev
```

> **快速开始：** [`DEMO.md`](./DEMO.md)
> 深度文档、功能清单、验收测试：见 [`docs/`](./docs/README.md)。

---

## 仓库结构

```
SKILL.md                 旗舰 Skill：Universal Agent Builder（完整规格/工作流）
scripts/generate.py      Agent 生成器（配置 → 完整工程）
templates/               生成器产出的后端 + 前端模板
docs/                    深度规格、功能清单、验收测试
docs/universal-agent-capability-map.md   市场调研：通用智能体能力全景
```

---

## License

[Apache-2.0](./LICENSE)

**语言：** English（[English](./README.md)）· 简体中文 · 日本語（[日本語](./README.ja.md)）
