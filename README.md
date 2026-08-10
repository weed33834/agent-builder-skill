# Universal Agent Builder 万能 Agent 构建器

> **一个 10 层架构、规格驱动的全能 Agent 开发框架** —— 内置 6 大 Agent 框架适配器、MCP/A2A 开放协议、11 类 Agent 模板与一键生成器，配套 **37 份深度规格、1465+ 功能项、430 条验收测试**，从 LLM 到前端 UI 全链路开箱即用。

[![CI](https://img.shields.io/github/actions/workflow/status/weed33834/agent-builder-skill/ci.yml?branch=main&label=CI&logo=github)](https://github.com/weed33834/agent-builder-skill/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Deep Specs](https://img.shields.io/badge/deep--specs-32-green.svg)](docs/deep-spec/00-template.md)
[![Features](https://img.shields.io/badge/features-1290%2B-brightgreen.svg)](docs/feature-checklist.md)
[![Acceptance Tests](https://img.shields.io/badge/acceptance--tests-360-orange.svg)](docs/acceptance-test.md)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg)](templates/backend)
[![React](https://img.shields.io/badge/react-18-61dafb.svg)](templates/frontend)

**中文** | [English](#english) | [文档中心 docs](docs/README.md) | [深度规格 deep-spec](docs/deep-spec/00-template.md)

---

## 为什么是它？

大多数 Agent 项目是「空壳」——界面有按钮、后端有路由、文档一行描述，但功能没有真正嵌入运行时链路。**Universal Agent Builder 以「规格驱动」为第一原则**：每个模块都有 7 章深度规格（定位架构 / 资产模型 / 配置清单 / 管理界面 / 运行时嵌入链路 / 安全权限 / 验证方法），每项功能落到**具体组件、接口、函数**，并配套可逐条执行的验收测试。界面、后端、文档、验收四位一体，拒绝空壳。

- 🏗️ **10 层架构**：L1 LLM → L10 基础设施，每一层职责清晰、可独立替换
- 🔌 **6 大框架适配器**：bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen，框架中立运行时（AgentRuntime）+ 统一注册表，一套应用随意切换框架
- 📡 **开放协议**：MCP（微观工具执行）+ A2A（宏观 Agent 协作）双协议，Agent Card / Task / Message / Artifact 四大对象，符合 GB/Z 185-2026《智能体互联互通》
- ⚙️ **配置驱动生成**：11 类 `agent.yaml` 模板，`generate.py` 一键生成完整前后端工程
- 🖥️ **完整管理台**：提示词 / 沙箱 / 上下文 / 工具 / 记忆 / 模型 / 工作流 / 技能插件 / 评估 / 监控 / IAM / 生命周期……40+ 管理 API 端点 + 12 个 React 管理组件
- 📚 **37 份深度规格**：从提示词工程、上下文工程到企业级治理、AI 安全攻防、容灾连续性、RAG 检索、多端同步、实时协作、弱网韧性、推送触达，覆盖个人开发者到企业平台全场景

---

## Architecture Overview / 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  L10  Infrastructure Layer (基础设施层)                   │
│  Docker / Env config / Monitoring / Logs / CI/CD / 容灾备份 │
├──────────────────────────────────────────────────────────┤
│  L9   Frontend UI Layer (前端展示层)                      │
│  React 19 / Chat / 管理台 12 组件 / 流式渲染 / 响应式     │
├──────────────────────────────────────────────────────────┤
│  L8   API Service Layer (API 服务层)                      │
│  FastAPI 40+ 端点 / SSE 流式 / Auth & RBAC / 限流 / 中间件 │
├──────────────────────────────────────────────────────────┤
│  L7   Orchestration Layer (编排调度层)                    │
│  多 Agent 协作 / 任务分解 / 工作流 / 条件路由 / A2A 互操作 │
├──────────────────────────────────────────────────────────┤
│  L6   Memory & Knowledge Layer (记忆与知识层)             │
│  会话缓冲 / 向量存储 / RAG 检索 / 知识库 / 长期记忆       │
├──────────────────────────────────────────────────────────┤
│  L5   Tool Execution Layer (工具执行层)                   │
│  工具注册表 / MCP 客户端+服务端 / 执行引擎 / 错误恢复     │
├──────────────────────────────────────────────────────────┤
│  L4   Agent Framework Layer (Agent 框架层)                │
│  AgentRuntime 契约 / 6 框架适配器 / 状态 / Checkpoint     │
├──────────────────────────────────────────────────────────┤
│  L3   Prompt Engineering Layer (提示工程层)               │
│  系统提示词 / 角色模板 / Few-shot / 输出解析 / 注入防护   │
├──────────────────────────────────────────────────────────┤
│  L2   Model Interface Layer (模型接口层)                  │
│  统一抽象 / 8 家模型适配器 / 重试 / 降级 / 流式          │
├──────────────────────────────────────────────────────────┤
│  L1   LLM Foundation Layer (大模型层)                     │
│  OpenAI / Anthropic / DeepSeek / Qwen / Kimi / GLM / Gemini / Ollama │
└──────────────────────────────────────────────────────────┘
```

## Features / 特性

### 核心能力

| 能力 | 说明 |
|------|------|
| **10 层架构** | L1→L10 分层清晰，每层可独立替换、可独立测试 |
| **框架中立 AgentRuntime** | 统一契约 + 注册表，6 框架适配器（bare/langgraph/openai-agents/claude-sdk/adk/autogen）一键切换 |
| **多模型支持** | OpenAI / Anthropic / DeepSeek / Qwen / Kimi / GLM / Gemini / Ollama 8 家适配器，统一接口 |
| **MCP 双端** | 既是 MCP 客户端（接入外部工具），也是 MCP 服务端（向外部暴露本平台工具） |
| **A2A 互操作** | Agent Card 发布 / Task 委托 / 消息流转 / Artifact 回传，跨平台 Agent 协作 |
| **SSE 流式输出** | LLM 输出与工具调用状态实时推送，前端逐 token 渲染 |
| **多 Agent 编排** | 任务分解、路由、聚合、监督者（Supervisor）模式 |
| **配置驱动生成** | `agent.yaml` → `generate.py` → 完整前后端工程，11 类模板 |
| **管理台** | 提示词编辑器 / 工具注册表 / 记忆管理 / 模型配置 / 监控面板 / 工作流编排 / 评估看板……40+ API、12 组件 |
| **Docker 一键部署** | 前后端容器化，`docker-compose up -d` 即起 |

### 规格体系（规格驱动 · 拒绝空壳）

| 资产 | 数量 | 说明 |
|------|------|------|
| 顶层规格 full-spec | P0-P10 全量 | 页面级全量规格 |
| 深度规格 deep-spec | **37 份**（00 模板 + 01-36） | 每份 7 章：定位/资产模型/配置清单/管理界面/运行时链路/安全权限/验证方法 |
| 功能清单 feature-checklist | **1465+ 项**（M0-M34 模块） | 每项标注深度规格挂载 + 验收引用 |
| 验收测试 acceptance-test | **430 条** | 步骤 + 预期结果，可逐条执行 |
| 对比基准 comparison-2026 | 4 应用矩阵 | 豆包/GPT 网页端/Codex/Claude Code/WorkBuddy 能力对照 |
| 教训沉淀 ai-lessons | 14 域 ≈144 项 | 现象 + 根因 + 避免方法 + 检测方法 |

📖 **完整文档索引见 [docs/README.md](docs/README.md)** —— 37 份深度规格 + 6 份顶层文档总览。

## Quick Start / 快速开始

### 方式一：模板一键生成

```bash
# 1. 生成 Agent（11 类模板任选：chat/research/coding/customer_service/data_analysis/...）
python scripts/generate.py templates/agent-types/research.yaml ./my_agent

# 2. 进入生成目录
cd my_agent

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 LLM API Key

# 4. 启动后端
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 5. 启动前端
cd frontend && npm install && npm run dev
```

### 方式二：Docker 一键启动

```bash
cp .env.example .env          # 编辑 .env 填入 LLM API Key
docker-compose up -d          # 启动前后端
# 前端: http://localhost:5173
# API 文档: http://localhost:8000/docs
```

### 方式三：手动启动模板工程

```bash
# 后端
cd templates/backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# 前端
cd templates/frontend && npm install && npm run dev
```

### 方式四：使用 Skill（构建 Agent 的五步法）

```bash
# SKILL.md 提供完整的方法论：从需求分析 → 框架选型 → 规格设计 → 生成工程 → 验收测试
# 详见 SKILL.md
```

## Agent 模板一览 / Agent Templates

| 模板 | 类型 | 适用场景 | 复杂度 |
|------|------|----------|--------|
| `chat.yaml` | 聊天助手 | 通用对话、简单问答 | 低 |
| `research.yaml` | 研究助手 | 搜索、总结、信息分析 | 中 |
| `coding.yaml` | 编码助手 | 写代码、评审、调试 | 中 |
| `customer_service.yaml` | 客服系统 | 多 Agent 协同客服 | 高 |
| `data_analysis.yaml` | 数据分析 | 数据上传、分析、可视化 | 高 |
| `planner.yaml` | 规划助手 | 任务规划、执行计划 | 中 |
| `writer.yaml` | 写作助手 | 内容创作、文案生成 | 中 |
| `translator.yaml` | 翻译助手 | 多语言翻译 | 低 |
| `data_reporter.yaml` | 数据报表 | 报表生成、定时汇报 | 中 |
| `code_reviewer.yaml` | 代码评审 | PR 评审、代码质量 | 中 |
| `security_auditor.yaml` | 安全审计 | 代码安全扫描、合规检查 | 高 |

## Project Structure / 项目结构

```
agent-builder-skill/
├── README.md                       # 项目总览（本文件）
├── SKILL.md                        # Skill 方法论（五步法完整指导）
├── LICENSE                         # Apache 2.0
├── SECURITY.md                     # 安全策略
├── CONTRIBUTING.md                 # 贡献指南
├── CODE_OF_CONDUCT.md              # 行为准则
├── CHANGELOG.md                    # 变更日志
├── docker-compose.yml              # Docker 部署
├── .env.example                    # 环境变量模板
├── .github/
│   ├── workflows/ci.yml            # 后端+前端+生成器 CI
│   ├── ISSUE_TEMPLATE/             # Bug/Feature 模板
│   └── PULL_REQUEST_TEMPLATE.md    # PR 模板
├── docs/                           # 📖 文档中心（详见 docs/README.md）
│   ├── README.md                   # 文档索引（37 份深度规格总览）
│   ├── full-spec.md                # P0-P10 页面级全量规格
│   ├── feature-checklist.md        # M0-M34 功能清单（1465+ 项）
│   ├── acceptance-test.md          # 430 条验收测试
│   ├── comparison-2026.md          # 四应用能力对比矩阵
│   ├── framework-selection.md      # 六框架选型指南
│   ├── admin-console-design.md     # 管理台设计
│   ├── analysis-report.md          # 代码分析报告
│   └── deep-spec/                  # 37 份深度规格（00 模板 + 01-36）
├── scripts/
│   ├── generate.py                 # Agent 代码生成器
│   ├── evaluate.py                 # 评估脚本
│   └── report_template.py          # 报告模板
├── eval/
│   └── sample_tasks.json           # 评估样例任务
└── templates/
    ├── agent-types/                # 11 类 Agent YAML 模板
    ├── backend/                    # 后端模板（L1-L10 十层）
    │   ├── app/
    │   │   ├── l1_llm/             # 8 家模型适配器
    │   │   ├── l2_interface/       # 接口层（流式/重试/token）
    │   │   ├── l3_prompt/          # 提示工程层
    │   │   ├── l4_agent/           # AgentRuntime + 6 框架适配器
    │   │   ├── l5_tools/           # 工具层（MCP 客户端/服务端）
    │   │   ├── l6_memory/          # 记忆与知识层
    │   │   ├── l7_orchestrator/    # 编排层（A2A 双端）
    │   │   ├── l8_api/             # API 层（40+ 端点/中间件）
    │   │   └── l10_infra/          # 基础设施层
    │   └── tests/                  # 后端测试
    └── frontend/                   # 前端模板（React 19 + TS）
        └── src/
            ├── l8_api/             # API 客户端（SSE）
            └── l9_ui/              # chat/ + admin/(12 组件) + layout/ + shared/
```

## Environment Variables / 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| LLM_PROVIDER | 模型提供商 | openai |
| LLM_MODEL | 模型名 | gpt-4o |
| LLM_API_KEY | API Key | - |
| LLM_API_BASE | 自定义 API 端点 | - |
| LLM_TEMPERATURE | 温度参数 | 0.7 |
| LLM_MAX_TOKENS | 最大 token 数 | 4096 |
| LLM_RETRY_COUNT | 重试次数 | 3 |
| MODEL_FALLBACK_ENABLED | 模型降级开关 | false |
| MAX_TOOL_CALLS | 最大工具调用次数 | 10 |
| TOOL_TIMEOUT | 工具超时（秒） | 30 |
| MEMORY_TYPE | 记忆类型 | buffer |
| MEMORY_MAX_MESSAGES | 最大消息数 | 50 |
| API_KEY | API 认证密钥 | - |
| RATE_LIMIT | 限流（次/分钟） | 60 |
| LOG_LEVEL | 日志级别 | INFO |

> 完整变量说明见 [.env.example](.env.example) 与 20-foundation-capabilities 深度规格。

## Tech Stack / 技术栈

- **后端**：Python 3.11+/3.12、FastAPI、Pydantic v2、pytest
- **Agent 框架**：LangGraph / OpenAI Agents SDK / Claude SDK / ADK / AutoGen（+ bare 原生）
- **前端**：React 19、TypeScript 5、Vite
- **部署**：Docker、Docker Compose、GitHub Actions CI
- **LLM**：OpenAI、Anthropic、DeepSeek、Qwen、Kimi、GLM、Gemini、Ollama
- **协议**：MCP（模型上下文协议）、A2A（Agent 间协议，GB/Z 185-2026）

## Documentation / 文档

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 📖 文档中心（37 份深度规格总览索引） |
| [SKILL.md](SKILL.md) | 构建 Agent 的五步方法论 |
| [docs/full-spec.md](docs/full-spec.md) | P0-P10 页面级全量规格 |
| [docs/feature-checklist.md](docs/feature-checklist.md) | M0-M34 功能清单（1465+ 项） |
| [docs/acceptance-test.md](docs/acceptance-test.md) | 430 条验收测试 |
| [docs/framework-selection.md](docs/framework-selection.md) | 六框架选型指南 |
| [docs/deep-spec/00-template.md](docs/deep-spec/00-template.md) | 深度规格模板与索引 |

## Contributing / 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发流程、代码规范与提交流程。所有参与者须遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

**贡献方向建议**：① 补齐 Q 矩阵（未实现）的前后端缺口组件 ② 框架适配器真实 SDK 测试 ③ generate.py 各框架模板完善 ④ 按 acceptance-test 修复真实缺口。

## Security / 安全

发现安全漏洞请**不要**公开提 Issue，按 [SECURITY.md](SECURITY.md) 的流程私密上报（GitHub 私有漏洞报告 / 邮件）。

## License / 许可证

[Apache License 2.0](LICENSE) © badhope

---

## English

# Universal Agent Builder

> **A spec-driven, 10-layer agent development framework** — 6 agent framework adapters, MCP/A2A open protocols, 11 agent templates with a one-click generator, backed by **32 deep specs, 1290+ feature items and 360 acceptance tests**. Everything from LLM to frontend UI, out of the box.

### Highlights

- **10-layer architecture**: L1 (LLM) → L10 (infrastructure), each layer swappable and testable in isolation
- **Framework-neutral AgentRuntime**: unified contract + registry; adapters for bare, LangGraph, OpenAI Agents SDK, Claude SDK, Google ADK, AutoGen
- **Multi-model**: OpenAI, Anthropic, DeepSeek, Qwen, Kimi, GLM, Gemini, Ollama
- **MCP both-ways**: consume external tools as MCP client, expose platform tools as MCP server
- **A2A interoperability**: Agent Card / Task / Message / Artifact, cross-platform agent collaboration (GB/Z 185-2026)
- **Spec-driven, no empty shells**: every module has a 7-chapter deep spec mapping to concrete components, APIs and functions, verified by executable acceptance tests
- **Config-driven generation**: `agent.yaml` → `generate.py` → full-stack project, 11 templates
- **Admin console**: prompt editor, tool registry, memory manager, model config, monitoring, workflow orchestration, evaluation dashboard — 40+ APIs, 12 React components
- **One-command deploy**: `docker-compose up -d`

### Quick Start

```bash
# Generate from a template
python scripts/generate.py templates/agent-types/research.yaml ./my_agent
cd my_agent
cp .env.example .env            # fill in LLM_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

Or with Docker: `cp .env.example .env && docker-compose up -d` → frontend at http://localhost:5173, API docs at http://localhost:8000/docs.

### Documentation

See [docs/README.md](docs/README.md) for the full documentation index — 37 deep specs (00 template + 01-36), full spec (P0-P10), feature checklist (M0-M34, 1465+ items) and acceptance tests (430 cases).

### License

Apache License 2.0 © badhope

---

## 实现补全记录（2026-08-11，四轮）

> 在既有完整规格（full-spec / deep-spec 01-31 / feature-checklist 1290+ 项）基础上，落地"实实在在、非空壳"的真实实现，并做整体视觉升级。

### 第一轮：缺口全量补全
- **会话工作空间（G1-G5）**：分组 / 搜索 / 收藏 / 分享链接 / 导出 MD / 附件上传（`sessions.py` 14 端点 + 前端 Sidebar/App/ChatInput，会话持久化 `data/sessions.json`）
- **管理后端 admin.py 34 → 81 路由**：M1 模型 key 池/回退链、M2 提示词版本/回滚/A-B、M4 工具试跑/热加载、M5 知识库文档/分块/嵌入、M6 A2A 注册表/任务监控、M9 告警历史、M10 Trace/日志/漂移、M11 IAM、M12 Agent 生成/导入/模板市场/发布、G11 定时任务、M13 备份迁移
- 前端新页面 SecurityPanel（IAM）、SchedulePanel（定时任务）；MemoryManager 知识库文档标签

### 第二轮：真实底层能力（deep-spec 20）
- `text_processing.py`（jieba 分词 / TF-IDF+TextRank 关键词 / 清洗 / 摘要）
- `retrieval.py`（BM25 + 向量 RRF 混合检索 + 引用溯源）
- `output_validator.py`（结构化输出校验）+ `/api/nlp/*` 5 端点
- 管理页消除 mock：PromptEditor / ToolRegistry / ModelConfig / AgentGraph / OrchestrationWorkflow / SettingsPanel 全部接入真实后端

### 第三轮：治理 / 成本 / 安全 / 性能（deep-spec 22-31）
- `usage.py` 成本计费（按模型计价 / 按日-模型-会话聚合 + 月度预算，接入对话管线，`/api/admin/usage`）
- `ai_security.py`（prompt 注入双引擎 / PII 脱敏 / 内容过滤，`/api/security/scan|redact`）
- `circuit_breaker.py`（熔断器 trip/half-open/reset，`/api/security/breakers`）
- MonitoringPanel 新增 成本计费 / 安全扫描 标签；全量同步 CHANGELOG / .env.example / requirements

### 第四轮：UI/UX 视觉升级（Modern "Glass-Duet" 精粹风）
- 重写设计令牌（Indigo→Violet 渐变 / 冷灰中性色 / 字体阶梯 / 圆角 / 分层阴影 / 统一缓动）
- `index.css`：毛玻璃 Header、卡片化 Sidebar + 激活渐变指示条、氛围渐变消息区、渐变气泡、浮起输入卡 + 渐变发送按钮、补齐缺失组件样式
- `admin/Styles.css`：卡片悬停抬升、导航渐变条、渐变主按钮、输入 focus 光环、弹窗入场动画、表格行 hover
- `App.tsx`：新增「对话 / 管理台」视图切换器，使管理控制台可达（业务逻辑零破坏）
