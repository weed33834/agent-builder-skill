---
name: "agent-builder-skill"
description: "Agent-Builder-Skill — a skill that creates/builds production-grade AI agents from a one-line requirement. A pre-loaded prompt workflow: reads the requirement, applies defaults, and generates a complete runnable agent (backend + frontend + tests) without multi-round clarification. Invoke when the user wants to create, build, or generate an AI agent."
---

# Agent-Builder-Skill

## Part 0 · 定位与总纲（这个 Skill 是什么、何时用、怎么思考）

### Overview

**Agent-Builder-Skill** 的定位是**一个用来创建智能体的 Skill**（对应能力：Universal Agent Builder）。它是 **meta-skill** —— 不直接提供现成 Agent，而是通过一整套**预装载的提示词工作流**（步骤/提示词/默认值/规格/验收），从自然语言需求**自动生成一个完整、可运行、生产级的 AI Agent 应用**，无需多轮澄清。

**Core capability**: AI 开发者拿到一句话需求，按本 Skill 的默认值与规格直接产出并交付可运行的 Agent。

---


### 对"读取本 Skill 的智能体（构建者）"的约定

> 本文件是**给构建者（另一个 Agent / AI 开发者）看的指令**，不是一份被展示的产品说明。你读到它时，你的角色是**创建者**：负责按下面的契约动手写代码，产出一个全新的 Agent。

1. **你负责写代码**：从需求 → `agent.yaml` → 逐层生成/手写代码 → 前端 → 测试，全程由你完成。
2. **用默认，少问**：未指定项一律用 Part 1 默认值；真歧义才问一次（带推荐）。
3. **以 templates/ 为参考**：仓库里的 `templates/` 与 `scripts/generate.py` 是**参考答案/校验器**——可参考、可复用、可运行 `generate.py` 批量产出；但你不是在维护这个仓库的产品，而是在用它创建新 Agent。
4. **产出必须自验**：交付前按"生成产物完整性清单"逐项核对；能跑 `pytest`/`import`/build 的就跑，确保你写出来的 Agent 真能启动。
5. **交付的是新 Agent 的代码**，不是对这份 SKILL 的说明。

---

### Quick-Start Build Contract（无对话直出标准）

> **本 Skill 的定位**：它不是普通文档，而是一套**预装载的提示词工作流**。它把"做一个智能体"原本需要多轮对话反复澄清、迭代、验收的全部过程，提前固化在这里。**每次构建智能体时，只读本文件即可按标准直接产出，跳过繁复对话。**
>
> 使用方式：收到"做/生成/构建一个 Agent"的诉求后，**自上而下执行下面的契约**，产出物按各步骤写入指定文件。以下 Checklist 是**唯一执行标准**；下方章节为其详细说明与模板。

```
输入   →  自然语言需求（一句话或一段描述）
过程   →  5 步契约（见下）逐条完成
输出   →  一个可运行、可验收的完整 Agent 应用（backend + frontend + 测试）
```

### 第 0 步：判定与范围
- 判定是否用本 Skill（见 "When to Use"）。
- 若用户已给出足够信息，**不要靠追问拖延**，直接按契约产出；仅在信息缺失到无法选型时才用最少 1 个问题澄清。
- 澄清优先级（如必要）：① Agent 用途 → ② LLM/框架偏好 → ③ 工具/记忆/多代理是否需要。

### 第 1 步：Discovery（产出 `agent_requirements.md`）
按下方 `Agent Requirements Document` 章节的字段，用 1 次会话梳理出：Basic Information / Technology Selection / Tools / Memory / Orchestration / Interface。**默认值见契约默认值表**（无要求即采用默认，不反复问）。

### 第 2 步：Architecture Design（产出 `architecture.md`）
按 `Architecture Design Document` 章节，对 L1–L10 逐层给出配置与决策；**优先选用 Template A–E**（聊天/研究/编码/客服/数据分析），少则复用、多则组合。

### 第 3 步：Config Generation（产出 `agent.yaml`）
按 `agent.yaml` 章节生成**单一事实源**。新增校验：`tools.enabled` 中每个名字必须在**通用基础工具集**内（web_search/web_fetch/current_time/calculate/code_execute/run_code/file_read/file_write/read_csv/analyze_data/generate_chart）或自定义 `tools.custom` 中，否则生成产物会 `NameError` 无法启动。

### 第 4 步：Code Generation
```
python scripts/generate.py <agent.yaml> <output_dir> --framework=langgraph|bare
```
- 框架默认 `langgraph`；需要零依赖时用 `bare`。
- 生成产物 = **完整前端（chat + admin + workspace）+ 全量后端路由**（见下方"生成产物完整性清单"）。
- 生成后必须**回归**：`import app.main`、`pytest`、前后端 build。

### 第 5 步：Deployment & Verification（产出运行说明）
按 `Deployment & Verification` 章节：填 `.env` → 装依赖 → 起后端 → 起前端 → 冒烟验证 `/api/health`、`/api/chat`、`/api/tasks` 等。


### When to Use / When NOT to Use

**Use this skill when:**
- User wants to build/create/generate an AI agent or assistant
- User describes an agent idea and wants it implemented
- User needs a full-stack agent application (backend + frontend)
- User asks for an agent with specific tools, LLM, or multi-agent orchestration

**Do NOT use this skill when:**
- User only wants to chat with an AI (use direct LLM interaction)
- User wants to modify an existing agent's code (use direct code editing)
- User asks about agent concepts/theory without wanting to build one
- User wants a simple API wrapper without agent capabilities

---


### AI Behavior Guidelines

> 你同时扮演 **AI 产品经理 + 架构师 + 全栈工程师**。所有决策遵循一条核心规则：

**核心决策规则：「有问题及时问，没问题按默认来」**
- **没问题 / 用户没讲 → 一律按默认来**：用户未指定的任何项（框架、技能、结构、方式、模型、工具、记忆、编排…）直接用"Part 1 决策默认值表"，**不追问、不卡壳、一次成型**，不留空。
- **有问题（真实歧义/冲突）→ 及时问**：仅当"不澄清就会做错方向"时才问，且**一次问清、给推荐选项**，不等用户长篇解释。典型必问项：多智能体 vs 单（客服/协作类）；本地部署 vs 云 API；对成本是否敏感。
- **用户已给明确偏好 → 直接照做**，不再确认、不再问。

**执行准则**：
1. **Direct-produce first**：一句话需求 → 用默认值直接产出可运行 Agent；把"用了哪些默认"用一句话说明（如"默认 langgraph + gpt-4o + 通用工具集 + 安全开"），用户事后可改。
2. **Record decisions**：每步决策写入对应文件（`agent.yaml` 等）。
3. **Explain choices**：默认选择各用一行说明原因。
4. **Deliver runnable code**：产出必须完整可启动，并对照"生成产物完整性清单"自查。

**Keep in mind**：
- 你是在**产出可运行 Agent**，不是在写文档。
- 未指定项一律填默认，**不猜、不问、不卡**。
- 遇到真阻塞（会做错方向）→ **及时问 1 个问题并附推荐**。
- 一次成型；除非用户明确要求分步评审。

---


## Part 1 · 决策与标准（未指定即用默认，交付门槛）

### 通用智能体基础能力全栈（内置，直接按此构建）

> **本节把"一个通用智能体该有的全部基础能力"预装载在这里**，并给出每个能力的**实现方式**与**决策默认值**。构建时**无需向用户追问**——用户一句话或一段描述即可，未指定的项一律采用默认值（见"决策默认值表"），直接产出可运行 Agent。

### 0. 决策默认值表（未指定即用此默认，绝不反复问）

| 维度 | 默认值 | 说明 |
|---|---|---|
| 框架 | `langgraph` | 生产级；要零依赖用 `bare` |
| 图类型 | `single` | 需多智能体才改 `supervisor` |
| LLM 提供商/模型 | `openai` / `gpt-4o` | 可按成本/能力改 deepseek/claude 等 |
| 温度 / max_tokens | `0.7` / `4096` | — |
| 工具（enabled） | `web_search, web_fetch, current_time, calculate` | 按用途加 `code_execute/run_code/file_read/file_write/read_csv/analyze_data/generate_chart` |
| 记忆 | `buffer`（会话内） | 需要知识库加 RAG |
| 编排 | `single` | 客服/协作类改 `supervisor` |
| 安全强制 | `SECURITY_ENABLED=true` | 注入防御 + PII 脱敏 |
| 规划 / 反思 | `off` | 需要思考链开启 `agent_framework.plan/reflect` |
| 流式 | 开 | `/api/chat` SSE |
| 前端 | chat + admin + workspace | 完整三视图 |
| 部署 | uvicorn + 前端 dev | 可选 Docker |


### ✅ 生成产物完整性清单（交付即需满足）
生成出的 Agent 必须包含以下通用能力，缺一即视为未完成：
| 域 | 交付物 | 验证点 |
|---|---|---|
| 10 层架构 | L1 LLM / L2 接口 / L3 提示词 / L4 Agent / L5 工具(MCP) / L6 记忆(RAG) / L7 编排(A2A) / L8 API / L9 前端 / L10 基建 | 目录存在且可 import |
| 通用工具集 | web / 时间计算 / 代码执行 / 文件读写 / 数据分析（CSV 读取/统计/ASCII 图） | `BASE_TOOLS` 可注册、可调用 |
| 自定义工具 | `CUSTOM_TOOLS` 随 `BASE_TOOLS` 一并注册 | `app.main` startup 注册数正确 |
| 全量 API 路由 | chat/health/config/sessions/tools/a2a/voice/nlp/security/admin + tasks/workspaces/skills/notifications/canvas | 每个 `/api/...` 可达 |
| 前端视图 | chat + admin(管理台) + workspace(工作台) | `npm run build` 通过 |
| 工作台组件 | TaskCard / WorkspacePanel / SkillSidebar / NotificationBell / CommandPalette / CanvasView / MemoryPanel | 组件渲染、接入 API |
| 框架中立 | bare / langgraph 双框架可生成 | `--framework=bare` 与 `=langgraph` 均可启动 |
| 测试 | 模板 `pytest` + 框架适配器契约 + M8 SSE 流式回归 | `python -m pytest` 通过 |
| 流式 | `/api/chat` SSE（token/tool/done）被前端 `streamChat` 消费 | 端到端冒烟 |
| 安全强制 | 提示词注入防御 + PII 双向脱敏（接入 ChatInterface，`SECURITY_ENABLED`） | 高风险注入被拦截、PII 被脱敏 |
| 规划/反思 | `agent_framework.plan` / `agent_framework.reflect` 可选节点 | 图含 planner/reflect 节点且可启动 |
| 沙箱管理 | 环境模板 + 默认安装 + 本地/云端 + 启停/默认（`/api/sandbox/*`） | 能建/启停环境、切默认、对话代码真实在沙箱执行 |
| 对话模式开关 | 输入栏 联网搜索/深度思考/知识库/沙箱 开关（`POST /api/chat` 的 `mode`） | 点开高亮且**真实改变回答**（联网/思考/引用），状态持久化 |
| 对话交互细节 | Markdown/代码高亮/消息编辑重发/多模态附件/@与斜杠命令/标题自动生成/置顶归档 | 渲染正确、能编辑重发、能传图文档并生效 |
| 用户/多租户 | 登录 + 角色 + 按用户隔离会话/工作区/配额（`/api/admin/security/users`） | 能登录、角色权限不同、用量按人统计 |
| 主题/i18n/无障碍 | 深色/浅色 + 中英 + 键盘可达 | 能切换并记忆、能换语言 |
| 用量限额 | 按用户/工作区配额 + 超限拦截/降级 + 预算告警 | 能统计、超配额有响应 |
| 浏览器自动化 | 沙箱 chrome 环境 + `browser_*` 工具（导航/点击/填表/截图） | 能操作动态页并返回渲染后内容 |

> 能力全景与深化路线见 `docs/universal-agent-capability-map.md`（MIT 2025 Agent Index + 主流框架调研）。

> 剩余规划能力（企业级/生态/多模态等）见 `docs/deep-spec/*`，均为扩展层，不在"通用基础"交付范围内。

---


**统一验收原则**：任何模块若只做出"能看不能操作"的空壳 = 未完成。每个模块必须满足上述【验收】，且交互（增删改查/导入导出/AI 生成/命令调用）都要落到真实 API，禁止 mock 假数据。

---


## Part 2 · 能力与架构（8 类能力 × 10 层架构 × 模板库）

### 1. 能力全景（A–H 全都要有，缺一不交付）

**A. 模型与推理层**
- 多提供商适配：openai / anthropic / deepseek / gemini / glm / kimi / ollama / qwen（L1 `factory.py` 工厂）。
- 自动重试（指数退避，L2 `retry.py`）；结构化输出 + JSON Schema 校验（L3 `output_parsers` / `output_validator`）。
- 流式（L2 `streaming.py` + SSE）。
- 可选：`agent_framework.plan` 加规划节点、`agent_framework.reflect` 加反思节点（`planner_node` / `reflect_node`）。
- 深化（按需）：模型回退链 `chat_with_fallback`（主模型失败自动降级）；长会话上下文自动压缩/摘要注入。

**B. 工具与执行层**
- 函数调用；通用工具集：web_search / web_fetch / current_time / calculate。
- 代码执行 `code_execute` / `run_code`（沙箱子进程，python/python3/sh/bash）；文件读写 `file_read` / `file_write`；数据分析 `read_csv` / `analyze_data` / `generate_chart`（CSV 读取 / 描述统计 / ASCII 柱状图）。
- MCP 客户端 + 服务端（L5 `mcp_client` / `mcp_server`）。
- 自定义工具 `tools.custom` 自动生成 `custom_tools.py`，随 `BASE_TOOLS` 一并注册。
- 深化（按需）：代码执行加高危命令检测（rm -rf / 等强制确认）、受限 PATH/工作目录、docker 隔离沙箱。

**C. 记忆与知识层**
- 会话记忆 buffer；向量记忆 / RAG（多路召回 + 引用溯源，L6 `vector_store` / `rag_engine` / `retrieval`）。
- 知识库 / 文档摄入（路由 + 可选 pypdf）；摘要 / 压缩（`summary`）；跨会话持久化（`session_manager`）。

**D. 编排与多智能体层**
- 单 Agent ReAct；Supervisor 多 Agent（`customer_service` 模式）；结果聚合（`aggregator`）；A2A 协议（L7）。
- 深化（按需）：Handoff 节点、GroupChat（autogen 适配器）。

**E. 安全与治理层**
- 提示词注入防御 + PII 输入/输出双向脱敏：`SECURITY_ENABLED=true` 时由 `ChatInterface` 统一执行，高风险注入直接拦截。
- 限流中间件；API Key 认证中间件；内容过滤（`content_filter`）。

**F. 可观测性与评估层**
- 结构化日志；指标 / Prometheus（`/metrics`）；评估（`scripts/evaluate.py` + 路由）；成本计费（`usage`）；告警。

**G. 交互与前端层**
- 会话 / 分组 / 分享 / 附件；流式 ChatWindow；管理台（Admin）；工作台（任务 / 画布 / 能力库 / 通知 / 命令 / 记忆）；语音 TTS/STT。

**H. 平台与部署层**
- Docker；配置管理（`.env` + pydantic-settings）；定时任务（`scheduler`）；插件 / 技能加载（`plugin_manager` / `skill_loader`）。


### Complete Architecture Layers (10 Layers)

```
┌──────────────────────────────────────────────────────────┐
│  L10  Infrastructure Layer                                │
│  Docker deployment / Environment config / Monitoring /    │
│  Logging / CI/CD                                         │
├──────────────────────────────────────────────────────────┤
│  L9   Frontend UI Layer                                   │
│  React 19 components / Chat interface / Tool              │
│  visualization / State management / Responsive           │
├──────────────────────────────────────────────────────────┤
│  L8   API Service Layer                                   │
│  FastAPI endpoints / SSE streaming / Auth / Rate         │
│  limiting / A2A endpoints                                │
├──────────────────────────────────────────────────────────┤
│  L7   Orchestration Layer                                 │
│  Multi-Agent coordination / Task decomposition /         │
│  Workflow management / A2A communication / Retry          │
├──────────────────────────────────────────────────────────┤
│  L6   Memory & Knowledge Layer                            │
│  Conversation buffer / Vector store / RAG retrieval /     │
│  Knowledge base / Long-term memory                        │
├──────────────────────────────────────────────────────────┤
│  L5   Tool Execution Layer                                │
│  Tool registry / MCP protocol / Parameter parsing /      │
│  Execution engine / Result processing                    │
├──────────────────────────────────────────────────────────┤
│  L4   Agent Framework Layer                               │
│  AgentRuntime / 6 adapters / State / Node caching /      │
│  (bare/LangGraph/OpenAI-Agents/Claude-SDK/ADK/AutoGen)   │
├──────────────────────────────────────────────────────────┤
│  L3   Prompt Engineering Layer                            │
│  System prompts / Role templates / Few-shot / Output     │
│  parsing / Instruction injection                          │
├──────────────────────────────────────────────────────────┤
│  L2   Model Interface Layer                              │
│  Provider factory (8 vendors) / Model switching /        │
│  Retry / Fallback / Streaming                            │
├──────────────────────────────────────────────────────────┤
│  L1   LLM Foundation Layer                               │
│  OpenAI / Anthropic / DeepSeek / Ollama / Local models   │
└──────────────────────────────────────────────────────────┘
```

### Layer Details

#### L1 - LLM Foundation Layer

The bottom layer, providing actual reasoning capability. Supports multiple model providers and local deployment.

| Provider | Models | Characteristics | Applicable Scenarios |
|----------|--------|------------------|----------------------|
| **OpenAI** | GPT-4o, GPT-4o-mini, o3 | Strongest overall capability, best ecosystem | General scenarios |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku, Claude 4 | Long context, high safety | Coding, long documents |
| **DeepSeek** | DeepSeek-V3, DeepSeek-R1 | Cost-effective, excellent Chinese | Chinese-language scenarios |
| **Ollama** | Qwen2.5, Llama3.1, Mistral, DeepSeek | Local deployment, data security | Privacy-sensitive scenarios |

**Code structure**:
```
app/l1_llm/
├── __init__.py          # Export all LLM adapters
├── base.py              # Abstract base class definition
├── openai_adapter.py    # OpenAI adapter
├── anthropic_adapter.py # Anthropic adapter
├── deepseek_adapter.py  # DeepSeek adapter
├── ollama_adapter.py    # Ollama local adapter
└── factory.py           # Factory method, creates instances based on config
```

**Core interface**:
```python
class LLMAdapter(ABC):
    @abstractmethod
    async def invoke(self, messages: list, tools: list | None = None) -> AIMessage: ...
    @abstractmethod
    async def stream(self, messages: list, tools: list | None = None) -> AsyncIterator[str]: ...
    @abstractmethod
    def bind_tools(self, tools: list) -> Runnable: ...
```

---

#### L2 - Model Interface Layer

Provides a unified call abstraction on top of L1, shielding the differences between providers.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Unified call** | One API to call all models | `chat()`, `stream()` |
| **Auto retry** | Auto-retry on failure (exponential backoff) | `retry_with_backoff()` |
| **Model fallback** | Degrade to backup model when primary fails | `fallback_chain` |
| **Streaming wrapper** | Unified streaming output format | `StreamingCallback` |
| **Token management** | Context window detection and truncation | `token_manager` |

**Code structure**:
```
app/l2_interface/
├── __init__.py
├── chat_interface.py    # Unified chat interface
├── streaming.py         # Streaming handling wrapper
├── retry.py             # Retry and fallback strategies
├── token_manager.py     # Token counting and window management
└── callbacks.py         # Callback handlers
```

---

#### L3 - Prompt Engineering Layer

Manages all prompts that interact with the LLM, ensuring output quality and consistency.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **System prompts** | Define Agent role and behavior guidelines | `system_prompts.py` |
| **Role templates** | Predefined professional roles | `research_assistant`, `code_reviewer`, etc. |
| **Few-shot examples** | Inject examples into prompts | `few_shot_examples.py` |
| **Output parsers** | Convert LLM output to structured data | `PydanticOutputParser` |
| **Instruction injection** | Dynamically inject user requirements | `prompt_builder.py` |

**Code structure**:
```
app/l3_prompt/
├── __init__.py
├── system_prompts.py    # System prompt definitions (generated from config)
├── role_templates.py    # Role templates
├── prompt_builder.py    # Prompt builder
├── output_parsers.py    # Output parsers
├── few_shot.py          # Few-shot example management
└── sanitizer.py         # Prompt safety filtering
```

**Core design**:
```python
class PromptBuilder:
    """Chain-style prompt builder"""

    def with_system(self, role: str) -> PromptBuilder: ...
    def with_context(self, context: dict) -> PromptBuilder: ...
    def with_examples(self, examples: list) -> PromptBuilder: ...
    def with_tools(self, tools: list) -> PromptBuilder: ...
    def with_history(self, messages: list) -> PromptBuilder: ...
    def build(self) -> list[dict]: ...
```

---

#### L4 - Agent Framework Layer

The core orchestration layer: a framework-agnostic `AgentRuntime` with a pluggable adapter registry. Six adapters ship out of the box — `bare` (stdlib-native), `langgraph`, `openai-agents`, `claude-sdk`, `adk`, `autogen` — selected via `agent.yaml` (`framework.name`).

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **State graph** | Define the Agent execution flow | `StateGraph` + `add_edge(START, node)` |
| **State management** | Cross-node state passing | `MessageState` / `AgentState` (TypedDict) |
| **Node definition** | Each processing step | `add_node()` supports `cache_policy` and lazy nodes |
| **Unified routing** | State update + routing + recovery | `Command(update, goto, resume)` |
| **Checkpointing** | Execution state persistence | `InMemorySaver` (aliased `MemorySaver`), `PostgresSaver` |
| **Interrupt/Resume** | Support for human-in-the-loop | `interrupt(value)` |
| **Prebuilt Agent** | Quickly create ReAct Agent | `create_react_agent(model, tools, version="v2")` |
| **Retry policy** | Node-level auto-retry | `RetryPolicy(max_attempts=3, backoff_factor=2.0)` |
| **Pre/Post Hooks** | Pre/post model call handling | Pre/post model call hooks |
| **Content-block streaming** | Structured streaming output | Content-block level streaming |

**Code structure**:
```
app/l4_agent/
├── __init__.py
├── state.py             # AgentState / MessageState type definitions
├── graph.py             # Graph construction and compilation
├── nodes.py             # Node logic
├── router.py            # Routing decisions
├── checkpointer.py      # Checkpoint management
└── intercepts.py        # Interrupt and resume
```

**State flow (v1.0 API)**:
```
                    ┌───────────┐
                    │  START    │  ← add_edge(START, 'agent')
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Agent    │  ← LLM decides next step
                    │  node     │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Router   │  ← Need a tool? End?
                    └─────┬─────┘
                     ╱         ╲
                    ╱           ╲
            ┌──────▼────┐  ┌────▼──────┐
            │  Tool     │  │   END     │
            │  node     │  │  Return   │
            │  execute  │  │  result   │
            └──────┬────┘  └───────────┘
                   │
                   └────────→ Back to Agent node
```

---

#### L5 - Tool Execution Layer

Manages all external capabilities the Agent can call, supporting the MCP 2026-07-28 stateless protocol.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Tool registry** | Register and discover all tools | `ToolRegistry` |
| **Tool definition** | Tool parameters and descriptions | `@tool` decorator + Pydantic |
| **Execution engine** | Call tools and return results | `execute_tool()` |
| **Result processing** | Format tool output | `format_tool_result()` |
| **Error recovery** | Degradation strategy on tool failure | `ToolErrorHandler` |
| **Timeout control** | Prevent tool execution from running too long | `asyncio.timeout` |
| **MCP client** | Call remote tools via the MCP protocol | `FastMCP` client / self-describing request (`_meta` carries identity and capabilities) |
| **MCP server** | Expose local tools as an MCP service | `FastMCP` server, Header routing (`Mcp-Method`, `Mcp-Name`) |

**Code structure**:
```
app/l5_tools/
├── __init__.py
├── registry.py          # Tool registry
├── base_tools.py        # Base tools (search/fetch/calculate/time)
├── custom_tools.py      # Custom tool templates
├── executor.py          # Tool execution engine
├── errors.py            # Error handling
├── schemas.py           # Tool parameter schemas
├── mcp_client.py        # MCP client (2026-07-28 stateless protocol)
└── mcp_server.py        # MCP server (FastMCP)
```

---

#### L6 - Memory & Knowledge Layer

Manages the Agent's short-term memory, long-term memory, and external knowledge.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Conversation buffer** | Short-term session memory | `ConversationBufferMemory` |
| **Summary memory** | Auto-summarize long conversations | `ConversationSummaryMemory` |
| **Vector store** | Semantic search and retrieval | `ChromaDB`, `FAISS` |
| **RAG engine** | Retrieval-augmented generation | `RetrievalQA` chain |
| **Knowledge base** | Structured knowledge management | `KnowledgeBase` |

**Code structure**:
```
app/l6_memory/
├── __init__.py
├── buffer.py            # Conversation buffer memory
├── summary.py           # Summary memory
├── vector_store.py      # Vector store interface
├── rag_engine.py        # RAG retrieval augmentation
├── knowledge_base.py    # Knowledge base
└── session_manager.py   # Session management
```

---

#### L7 - Orchestration Layer

Manages multi-Agent collaboration, task decomposition, workflow execution, and A2A cross-Agent communication.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Task decomposition** | Break complex tasks into subtasks | `TaskDecomposer` |
| **Multi-Agent coordination** | Route and schedule sub-Agents | `AgentOrchestrator` |
| **Workflow engine** | Define execution flows | `WorkflowGraph` |
| **Conditional routing** | Dynamically route based on results | `ConditionalRouter` |
| **Result aggregation** | Merge multiple Agent results | `ResultAggregator` |
| **A2A client** | Call external Agents via the A2A protocol | `AgentCard` discovery + `Task` lifecycle management |
| **A2A server** | Expose Agent capabilities to the outside | `/.well-known/agent.json` + JSON-RPC 2.0 endpoints |

**Code structure**:
```
app/l7_orchestrator/
├── __init__.py
├── base.py              # Orchestrator base class
├── decomposer.py        # Task decomposer
├── orchestrator.py      # Multi-Agent coordinator
├── workflow.py          # Workflow engine
├── router.py            # Conditional routing
├── aggregator.py        # Result aggregation
├── supervisor.py        # Supervisor Agent (optional)
├── a2a_client.py        # A2A protocol client (Agent Card discovery + Task submission)
└── a2a_server.py        # A2A protocol server (JSON-RPC 2.0 endpoints)
```

**Multi-Agent orchestration patterns**:

**Pattern 1: Supervisor Mode**
```
┌─────────────┐
│  User Input │
└──────┬──────┘
       │
┌──────▼──────┐
│  Supervisor  │  ← Analyzes task, decides decomposition strategy
│  Agent       │
└──────┬──────┘
       │
       │  Task decomposition
       │
  ┌────┼────┬────┬────┐
  │    │    │    │    │
  ▼    ▼    ▼    ▼    ▼
┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐
│S1│ │S2│ │S3│ │S4│ │S5│  ← Sub-Agents execute in parallel
└──┘ └──┘ └──┘ └──┘ └──┘
  │    │    │    │    │
  └────┼────┼────┼────┘
       │    │    │
┌──────▼────▼────▼──────┐
│  Result Aggregator     │  ← Merges results, generates final answer
│  Agent                 │
└──────┬────────────────┘
       │
┌──────▼──────┐
│  Final Output│
└─────────────┘
```

**Pattern 2: Hierarchical Subagent Mode**

The hierarchical subagent mode introduced in Claude Agent SDK 2026, supporting up to 5 levels of nesting depth:

```
┌──────────────────────────────────┐
│           Main Agent             │
│   (Global context, top-level     │
│    decision-making)              │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────┬───────────┬──────────┐
    ▼             ▼           ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
│ Sub-   │ │ Sub-    │ │ Sub-    │ │ Sub-     │
│ Agent  │ │ Agent   │ │ Agent   │ │ Agent    │
│ Lv 1   │ │ Lv 1    │ │ Lv 1    │ │ Lv 1     │
│Research │ │ Data    │ │ Writing │ │ Verify   │
└────┬────┘ └────┬────┘ └─────────┘ └──────────┘
     │           │
     ▼           ▼
  ┌──────┐  ┌──────────┐
  │ Sub- │  │ Sub-     │
  │ Agent│  │ Agent    │
  │ Lv 2 │  │ Lv 2     │
  │ Sub- │  │ Subtask  │
  │ task │  │          │
  └──────┘  └──────────┘
```

**Key features**:

| Feature | Description |
|---------|-------------|
| **Noise isolation** | Each sub-Agent has its own independent context window; the parent Agent is unaware of the sub-Agent's internal details |
| **Independent tool access** | Each sub-Agent can be configured with a different toolset |
| **Delegation policy** | Auto (auto-decision), Manual (manually specified), ToolCall (triggered via tool call) |
| **Depth limit** | Up to 5 levels of nesting |
| **Result aggregation** | Sub-Agent results are automatically aggregated into the parent Agent's context |

**Implementing the supervisor mode with the langgraph-supervisor package**:
```python
from langgraph_supervisor import create_supervisor
from langgraph.prebuilt import create_react_agent

### Define sub-Agents
research_agent = create_react_agent(
    model=llm,
    tools=[web_search, web_fetch],
    version="v2",
    name="research_agent",
)

analysis_agent = create_react_agent(
    model=llm,
    tools=[analyze_data, generate_chart],
    version="v2",
    name="analysis_agent",
)

### Create the supervisor Agent
supervisor = create_supervisor(
    agents=[research_agent, analysis_agent],
    model=llm,
    prompt="You coordinate research and analysis tasks.",
)

### Compile and run
app = supervisor.compile()
```

---

#### L8 - API Service Layer

Provides HTTP interfaces to the outside, handling cross-cutting concerns such as request/response, authentication, and rate limiting.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Route registration** | Define API endpoints | `FastAPI APIRouter` |
| **SSE streaming** | Real-time streaming responses | `StreamingResponse` |
| **Request validation** | Input parameter validation | `Pydantic BaseModel` |
| **Authentication** | API Key / JWT | `AuthMiddleware` |
| **Rate limiting** | Request frequency limiting | `RateLimiter` |
| **Error handling** | Unified error responses | `ExceptionHandler` |
| **A2A endpoints** | Agent Card discovery + Task protocol | `GET /.well-known/agent.json`, `POST /a2a/task` |

**Code structure**:
```
app/l8_api/
├── __init__.py
├── main.py              # FastAPI application instance
├── routes/
│   ├── __init__.py
│   ├── chat.py          # Chat endpoint
│   ├── health.py        # Health check
│   ├── sessions.py      # Session management
│   ├── tools.py         # Tool query
│   └── a2a.py           # A2A protocol endpoints (Agent Card + Task)
├── middleware/
│   ├── __init__.py
│   ├── auth.py          # Authentication middleware
│   ├── rate_limit.py    # Rate limiting
│   └── logging.py       # Request logging
├── schemas.py           # Request/response models
└── errors.py            # Exception handling
```

**API endpoint overview**:
```
POST /api/chat          # Streaming chat
POST /api/chat/reset    # Reset session
GET  /api/health        # Health check
GET  /api/sessions      # Session list
GET  /api/tools         # Available tools list
GET  /api/config        # Get current Agent configuration

### A2A protocol endpoints
GET  /.well-known/agent.json  # Agent Card capability declaration
POST /a2a/task               # Submit A2A task (JSON-RPC 2.0)
POST /a2a/task/stream        # Streaming A2A task (SSE)
```

---

#### L9 - Frontend UI Layer

The user interaction interface, responsible for display and interaction.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Chat interface** | Message display and input | `ChatWindow`, `MessageBubble`, `ChatInput` |
| **Tool visualization** | Tool call process and results | `ToolCall` card |
| **Session management** | Multi-session switching | `Sidebar`, `SessionList` |
| **State management** | Application state | React `useState` / `useReducer` |
| **Streaming rendering** | Real-time streaming text display | SSE `AsyncGenerator` |
| **Dynamic config** | Render UI based on API config | `GET /api/config` |
| **Responsive layout** | Multi-device adaptation | CSS Media Queries |

**Code structure**:
```
frontend/src/
├── App.tsx              # Root component (routing + layout)
├── main.tsx             # Entry
├── l9_ui/               # L9 frontend UI
│   ├── chat/
│   │   ├── ChatWindow.tsx    # Chat window
│   │   ├── MessageBubble.tsx # Message bubble
│   │   ├── ChatInput.tsx     # Input box
│   │   └── ToolCall.tsx      # Tool call visualization
│   ├── layout/
│   │   ├── Header.tsx        # Header
│   │   └── Sidebar.tsx       # Sidebar
│   └── shared/
│       ├── Loading.tsx       # Loading animation
│       └── ErrorBoundary.tsx # Error boundary
├── l8_api/
│   └── api.ts           # API client (SSE)
├── types/
│   └── index.ts         # Type definitions
└── styles/
    └── index.css        # Global styles
```

---

#### L10 - Infrastructure Layer

Deployment, runtime, and operations-related configuration.

| Module | Responsibility | Key Implementation |
|--------|----------------|---------------------|
| **Containerization** | Docker images and orchestration | `Dockerfile`, `docker-compose.yml` |
| **Environment config** | Environment variable management | `.env`, `config.py` |
| **Logging** | Runtime log recording | `structlog`, `logging` |
| **Monitoring** | Performance monitoring and alerting | Health check endpoint |
| **CI/CD** | Automated build and deployment | GitHub Actions |

**Code structure**:
```
├── docker-compose.yml       # Full-stack orchestration
├── Dockerfile               # Backend image
├── .env.example             # Environment variable template
├── scripts/
│   ├── start.sh             # Start script
│   └── run.sh               # One-click run
└── app/l10_infra/
    ├── __init__.py
    ├── config.py            # Configuration management
    ├── logging.py           # Logging configuration
    └── monitoring.py        # Monitoring
```

---


### Architecture Template Library

> 现成模板：**A 聊天助手 · B 研究助手 · C 编码助手 · D 多 Agent 客服 · E 数据分析 · F 企业内助手**。每个对应 `templates/agent-types/*.yaml`，可直接复制改造。

### Template A: Chat Assistant

**Applicable scenario**: General conversational assistant, the simplest Agent

**Configuration differences**:
- `llm.model`: `gpt-4o-mini` (a low-cost model is sufficient)
- `tools.enabled`: `[current_time]` (minimal tools)
- `agent_framework.graph_type`: `single`
- `ui.features`: `[session_management]`

**Core code volume**: Minimal, about 10 files

**YAML configuration**:
```yaml
agent:
  name: "ChatAssistant"
  type: "chat"
  description: "General conversational assistant"

llm:
  provider: "openai"
  model: "gpt-4o-mini"

tools:
  enabled: [current_time]

prompt:
  role_template: "default"

agent_framework:
  graph_type: "single"

orchestration:
  mode: "single"

ui:
  type: "chat"
  features: [session_management]
```

---

### Template B: Research Assistant

**Applicable scenario**: Search, analyze, and summarize information

**Configuration differences**:
- `llm.model`: `gpt-4o` (stronger reasoning capability)
- `tools.enabled`: `[web_search, web_fetch, current_time, calculate]`
- `prompt.role_template`: `research_assistant`
- `prompt.output_format`: `markdown`
- `memory.max_messages`: `100` (longer memory)

**Key code differences**:
```python
### L3 layer: Research assistant role template
SYSTEM_PROMPT = """You are a professional research assistant. Your tasks are:
1. Understand the user's question
2. Search for relevant information
3. Summarize and analyze results
4. Provide in-depth, sourced answers"""

### Custom tool
@tool
async def save_note(title: str, content: str) -> str:
    """Save research notes to a local file"""
    with open(f"notes/{title}.md", "w", encoding="utf-8") as f:
        f.write(content)
    return f"Note saved: {title}.md"
```

---

### Template C: Coding Assistant

**Applicable scenario**: Programming assistance, code review, debugging

**Configuration differences**:
- `llm.provider`: `anthropic`
- `llm.model`: `claude-3-5-sonnet-20241022` (strongest coding capability)
- `tools.enabled`: `[web_search, code_execute, file_read, file_write, current_time]`
- `prompt.role_template`: `code_reviewer`

**Key code differences**:
```python
### L3 layer: Coding assistant role template
SYSTEM_PROMPT = """You are a professional coding assistant. You excel at:
1. Writing high-quality code
2. Code review and optimization
3. Debugging and fixing bugs
4. Architecture design recommendations

Code standards:
- Follow PEP 8 / language standard conventions
- Add necessary type annotations
- Include error handling
- Focus on readability and maintainability"""

### Code execution tool
@tool
async def code_execute(code: str, language: str = "python") -> str:
    """Execute code in a sandbox"""
    # Use a Docker sandbox or subprocess
    ...

@tool
async def file_read(path: str) -> str:
    """Read file contents"""
    ...

@tool
async def file_write(path: str, content: str) -> str:
    """Write content to a file"""
    ...
```

---

### Template D: Customer Service

**Applicable scenario**: Multi-Agent collaborative customer service system

**Configuration differences**:
- `agent_framework.graph_type`: `multi`
- `orchestration.mode`: `multi`
- Need to define multiple sub-Agents

**Multi-Agent configuration**:
```yaml
agent:
  name: "CustomerService"
  type: "customer_service"

llm:
  provider: "openai"
  model: "gpt-4o"

tools:
  enabled: [web_search, current_time]

agent_framework:
  graph_type: "multi"

orchestration:
  mode: "multi"
  agents:
    - name: "classifier"
      role: "Question classification"
      system_prompt: "You classify user questions into: orders, refunds, product inquiries"
      tools: []
    - name: "order_agent"
      role: "Order handling"
      system_prompt: "You handle order-related queries"
      tools: [query_order, cancel_order]
    - name: "refund_agent"
      role: "Refund handling"
      system_prompt: "You handle refund requests"
      tools: [process_refund, check_refund_status]
    - name: "aggregator"
      role: "Result aggregation"
      system_prompt: "You aggregate all sub-agent results and generate the final response"
      tools: []

ui:
  type: "chat"
  features: [tool_visualization, session_management]
```

**Key code differences — LangGraph adapter (v1.0+)**: 
```python
from langgraph.graph import StateGraph, START, END
from langgraph.graph.state import Command

### L4 layer: Multi-Agent graph
def build_multi_agent_graph(agents: list) -> StateGraph:
    """Build a multi-Agent orchestration graph (v1.0 API)"""
    workflow = StateGraph(AgentState)

    # Classification Agent
    workflow.add_node("classifier", create_agent_node(agents[0]))
    # Specialist Agents
    workflow.add_node("order_agent", create_agent_node(agents[1]))
    workflow.add_node("refund_agent", create_agent_node(agents[2]))
    # Aggregation Agent
    workflow.add_node("aggregator", create_agent_node(agents[3]))

    # Use add_edge(START, node) instead of set_entry_point
    workflow.add_edge(START, "classifier")

    # Conditional routing: classifier → specialist Agent
    workflow.add_conditional_edges(
        "classifier",
        classifier_router,
        {
            "order_agent": "order_agent",
            "refund_agent": "refund_agent",
            "aggregator": "aggregator",
        },
    )

    # Specialist Agent → aggregator
    workflow.add_edge("order_agent", "aggregator")
    workflow.add_edge("refund_agent", "aggregator")
    # Use add_edge(node, END) instead of set_finish_point
    workflow.add_edge("aggregator", END)

    return workflow
```

---

### Template E: Data Analysis

**Applicable scenario**: Data upload, analysis, visualization

**Configuration differences**:
- `tools.enabled`: `[read_csv, analyze_data, generate_chart, current_time]`
- `memory.knowledge.enabled`: `true`
- `ui.features`: `[tool_visualization, file_upload, chart_display]`

**Key code differences**:
```python
### L5 layer: Data analysis tools
@tool
async def read_csv(file_path: str) -> str:
    """Read a CSV file and return a data summary"""
    import pandas as pd
    df = pd.read_csv(file_path)
    return f"Rows: {len(df)}, Columns: {list(df.columns)}\n{df.describe().to_string()}"

@tool
async def analyze_data(data_description: str, analysis_type: str) -> str:
    """Perform data analysis"""
    ...

@tool
async def generate_chart(data: str, chart_type: str = "bar") -> str:
    """Generate a chart and save it as an image"""
    import matplotlib.pyplot as plt
    ...
```

---


## Part 3 · 详细规格（模块 M0-M16 × 深度 D1-D12）

### 功能深化规格（Functional Deep Spec）——每个模块都要做到位

> **为什么需要本规格**：笼统描述（"做一个工作台""做一个技能管理"）只会让 AI 交出一个空壳/纯展示页。**必须把每个模块"拿来做什么、在哪里做、界面长什么样、怎么操作、怎么被调用、怎么 AI 生成"全部写清楚**，AI 才能照做。下面用统一模板描述所有模块，**每个模块必须满足其"验收"项才算完成**。

### 通用模板（每个模块按此描述，缺一项即不完整）
```
【用途】这个功能是干嘛的，解决什么问题。
【位置】在前端哪个视图/导航/路由；后端哪些 API。
【调用方式】用户怎么触达：①界面按钮/菜单 ②对话内命令（如 /skill ...）③后台默认可用（智能体对话中随时可自动调用）。
【界面规格】布局草图 + 元素列表 + 交互行为（点击/悬停/拖拽/弹窗/空态/加载/错误态）。
【操作清单】增/删/改/查/导入/导出/启停/AI 生成，逐个写明。
【AI 生成】用户给一句话描述，AI 一键产出什么（草稿/模板/配置）。
【验收】能做哪些具体操作才算完成。
```

### M0.5 对话界面与模式开关（Chat UI & Modes）——像 GPT/豆包一样的主界面
- **用途**：对话主界面是用户每天接触的门面，必须有"像 GPT/豆包 一样顺手"的模式开关，且**点开真的生效**，不是摆设。
- **位置**：主对话视图（App「对话」）；API `POST /api/chat`（`mode` 字段：`web_search/deep_think/kb_id`）+ `GET /api/config`。
- **输入栏（底部）布局**：大输入框 + 底部一排**模式开关按钮** + 右侧「发送」圆钮；输入框上方一行可选「已上传附件 chips」。
- **模式开关（点击即切换，状态高亮，且真实改变行为）**：
  - **联网搜索**（🌐）：开 → 该次请求先调 `web_search` 把结果注入上下文再回答；关 → 纯模型回答。发送时随请求带 `mode.web_search=true`。
  - **深度思考**（🧠）：开 → 触发 `agent_framework.plan + reflect`（先规划再回答，回答前展示"思考中…"或思考摘要）；关 → 普通快速回答。
  - **知识库**（📚）：开关 + 下拉选库 → 开且选库 → 该次请求走 RAG 召回该库 Top-K 注入上下文，回答带引用；关 → 不用知识库。
  - **沙箱/代码**（⚙️，可配）：开 → 对话中代码/命令走"默认沙箱"真实执行；关 → 不执行、只给代码建议。
  - **多模型选择**（可选）：输入框上方模型下拉（用 Part1 默认模型），切换即改本次请求模型。
- **交互行为**：
  - 点击开关立即变色/描边并记忆为**本次/全局偏好**（持久化到设置），下次打开仍是上次状态。
  - 发送请求时把开关状态打包进 `POST /api/chat` 的 `mode`，后端据此注入工具/RAG/规划，**必须真实生效并反映到回答里**（联网的回答有网页信息、深度思考有思考过程、知识库回答有引用来源）。
  - 流式渲染 token；「停止生成」按钮；「重新生成」；单条「复制/点赞/点踩」；工具调用卡片可视化（调了哪些工具/结果）。
- **空态/加载态/错误态**：空会话引导语 + 示例；发送后气泡加载动效；出错显示可重试。
- **验收**：三个开关点开/关有高亮且**真实改变回答**（联网带回网页、深度思考先思考、知识库带引用）；开关状态持久化；流式+停止+重新生成可用；工具调用可视化。

---

### M0. 技能/插件管理（flagship 范例——按此深度复制到所有模块）

- **用途**：把"可复用的能力"（专家人设、原子技能、外部连接器）做成可管理、可被对话调动的实体，避免把功能写死在代码里。
- **位置**：工作台「能力库」+ 管理台「技能管理」页；API `GET/POST/PUT/DELETE /api/skills`、`GET /api/skills/{kind}/{id}`；持久化 `data/skills.json`。
- **调用方式**：① 界面按钮增删改查；② 对话框输入 `/skill 列出所有技能`、`/skill 启用 周报生成` 等命令；③ **后台默认可用**——智能体在任意对话中按需自动调用 `/api/skills` 检索并启用某个技能（不需要用户显式触发）。
- **界面规格**：
  - 左侧分类 Tab：`专家 / 技能 / 连接器`（三态切换，当前高亮）。
  - 列表卡片：名称 + 类型标签 + 描述 + 标签 chips + 启用/停用开关（点击切换，即时持久化）。
  - 顶部：搜索框（按名称/描述过滤）+「新建」按钮 +「导入」下拉 +「导出」按钮。
  - 「新建」弹窗：字段 = 类型(单选) + 名称 + 描述 + 标签(多选/输入) + 配置(JSON 编辑器) + 「AI 生成」按钮。
  - 「AI 生成」：用户输入一句描述（如"写一个周报生成技能"），AI 返回**完整的技能配置模板**（名称/描述/标签/config/触发词），一键填入并保存。
  - 卡片操作：编辑 / 删除(确认弹窗) / 导出(单个 YAML/JSON) / 复制。
  - 空态：无数据时显示引导（"暂无技能，点击新建或 AI 生成"）。
- **操作清单**：新建 / 查看详情 / 编辑 / 删除 / 启停 / 搜索 / 单条导出 / 批量导出(JSON) / 从文件导入 / AI 生成 / 命令调用。
- **AI 生成**：`/skill 生成 <描述>` 或管理页「AI 生成」→ 返回可保存的完整技能模板（含 `kind/name/description/tags/config/触发词`），并给出「已生成，可在对话中输入 /skill 触发」提示。
- **验收**：能在界面增删改查并立即生效；能 `/skill ...` 命令在对话中调用；智能体在对话中能自动检索并启用技能；能导入导出；能 AI 生成完整模板。

---

### M1. 提示词管理（prompts）
- 用途：统一管理系统提示词，带版本、回滚、A/B 分流，避免改一句提示词就改代码。
- 位置：管理台「提示词管理」；API `/api/admin/prompts*`。
- 调用方式：界面 CRUD；Agent 运行时按 `prompt_id` 读取当前启用版本。
- 界面规格：左列表（名称/状态/版本）+ 右 4-Tab 详情（配置/测试/运行/审计）；编辑区带变量占位符 + 「AI 优化/改写/多语言/审查」按钮；版本历史 + 一键回滚；A/B 分流开关（线上流量比例）。
- 操作：新建/编辑/删除/启停/版本历史/回滚/A-B/导入导出/AI 生成（描述→提示词草稿）。
- AI 生成：`生成客服引导提示词` → 返回可保存的提示词正文 + 变量说明 + 版本号。
- 验收：能 CRUD、能版本回滚、能 A/B、能 AI 生成、Agent 读到的是启用版本。

### M2. 模型管理（models）
- 用途：配置多个 LLM 提供商/模型 + key 池 + 回退链，一处切换全 Agent 生效。
- 位置：管理台「模型管理」；API `/api/admin/models*`。
- 界面规格：模型列表（提供商/模型/base_url/状态/延迟）+「测试连通」按钮(实时 ping 返回延迟与错误)+ key 池管理 + 回退链顺序拖拽。
- 操作：增删改/测试连通/key 池增删/回退链配置/设为默认。
- 验收：能加模型并测试连通；主模型失败自动走回退链；默认模型可切换。

### M3. 工具管理（tools / MCP）
- 用途：管理内置工具与外部 MCP 工具，可试跑、可热加载。
- 位置：管理台「工具管理」；API `/api/tools`、`/api/admin/tools*`、`/api/mcp/*`。
- 界面规格：工具列表（名称/描述/分类/来源）+「试跑」(填参数→看结果/延迟)+「连接 MCP」(HTTP/stdio)+ MCP 服务器状态面板。
- 操作：查看/试跑/启停/连接/断开 MCP/热加载目录/导入工具。
- 验收：能试跑工具返回真实结果；能连接 MCP 并导入其工具；工具可在对话中被调用。

### M3.5 沙箱管理（Sandbox）
- **用途**：让 Agent 的代码/命令在一个**可管理、可隔离、可复用环境**里执行，而不是裸跑在宿主机上；支持"环境模板 + 默认安装 + 本地/云端 + 启停"。
- **位置**：管理台「工具管理 → 沙箱」Tab；API `GET/POST/PUT/DELETE /api/sandbox/envs`、`POST /api/sandbox/run`、`POST /api/sandbox/envs/{id}/enable`。
- **基础环境（镜像/模板）**：预置常用环境，例如 `python`(3.11 含 numpy/pandas/requests)、`node`(20)、`sh`、`data-science`(python+matplotlib+jupyter)、`chrome`(浏览器自动化)。每个环境 = {id, 名称, 语言, 预装包列表, 基础镜像, 资源配额(cpu/mem/timeout), 类型(本地|云端)}。
- **界面规格**：
  - 环境列表卡片：名称 / 语言 / 预装包 chips / 类型(本地|云端) / 状态(启用|停用) / 资源配额；右侧「启用/停用」开关 + 「默认」星标。
  - 「新建环境」：选基础镜像 → 勾选预装包（默认给一套推荐）→ 选类型(本地/云端) → 设资源配额 → 保存。
  - 环境详情：预装包列表 + 可增删 + 「测试运行」(输入一段代码 → 沙箱内执行 → 返回 stdout/stderr/耗时)。
  - 顶部：**「默认沙箱」下拉**（默认 `python`，本地；可切云端）+ **「沙箱开关」**（全局启用/停用，停用后对话里代码执行改为安全提示而非真跑）。
- **调用方式**：① 对话中代码/命令默认走"当前默认沙箱"（用户可切换）；② 管理台管理环境与默认；③ 对话输入栏可选「沙箱」模式(执行/禁执行)。
- **本地 vs 云端**：本地=本机 docker/受限子进程（无网或白名单网）；云端=远程隔离沙箱 API（如专用沙箱服务）。**默认=本地**，用户可在设置/对话里切换。
- **安全**：高危命令（rm -rf / 等）强制确认；受限 PATH/工作目录；超时与资源配额；执行日志入审计。
- **AI 生成**：`给沙箱加一个 rust 环境` → 返回环境模板（镜像/预装包/配额/命令）并可一键保存。
- **验收**：能建/启停/删环境、能切换默认；对话中代码走默认沙箱真实执行并返回结果；能本地/云端切换；高危命令有确认；停用后不真跑。

### M4. Agent 管理（agents）
- 用途：把"一个 Agent"作为可配置资产（prompt+模型+工具+编排），可生成/导入/发布。
- 位置：管理台「Agent 管理」；API `/api/admin/agents*`。
- 界面规格：Agent 列表 +「新建」弹窗(描述→AI 生成 agent.yaml)+ 流程图编辑(节点/边拖拽保存)+ 版本/发布流量。
- 操作：增删改/查看图/AI 生成/导入(yaml/json)/发布(版本+流量)/启停。
- AI 生成：`做一个客服 Agent` → 返回完整 `agent.yaml`（agent/llm/prompt/tools/orchestration/ui）+ 可直接提交生成代码。
- 验收：能 AI 生成并保存 Agent；能从 yaml 导入；能发布指定流量；能生成可运行代码。

### M5. 记忆/知识库（memory）
- 用途：管理会话记忆与文档知识库，支持向量检索。
- 位置：工作台「记忆检索」+ 管理台「记忆管理」；API `/api/admin/memory*`。
- 界面规格：知识库列表（文档数/分块数/嵌入方式）+「检索测试」(输入 query→Top-K 命中带相似度/来源/引用)+ 文档增删。
- 操作：建库/删库/加文档/删文档/检索测试/清空/提取预览。
- 验收：能建库加文档；检索返回带引用的命中；Agent 在对话中能 RAG 召回。

### M6. 编排/工作流（workflows）
- 用途：可视化编排多 Agent/工具为工作流，可保存复跑。
- 位置：管理台「编排管理」+ 工作台「编排画布」；API `/api/admin/workflows*`、`/api/canvas*`。
- 界面规格：画布 = 节点(trigger/agent/tool/memory/llm/output 分色)+ 连线(带标签)+ 节点属性面板 + 保存/加载画布列表。
- 操作：拖拽建节点/连线/改名/删除节点连线/保存加载/导出画布 JSON。
- 验收：能搭出带节点连线的图并保存；能加载回画布；能作为工作流被 Agent 执行。

### M7. 会话/工作区（sessions / workspaces）
- 用途：多会话管理 + 部门/项目/个人工作区资源隔离。
- 位置：侧边栏会话 + 工作台「工作区」；API `/api/sessions*`、`/api/workspaces*`。
- 界面规格：会话列表（分组/收藏/搜索/分享/导出 MD/附件）+ 工作区卡片（类型色标/成员/资源配额）。
- 操作：会话增删改名/分组/收藏/分享/导出/传附件；工作区建删/成员管理/类型切换。
- 验收：能管理会话并跨会话续聊；能建工作区并隔离资源。

### M8. 任务（tasks）
- 用途：跟踪长任务进度（步骤日志/进度/结果/重试/取消）。
- 位置：工作台「任务」；API `/api/tasks*`。
- 界面规格：任务卡片（状态灯/进度条/步骤列表/结果/耗时/重试/取消/删除）。
- 操作：创建/查看进度/重试/取消/删除；后台运行时可实时刷进度。
- 验收：能创建并看到进度推进；能取消/重试；步骤日志可见。

### M9. 通知（notifications）
- 用途：汇总系统/Agent 事件通知，带未读角标与实时推送。
- 位置：顶部「通知铃铛」；API `/api/notifications*` + WS `/api/notifications/ws`。
- 界面规格：铃铛 + 未读红点数字；下拉面板（等级色点/模块/时间/未读高亮）+「全部已读」+ 单条点击已读。
- 操作：查看/单条已读/全部已读/删除/实时刷新。
- 验收：有未读角标；点击单条变已读；能实时收到新通知。

### M10. 命令面板（command palette）
- 用途：⌘K 全局快速命令，免点菜单直达任何功能。
- 位置：全局（任意页面 Ctrl/Cmd+K 唤起）；数据来自各模块。
- 界面规格：遮罩 + 输入框 + 命令列表（分组：导航/工作区/能力库/通知）+ 上下键选择 + 回车执行 + Esc 关闭。
- 操作：搜索/选择/执行/关闭。
- 验收：⌘K 能唤起；能搜索并执行跳转。

### M11. 评估（evaluations）
- 用途：用数据集跑 Agent 版本得分，支持通过率阈值与报告。
- 位置：管理台「评估管理」；API `/api/admin/evaluations*`；离线 `scripts/evaluate.py`。
- 界面规格：评估任务列表（状态/通过率/耗时）+「运行评估」(选数据集/版本/阈值→跑分报告)+ 用例明细。
- 操作：建数据集/运行/查看报告/删除。
- 验收：能运行评估并出报告；能按阈值判定通过。

### M12. 监控/告警（monitoring）
- 用途：指标、日志、告警、Trace 可视化，支撑排障。
- 位置：管理台「监控告警」；API `/api/admin/metrics|alerts|logs|traces|drift`。
- 界面规格：指标曲线 + 系统健康灯 + 告警列表(增删改/历史) + 日志查看 + 漂移面板。
- 操作：查看指标/配告警规则/查日志/看漂移。
- 验收：能看到指标曲线；能配告警并触发历史记录。

### M13. 成本计费（usage）
- 用途：按天/按模型统计 tokens 与费用，设置预算。
- 位置：管理台「设置/计费」；API `/api/admin/usage`。
- 界面规格：日费用曲线 + 按模型统计表 + 月度预算进度 + 预算设置。
- 操作：查看/设预算。
- 验收：能看费用趋势；超预算能提示。

### M14. 安全（security）
- 用途：注入防御、PII 脱敏、限流、认证、审计。
- 位置：管理台「权限安全」+ 管线自动生效；API `/api/security/*`。
- 界面规格：扫描测试台(输入→注入/PII/内容结果)+ 用户/API Key 管理 + 审计日志 + 熔断器状态。
- 操作：扫描测试/用户与 Key 管理/查审计/看熔断。
- 验收：能测试扫描；注入/PII 在对话管线中自动生效；API Key 认证生效。

### M15. 定时任务（schedule）
- 用途：按 cron 触发 Agent 任务。
- 位置：管理台「定时任务」；API `/api/admin/tasks`（cron）。
- 界面规格：任务列表(名称/cron/启停/上次运行)+ 新建(cron 表达式+动作)+ 立即运行。
- 操作：增删改/启停/立即运行。
- 验收：能建 cron 任务并启停。

### M16. 语音（voice）
- 用途：TTS 朗读 + STT 转写，支持语音对话。
- 位置：对话输入框麦克风按钮；API `/api/voice/*`。
- 界面规格：录音按钮(按住录制/取消/发送)+ 播放按钮(朗读回复)。
- 操作：录音转写/朗读。
- 验收：能录音转成文本发送；能朗读回复。

### M17. 对话交互细节（渲染 / 消息编辑 / 多模态 / 会话管理）
- **用途**：让对话体验达到 GPT/豆包级——消息渲染好看、可改、可追溯、可管理。
- **消息渲染**：Markdown 渲染 + **代码块高亮**（含复制按钮）+ 表格/列表 + **LaTeX 公式**（可选）+ 链接可点 + 长代码折叠。
- **消息操作**：每条消息 → 复制 / 点赞 / 点踩 / **重新生成** / **编辑并重发**（改已发送的消息→重新提问，GPT 有）/ 删除。
- **多模态附件**：输入框支持上传 图片/PDF/Word/Excel/音频 → 图片走多模态识别、文档走解析/RAG 注入；附件在输入框上方以 chips 展示、可移除。
- **输入体验**：多行输入 + Shift+Enter 换行 / Enter 发送、**@提及**（@某技能/知识库）、**斜杠命令**（`/skill`、`/search` 等）、emoji、字数/附件限制提示。
- **会话管理细节**：**标题自动生成**（首条消息后 AI 起标题）、置顶/归档/搜索（已支持）、未读/会话数、会话内 token 与成本显示（可选）。
- **分享/导出**：整段导出（Markdown/PDF）、分享链接（带只读/可编辑权限）。
- **验收**：Markdown/代码高亮正确渲染；能编辑消息重发；能传图/文档并生效；@和斜杠命令可用；标题自动生成。

### M18. 用户 / 账号 / 多租户（Auth & Multi-tenant）
- **用途**：多用户登录、角色权限、个人空间与团队隔离、用量按人计量。
- **位置**：登录页 / 顶部用户菜单；API `/api/admin/security/users|api_keys`（已有）+ 会话/user 关联。
- **功能**：注册/登录（账号密码或 API Key）、会话绑定用户、**角色**（admin/editor/viewer）、每个用户独立会话/工作区/配额、团队=多用户共享工作区。
- **界面规格**：登录页（账号/密码/记住我）；顶部头像菜单（个人设置/用量/退出）；管理台「权限安全」管理用户与角色。
- **验收**：能登录且会话/设置按用户隔离；不同角色权限不同；用户用量独立统计。

### M19. 外观主题 / 多语言 / 无障碍（UX & i18n）
- **用途**：不同用户偏好、不同地区语言、可访问性。
- **功能**：**深色/浅色主题**（跟随系统或手动，持久化）；字体大小可调；**多语言界面**（中/英，i18n，`/api/config` 返回 locale 或前端切换）；**无障碍**（键盘可达、焦点、对比度、ARIA，参照 deep-spec 无障碍检查）。
- **界面规格**：设置里主题/语言/字号；界面文案走 i18n 字典。
- **验收**：能切深色/浅色并记忆；能切语言；主要交互键盘可达。

### M20. 用量 / 限额 / 配额（Usage & Quota）
- **用途**：防止滥用、控制成本、给用户可预期额度。
- **功能**：按用户/工作区统计 tokens 与调用次数；**月度配额**（超出→降级或拦截并提示）；预算告警；用量明细可查（已有 `/api/admin/usage`）。
- **界面规格**：设置/个人中心显示"本月已用 X / 配额 Y"进度条；超限弹提示。
- **验收**：能统计用量；超配额能拦截/降级并提示；管理员能查全量明细。

### M21. 浏览器自动化 / 深度联网（Browser & Web Automation）
- **用途**：Agent 不只读网页，还能**操作**网页（填表单/点击/滚动/抓取动态页），解决"只读静态"的局限。
- **位置**：沙箱 chrome 环境 + 工具 `browser_navigate / browser_click / browser_type / browser_screenshot / browser_extract`；API `POST /api/sandbox/run`。
- **机制**：沙箱内起 headless 浏览器 → Agent 用工具逐步操作 → 每一步截图/提取可见文本回喂 LLM。
- **界面规格**：对话中工具调用卡片展示"正在浏览页面…"+ 截图预览；管理台沙箱 chrome 环境可启停。
- **验收**：能导航到 URL、提取正文、执行一次点击/填表单；动态页能拿到渲染后内容。

### M22. 多端同步 / 推送触达（Sync & Push）【扩展，可选】
- **用途**：会话/设置在多端一致，长任务完成推送到用户。
- **功能**：会话/偏好**端云同步**（以云端为准，冲突合并，参照 deep-spec 33）；**推送**：长任务/定时任务完成 → 站内通知（已支持）+ Web Push/邮件（可选，参照 deep-spec 36）。
- **验收**：跨端登录后会话一致；长任务完成有通知。

---

**统一验收原则**：任何模块若只做出"能看不能操作"的空壳 = 未完成。每个模块必须满足上述【验收】，且交互（增删改查/导入导出/AI 生成/命令调用）都要落到真实 API，禁止 mock 假数据。

---


### 深度工程规格（Deep Engineering Spec）——跨模块的底层深度

> 前面 M0–M16 是"每个模块怎么做"。这里补齐**贯穿所有模块的深度工程方面**——这些是一个生产级通用 Agent 的底层骨架，缺了就是"demo 而非产品"。同样按 用途/机制/落地/验收 写清。

### D1. 上下文与 Token 管理（Context & Token Budget）
- **用途**：长对话不爆 token、不丢关键信息，让 Agent 始终在预算内运转。
- **机制**：① Token 预算计费（`token_manager`，按模型计价）；② 超预算自动**压缩**（`l6_memory/summary` 摘要旧消息）+ **滑动窗口**（丢弃最旧非关键消息）；③ 关键信息抽取（user 目标/约束/结论单独沉淀到 state）；④ 上下文注入顺序（system → 计划 → 记忆 → 历史 → 当前输入）。
- **落地**：`ChatInterface` 在组消息时先估 token，超阈值触发 `summary.compress()` 并标记压缩点；`/api/chat` 返回 `usage` 与 `compressed` 标记；管理台「上下文」面板可视化 token 占用与压缩日志。
- **实现要点**：`estimate_tokens(text, model)` 按模型计价；`compress(history, budget)` 返回(压缩后消息, 摘要, 丢弃数)；state 增 `context_budget/compressed_rounds/key_facts[]`；阈值 `CONTEXT_BUDGET_RATIO=0.8`；边界——系统提示与刚发消息不压缩、摘要递归合并、关键约束入 `key_facts` 不丢。
- **验收**：连续对话 50 轮后 API 仍不超预算；能看到压缩历史；关键约束不被压缩丢失。

### D2. 工具调用工程（Tool-calling Engineering）
- **用途**：工具调用可靠、可并行、可恢复，而不是"调一次失败就崩"。
- **机制**：① 并行工具调用（一条消息多个 tool_call 同时执行）；② 参数校验（JSON Schema，`l5_tools/schemas`）；③ 失败分级（可重试 / 终态失败）+ 自动重试；④ 超时（`TOOL_TIMEOUT`）与熔断；⑤ 工具结果入 state 并回填给 LLM；⑥ 工具白名单/敏感工具需审批。
- **落地**：`tool_node` 并行执行 + `executor.py` 校验/超时/重试；`ToolRegistry` 支持并发注册与调用计数；管理台「工具试跑」返回 latency/error。
- **实现要点**：`execute_tool(name,args)` 用 `asyncio.gather` 并行；入参用 `jsonschema` 校验；异常分 `ToolRetryableError`/`ToolFatalError`；`asyncio.wait_for(..., TOOL_TIMEOUT)`；`SENSITIVE_TOOLS` 命中→`interrupt()` 审批；边界——结果超长截断 `MAX_TOOL_RESULT=8k`、单条失败不影响其余并行调用。
- **验收**：一条含 3 个并行 tool_call 的消息能并行执行并全部回填；参数错能给出可读错误；敏感工具触发审批。

### D3. 记忆工程（Memory Engineering）
- **用途**：把记忆做成**分层**（工作/情景/语义/程序），能检索、能合并、能遗忘，支撑跨会话连续性。
- **机制**：① 工作记忆 = 当前会话 buffer；② 情景记忆 = 已结束会话的可检索记录（`session_manager`）；③ 语义记忆 = 向量知识库（`vector_store`/`rag_engine`）；④ 程序记忆 = 学到的工作流/偏好（可写 `data/preferences.json`）；⑤ 检索路由：先语义召回 Top-K 再按相关性过滤；⑥ 遗忘策略：超期/低价值记录降权或清理。
- **落地**：`l6_memory` 分层类 + 统一 `MemoryRouter.retrieve(query)`；检索命中带 `source`（会话/知识库/偏好）与 `score`；管理台「记忆」按层查看与清理。
- **实现要点**：四层类 `WorkingMemory/EpisodicMemory/SemanticMemory/ProceduralMemory`；`MemoryRouter.retrieve(query)` = 语义召回 Top-K → `score>阈值` 过滤 → 注入 system；遗忘=TTL 超期或访问频率降权；边界——检索空回退关键词、注入过多按分裁剪、程序记忆写 `data/preferences.json`。
- **验收**：能按层查看记忆；跨会话能想起之前结论；能手动/自动清理过期记忆。

### D4. 规划工程（Planning Engineering）
- **用途**：复杂任务先拆解成可执行步骤，动态重规划，失败可恢复。
- **机制**：① 任务分解（`orchestrator/decomposer`：目标→子任务 DAG）；② 优先级排序与依赖；③ 顺序执行或并行（无依赖子任务并发）；④ 动态重规划（某步失败→重新拆解）；⑤ 计划进度状态机（pending/running/done/failed，落 `tasks`）。
- **落地**：`planner_node`（已内置）+ `decomposer` 拆 DAG；执行进度写 `/api/tasks`；管理台「任务」可视化 DAG 与进度。
- **实现要点**：`Decomposer.decompose(goal)->[Task]`（id/依赖/preconditions）；拓扑排序调度、无依赖子任务并发；`replan(failed_task)` 重新拆解；进度状态机落 `tasks`；边界——环依赖检测、拆解失败回退单步直跑。
- **验收**：复杂任务能自动拆解出有序步骤；某步失败能重规划；进度实时可查。

### D5. 反思与自愈（Reflection & Self-healing）
- **用途**：Agent 出错能自评、自修复、自收敛，而不是一次失败就结束。
- **机制**：① 反思（`reflect_node` 已内置：评价+修正）；② 错误分类（LLM/工具/输入/超时）→ 对应策略；③ 自动修复重试（修复后重跑，限 N 次）；④ 收敛判定（连续 M 次无改进则停，防死循环）。
- **落地**：agent 循环内接 reflect + 重试上限（`max_iterations`）；错误与修复轨迹写 `error`/`reflection` 到 state 并暴露给监控。
- **实现要点**：错误分类 `classify(err)->LLM|TOOL|INPUT|TIMEOUT`；`reflect(answer)` 返回(评价,修正)；修复循环 `for _ in range(max_fix): try run except: fix`；收敛判定 `no_improve_count>=M` 停；边界——修复不改 plan 的死循环保护、重试成本上限。
- **验收**：能识别并自动修复一类可修复错误；有重试上限不会死循环；修复轨迹可查。

### D6. 多智能体协作（Multi-Agent Collaboration）
- **用途**：多 Agent 分工、交接、结果合并，形成"团队"而非"多个单 Agent 堆叠"。
- **机制**：① 角色分工（supervisor 路由到 specialist，已实现）；② 交接（handoff：A 把上下文交给 B，返回控制权）；③ 共享状态（`state` 全局可见，各 Agent 增量更新）；④ 冲突处理（结果矛盾→协调 Agent 裁决）；⑤ 结果合并（`aggregator` 汇总各 specialist 输出）。
- **落地**：`supervisor` 图 + `aggregator`（已实现）；新增 handoff 节点；管理台「编排」可视化多 Agent 协作关系。
- **实现要点**：supervisor 路由（已实现）+ `handoff(target, ctx)` 交接节点；共享 state 用 reducer 合并冲突字段；`coordinator` 对矛盾结果裁决；`aggregator` 合并输出；边界——协作环/死锁检测、子任务整体超时。
- **验收**：多 Agent 能分工完成一个总任务；能交接上下文；最终输出是合并后的结果。

### D7. 安全与治理纵深（Security & Governance Depth）
- **用途**：纵深防御 + 可审计 + 可隔离，满足生产合规。
- **机制**：① 输入侧：注入检测（已接入）+ PII 脱敏（已接入）+ 内容过滤；② 工具侧：白名单/敏感命令审批（`code_execute` 高危检测）；③ 数据侧：落库脱敏、数据保留策略；④ 控制侧：限流、认证（API Key）、RBAC 角色；⑤ 审计：关键操作（建/删/发布/改权限）写审计日志；⑥ 熔断与降级。
- **落地**：`ai_security` + 中间件（认证/限流/日志）+ `/api/security/audit`；敏感工具调用需 `agent_node_with_human` 审批。
- **实现要点**：`detect_injection/redact_pii/content_filter`（已接入 ChatInterface）；`SENSITIVE_TOOLS` + `interrupt()` 审批；落库前对敏感字段脱敏；`audit(action,user,ts,detail)` 写审计、不可篡改；RBAC 角色→权限映射；边界——脱敏不可逆需提示、审计保留策略。
- **验收**：注入/PII 在管线自动生效；敏感工具可触发审批；关键操作有审计记录；能按角色限权。

### D8. 可靠性与容错（Reliability & Fault-tolerance）
- **用途**：网络抖动、模型抽风、超时不至于让整个 Agent 挂掉。
- **机制**：① 重试（指数退避，`retry.py`）；② 熔断（`circuit_breaker`：连续失败→开闸→半开）；③ 超时（LLM/工具/HTTP 全链超时）；④ 降级（主模型失败→回退链/缓存兜底）；⑤ 幂等（任务/工具调用去重）；⑥ 并发控制（限制并发会话/工具数）。
- **落地**：`retry` + `circuit_breaker` + `TOOL_TIMEOUT` + 回退链；管理台「监控」展示熔断/降级状态。
- **实现要点**：`RetryHandler` 指数退避（已实现）；熔断状态机 `CLOSED→OPEN(连续N失败)→HALF_OPEN(放行探测)`；全链 `timeout`；主模型失败走 `FallbackChain`/缓存兜底；`idempotency_key` 幂等；并发用 `Semaphore`；边界——熔断期间快速失败不阻塞调用方。
- **验收**：断网重试能恢复；连续失败能熔断；超时能优雅失败而非卡死。

### D9. 可观测性纵深（Observability Depth）
- **用途**：一次请求从头到尾可追踪、可定位、可复盘。
- **机制**：① 请求 ID 贯穿（`request_id`）；② 端到端 Trace（请求→节点→工具→LLM，含耗时/输入输出摘要）；③ 指标（延迟/错误率/token/成本，Prometheus）；④ 结构化日志（`StructuredLogger`）；⑤ 告警规则与历史；⑥ 漂移检测（输入分布/表现变化）。
- **落地**：中间件生成 request_id；`/api/admin/traces|logs|metrics|drift`；监控面板可视化。
- **实现要点**：中间件生成 `request_id` 注入每个 span；Trace 结构 `{request_id,parent,node,tool,llm,start,end,duration}`；指标经 Prometheus；`StructuredLogger` 结构化日志；告警规则 CRUD + 历史；`drift_detect` 比较输入分布/表现；边界——trace 采样率、日志自动脱敏。
- **验收**：能按 request_id 查一次完整链路；能看指标曲线；能配告警并查历史。

### D10. 评估与质量（Evaluation & Quality）
- **用途**：改一处不回归，用数据说话，而非"感觉变好了"。
- **机制**：① 数据集管理（用例：输入/期望/标签）；② 批量跑分（`scripts/evaluate.py`）；③ 回归对比（基线 vs 新版本，`pass_rate` 差异）；④ 分维度评分（准确/安全/延迟）；⑤ A/B 与阈值判定；⑥ 红队用例（注入/越狱）。
- **落地**：`eval/` + `/api/admin/evaluations*`；管理台「评估」出报告并可对比历史。
- **实现要点**：数据集 CRUD（case={input,expected,labels}）；`evaluate(dataset, agent_version)` 批量跑分；回归 `diff_pass_rate(base,new)`；分维度（准确/安全/延迟）评分；A/B 流量对照；内置红队用例集（注入/越狱）；边界——无 key 时离线 mock、失败用例出明细。
- **验收**：能跑数据集出报告；能对比两版本通过率；红队用例能防住注入。

### D11. 部署与运维（Deployment & Ops）
- **用途**：一键部署、可配置、可备份恢复、可平滑升级。
- **机制**：① Docker 化（`Dockerfile`/`docker-compose`）；② 配置管理（`.env` + pydantic-settings）；③ 密钥管理（不落代码，从 env/secret 读）；④ 健康检查（`/api/health`）；⑤ 优雅关闭（lifespan）；⑥ 备份/恢复（`/api/admin/backup`）；⑦ 多环境（dev/prod 配置覆盖）。
- **落地**：`docker-compose up --build` 一键起；`/api/health` 就绪探针；备份导出/恢复。
- **实现要点**：`Dockerfile` 多阶段构建；配置 env 覆盖默认；密钥仅从 env/secret 读、不入库不落代码；`/api/health` 返回 ready + 各依赖状态；lifespan 优雅关闭等进行中请求；`/api/admin/backup` 导出全量 JSON、restore 前校验；边界——备份带版本、恢复先回滚点。
- **验收**：能一键起服务；健康检查通过；能导出备份并恢复。

### D12. 性能与扩展（Performance & Extensibility）
- **用途**：并发高、检索快、能插拔扩展。
- **机制**：① 缓存（LLM 响应/向量索引/结果去重）；② 异步/并发（asyncio + 限制并发）；③ 向量索引优化（索引类型/分片，`vector_store`）；④ 插件/SDK（`plugin_manager`/`skill_loader` 动态加载）；⑤ 模板市场（`/api/admin/agents/templates`）；⑥ 技能市场（导入导出共享）。
- **落地**：`mcp_client`/`plugin_manager` 动态加载；`cache` 可选；管理台「工具/技能」导入导出。
- **实现要点**：缓存 key=(model+messages哈希) 带 TTL；`asyncio` 并发 + `Semaphore` 限流；向量索引 HNSW/分片；`plugin_manager/skill_loader` 用 `importlib` 动态加载；模板/技能市场 CRUD；边界——缓存一致性、索引内存上限、插件版本隔离。
- **验收**：能并发处理多个会话不崩；能动态加载插件/技能；检索在大知识库下延迟可接受。

---

**统一深度验收原则**：以上 D1–D12 任一深度方面若只是"留了口子没实现"= 未达标。生产级 Agent 必须让每一项都有可运行代码 + 管理界面入口 + 数据可见，而非空接口。

---


## Part 4 · 构建实施（五步照做 + 用法示例）

### 2. 生成步骤（不询问，直接按默认值执行）

```
1) 写 agent.yaml（用默认值表；tools.enabled 每个名字必须在本 Skill 通用工具集或 tools.custom 中）
2) python scripts/generate.py <agent.yaml> <out> --framework=langgraph   # 零依赖则 --framework=bare
3) 验证：import app.main + pytest + 前端 build
4) 交付运行说明（填 .env → 起后端 → 起前端）
```

### 3. 验证即交付（对照"生成产物完整性清单"逐项勾选，全部 ✅ 才算完成）

---


### Step 1: Discovery

**Goal**: Through conversation, understand the Agent the user wants and produce a structured requirements document `agent_requirements.md`.

**AI behavior**: You need to act like a product manager, gradually uncovering user needs through dialogue. **Do not throw all the questions at the user at once**. Instead, follow the order below, asking 1–2 questions at a time and waiting for the user's answer before continuing.

#### Conversation Opener

```
AI: Hello! I'm here to help you build an AI Agent. First, could you describe in one sentence what you want this Agent to do?
User: I want a research assistant that helps me search and analyze information.

AI: Great! Let's pin down the requirements step by step.
```

#### 1.1 Core Functionality (Ask This First)

| Question | Options | Record Field |
|----------|---------|--------------|
| What does your Agent mainly do? | Free description | `purpose` |
| Which type does it belong to? | Chat assistant / Research assistant / Coding assistant / Customer service / Data analysis / Custom | `agent_type` |

**AI dialogue example**:
```
AI: What problem does your Agent mainly solve? Could you describe the use case specifically?
User: I need a research assistant that can search the web, summarize content, and save notes.

AI: Got it — this falls under the "research assistant" type. Next, let me ask about the technical details.
```

#### 1.2 Technology Selection (Ask This Next)

| Question | Options | Record Field |
|----------|---------|--------------|
| Which LLM do you want to use? | OpenAI / Anthropic / DeepSeek / Ollama / Hybrid | `llm_provider` |
| Which specific model? | GPT-4o / Claude-3.5 / DeepSeek-V3 / Custom | `llm_model` |
| Do you need local deployment? | Yes / No | `local_deploy` |

**AI dialogue example**:
```
AI: Which LLM do you prefer? For overall capability I recommend GPT-4o, for coding I recommend Claude-3.5,
for cost-effectiveness I recommend DeepSeek-V3, and for local deployment you can use Ollama.
User: Let's go with GPT-4o.

AI: Sounds good. Do you need local deployment? If not, we'll use the cloud API.
User: No local deployment needed.
```

#### 1.3 Tool Requirements

| Question | Options | Record Field |
|----------|---------|--------------|
| Do you need web search? | Yes / No | `tools.web_search` |
| Do you need file read/write? | Yes / No | `tools.file_ops` |
| Do you need code execution? | Yes / No | `tools.code_exec` |
| Do you need custom tools? | Yes / No → describe | `tools.custom` |

#### 1.4 Memory & Knowledge

| Question | Options | Record Field |
|----------|---------|--------------|
| Do you need conversation history? | Short-term (current session) / Long-term (cross-session) / Not needed | `memory.type` |
| Do you need to upload knowledge documents? | Yes / No | `knowledge.enabled` |

#### 1.5 Multi-Agent & Orchestration

| Question | Options | Record Field |
|----------|---------|--------------|
| Do you need multiple Agents to collaborate? | Single Agent / Multi-Agent | `orchestration.mode` |

#### 1.6 Interface & Deployment

| Question | Options | Record Field |
|----------|---------|--------------|
| What interface do you need? | Chat window / Dashboard / Admin console / Minimal | `ui.type` |
| Deployment method? | Docker / Cloud service / Local direct run | `deployment.type` |

#### Output: `agent_requirements.md`

After collecting all the information, generate `agent_requirements.md`:

```markdown
### Agent Requirements Document

### Basic Information
- **Name**: ResearchAssistant
- **Type**: research
- **Purpose**: A web search research assistant that can search, summarize, and save notes

### Technology Selection
- **LLM Provider**: openai
- **LLM Model**: gpt-4o
- **Local Deployment**: No

### Tools
- web_search: Web search
- web_fetch: Web fetching
- current_time: Get current time
- calculate: Math calculation
- save_note: Save notes (custom)

### Memory & Knowledge
- **Memory Type**: buffer
- **Knowledge Base**: None

### Orchestration
- **Mode**: single

### Interface
- **UI Type**: chat
- **Deployment Method**: docker
```

---


### Step 2: Architecture Design

**Goal**: Based on the requirements document, select an architecture template and determine the configuration of each layer.

**AI behavior**: According to the `agent_type` in the requirements document, select the corresponding architecture template and explain the choice to the user.

#### 2.1 Agent Type Decision Tree

```
User Requirements
    │
    ├── General conversation, simple Q&A → Template A: Chat Assistant (chat)
    │
    ├── Search, summarize, research → Template B: Research Assistant (research)
    │
    ├── Write code, debug, review → Template C: Coding Assistant (coding)
    │
    ├── Multi-Agent division of labor → Template D: Customer Service (customer_service)
    │
    ├── Data analysis, charts → Template E: Data Analysis (data_analysis)
    │
    └── Other special needs → Freely combine layers
```

**AI dialogue example**:
```
AI: Based on your requirements, I recommend the "Research Assistant" template. This template comes pre-configured with:
- Search and web fetch tools
- Prompt templates suited for research scenarios
- Conversation memory management

Does this direction look right to you, or would you like to adjust anything?
```

#### 2.2 Per-Layer Configuration Confirmation

Based on the requirements document, confirm the configuration layer by layer. **AI behavior**: Do not list all layers at once; confirm them in order of importance:

```
Confirmation order: L1 (Model) → L5 (Tools) → L4 (Single/Multi-Agent) → L3 (Prompts) → L6 (Memory) → L9 (UI) → L10 (Deployment)
```

When confirming each layer, **AI behavior**:
1. Explain to the user what this layer does
2. Provide the recommended configuration
3. Let the user confirm or modify

**Example**:
```
AI: Next, let's determine the L1 LLM layer. You chose GPT-4o — are the default temperature and max tokens
(0.7 and 4096) okay? These parameters affect the creativity and length of responses.
User: That's fine.
```

#### 2.3 Architecture Document Output

Generate `architecture.md`:

```markdown
### Architecture Design Document

### Architecture Blueprint
Research Assistant — Single Agent

### Per-Layer Configuration

### L1 LLM Layer
- Provider: openai
- Model: gpt-4o
- Temperature: 0.7
- Max Tokens: 4096

### L2 Model Interface Layer
- Retry: Enabled (max 3 times, 1 second delay)
- Model Fallback: Disabled

### L3 Prompt Engineering Layer
- Role Template: research_assistant
- Output Format: markdown
- Custom System Prompt: Set

### L4 Agent Framework Layer
- Graph Type: single (single Agent)
- Max Iterations: 10
- Checkpointer: memory

### L5 Tool Execution Layer
- Base Tools: web_search, web_fetch, current_time, calculate
- Custom Tools: save_note (save research notes)

### L6 Memory & Knowledge Layer
- Memory Type: buffer
- Max Messages: 50
- Knowledge Base: None

### L7 Orchestration Layer
- Mode: single
- Max Subtasks: 5

### L8 API Service Layer
- Endpoints: /api/chat, /api/health, /api/sessions
- Auth: None
- Rate Limit: 60 requests/minute

### L9 Frontend UI Layer
- Components: ChatWindow, Sidebar, Header
- Features: Tool call visualization, multi-session management, Markdown rendering

### L10 Infrastructure Layer
- Deployment: docker
- Log Level: INFO
```

---


### Step 3: Config Generation

**Goal**: Based on the architecture design, generate the `agent.yaml` configuration file.

**AI behavior**:
1. Generate `agent.yaml` based on the architecture document
2. Show the user the key configuration items
3. Let the user confirm before continuing

```yaml
### ============================================================
### agent.yaml - Complete Agent configuration (single source of truth)
### All code generation is based on this configuration
### ============================================================

### Agent basic information
agent:
  name: "ResearchAssistant"
  type: "research"
  description: "A web search research assistant that can search the web, summarize content, and save notes"

### L1: LLM Layer
llm:
  provider: "openai"           # openai | anthropic | deepseek | ollama
  model: "gpt-4o"
  api_base: ""                 # Optional, for third-party services compatible with the OpenAI format
  temperature: 0.7
  max_tokens: 4096

### L2: Model Interface Layer
interface:
  retry:
    enabled: true
    max_retries: 3
    delay: 1.0
  fallback:
    enabled: false
    models: []

### L3: Prompt Engineering Layer
prompt:
  system_prompt: |
    你是一个专业的研究助手。你的任务是：
    1. 理解用户的问题
    2. 搜索相关信息
    3. 总结和分析结果
    4. 给出有深度、有来源的回答
  role_template: "research_assistant"
  output_format: "markdown"

### L4: Agent Framework Layer
agent_framework:
  graph_type: "single"         # single | multi | supervisor
  max_iterations: 10
  checkpointer: "memory"       # memory | postgres | none

### L5: Tool Execution Layer
tools:
  enabled:
    - web_search
    - web_fetch
    - current_time
    - calculate
  custom:
    - name: "save_note"
      description: "Save research notes to a local file"
      parameters:
        title: { type: "string", description: "Note title" }
        content: { type: "string", description: "Note content" }

### L6: Memory & Knowledge Layer
memory:
  type: "buffer"               # buffer | vector | both
  max_messages: 50
  knowledge:
    enabled: false
    vector_store: "chroma"

### L7: Orchestration Layer
orchestration:
  mode: "single"               # single | multi
  max_subtasks: 5
  timeout: 120

### L8: API Service Layer
api:
  auth_enabled: false
  rate_limit: 60
  cors_origins:
    - "http://localhost:5173"
    - "http://localhost:3000"

### L9: Frontend UI Layer
ui:
  type: "chat"                 # chat | dashboard | minimal
  title: "Research Assistant"
  features:
    - tool_visualization
    - session_management
    - markdown_rendering

### L10: Infrastructure Layer
deployment:
  type: "docker"               # docker | local
  log_level: "INFO"
  debug: false
```

**AI dialogue example**:
```
AI: The configuration has been generated. Here are the key settings:
- Model: GPT-4o
- Tools: Search, web fetch, calculate, save notes
- Architecture: Single Agent
- UI: Chat window
- Deployment: Docker

Please confirm whether to generate code based on this configuration, or do you need to adjust anything?
```

**agent.yaml 字段字典（AI 写配置用，避免靠猜）**：
| 字段 | 含义 | 默认值 | 示例 / 说明 |
|---|---|---|---|
| `agent.name` | 应用名 | `Agent` | 用于标题/日志 |
| `agent.type` | 用途类型 | `chat` | `chat/coding/research/customer_service/data_analysis/...` |
| `llm.provider` | 提供商 | `openai` | `openai/anthropic/deepseek/gemini/glm/kimi/ollama/qwen` |
| `llm.model` | 模型名 | `gpt-4o` | `claude-sonnet-4-.../deepseek-chat/qwen-max` |
| `llm.temperature / max_tokens` | 采样温度 / 上限 | `0.7 / 4096` | — |
| `interface.stream_mode` | 流式模式 | `messages` | 对话默认流式 |
| `interface.retry.max_retries` | 重试次数 | `3` | 指数退避 |
| `prompt.system_prompt` | 系统提示词 | 通用助手 | 决定人设 |
| `agent_framework.name` | 运行时框架 | `langgraph` | 零依赖用 `bare` |
| `agent_framework.graph_type` | 图类型 | `single` | 多智能体用 `supervisor` |
| `agent_framework.plan / reflect` | 规划 / 反思 | `false` | 需要思考链置 `true` |
| `tools.enabled` | 启用工具 | 4 个通用工具 | 名字必须在通用工具集或 custom 中（否则 NameError） |
| `tools.custom` | 自定义工具 | `[]` | `{name,description,parameters}` |
| `memory.type / max_messages` | 记忆类型 / 条数 | `buffer / 50` | 知识库用 `rag` |
| `orchestration.mode` | 编排 | `single` | 客服/协作用 `supervisor` + `agents[]` |
| `api.auth_enabled` | API 认证 | `false` | 开则需 API Key |
| `api.cors_origins` | 跨域白名单 | `[http://localhost:5173]` | 前端地址 |
| `deployment.*` | 部署 | Docker/uvicorn | `.env` 配密钥 |
| `security.SECURITY_ENABLED` | 安全强制 | `true` | 注入防御 + PII 脱敏 |

---


### Step 4: Code Generation

**Goal**: Based on the `agent.yaml` configuration, generate the complete code layer by layer.

**AI behavior**:
1. Run the `scripts/generate.py` script to generate the code
2. Or manually generate the code layer by layer (in L1 → L10 order)
3. After generating each layer, verify the correctness of that layer's code
4. Finally produce a complete project directory

#### L1–L10 代码落地地图（构建者照着写）

> 每一层要产出哪些文件、关键函数、怎么验证。**templates/backend/app/** 是参考答案（照着/参考写都行）。按 L1→L10 顺序产出。

| 层 | 产出文件（`app/` 下） | 关键函数/类 | 怎么验证 |
|---|---|---|---|
| L1 LLM | `l1_llm/factory.py` + `l1_llm/*_adapter.py` | `create_llm(provider,model,...)`；每提供商一个 adapter 实现 `LLMAdapter` | `from app.l1_llm.factory import create_llm` 可导入 |
| L2 接口 | `l2_interface/chat_interface.py` + `retry.py` + `streaming.py` | `ChatInterface.chat/chat_stream`；`RetryHandler`（注入防御+PII 脱敏已内嵌） | pytest 覆盖 chat/stream |
| L3 提示词 | `l3_prompt/system_prompts.py` + `prompt_builder.py` + `output_parsers.py` | `DEFAULT_SYSTEM_PROMPT`；`PromptBuilder.build()` | 生成物含 system prompt |
| L4 Agent | `l4_agent/graph.py` + `state.py` + `nodes.py` + `adapters/` | `get_graph()/get_graph_config()`；`agent_node/tool_node`；可选 `planner/reflect_node` | `import app.main` + 图可编译 |
| L5 工具 | `l5_tools/base_tools.py` + `custom_tools.py` + `registry.py` + `executor.py` + `mcp_*.py` | `BASE_TOOLS/CUSTOM_TOOLS`；`ToolRegistry.execute` | `BASE_TOOLS` 无未定义符号；工具可试跑 |
| L6 记忆 | `l6_memory/buffer.py` + `vector_store.py` + `rag_engine.py` + `retrieval.py` + `session_manager.py` | `RAGEngine.retrieve`；`MemoryRouter`；`session_manager` | RAG 检索返回带引用 |
| L7 编排 | `l7_orchestrator/supervisor.py` + `decomposer.py` + `workflow.py` + `a2a_*.py` | `build_supervisor_graph`；`aggregator` | supervisor 图可编译 |
| L8 API | `l8_api/routes/*.py` + `schemas.py` + `main.py` | 全量路由（见 Part 5 API 一览）；`POST /api/chat` 支持 `mode` | 每个 `/api/*` 可达 |
| L9 前端 | `frontend/src/**` | Chat / Admin / Workspace 三视图 + 对话模式开关 | `npm run build` 通过 |
| L10 基建 | `l10_infra/config.py` + `logging.py` + `monitoring.py` + `ai_security.py` + `usage.py` + `docker-compose.yml` | `Settings`；`SECURITY_ENABLED`；`/metrics` | 服务能启动、健康检查通过 |

**产出顺序与自检**：每完成一层跑一次对应验证（import / 单测 / build），不要全部写完再一起查——否则出错难定位。

#### Using the Generation Script (Recommended)

```bash
### Syntax: python scripts/generate.py <config.yaml> <output_dir>
python scripts/generate.py agent.yaml ./generated_agent
```

#### Manual Generation Strategy

If the auto-generation script is unavailable, generate layer by layer in L1 → L10 order. Generation rules per layer:

| Layer | Config Source | Generation Target | Key Operations |
|-------|---------------|-------------------|----------------|
| L1 | `llm.*` | `app/l1_llm/factory.py` | Keep only the configured provider adapter |
| L2 | `interface.*` | `app/l2_interface/chat_interface.py` | Configure retry and fallback strategies |
| L3 | `prompt.*` | `app/l3_prompt/system_prompts.py` | Inject system prompts and role templates |
| L4 | `agent_framework.*` | `app/l4_agent/graph.py` | Single Agent or multi-Agent graph |
| L5 | `tools.*` | `app/l5_tools/` | Register only enabled tools |
| L6 | `memory.*` | `app/l6_memory/` | Configure memory type |
| L7 | `orchestration.*` | `app/l7_orchestrator/` | Single/multi-Agent orchestration |
| L8 | `api.*` | `app/l8_api/routes/` | Generate API routes |
| L9 | `ui.*` | `frontend/src/` | Dynamically render UI components |
| L10 | `deployment.*` | `docker-compose.yml`, `.env` | Deployment configuration |

#### Generated Project Structure

```
generated_agent/
├── agent.yaml                    # Configuration file (single source of truth)
├── agent_requirements.md         # Requirements document
├── architecture.md               # Architecture document
├── .env.example                  # Environment variable template
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Backend image
├── requirements.txt              # Python dependencies
├── app/
│   ├── main.py                   # Application entry (L8+L10)
│   ├── l1_llm/                   # LLM Layer
│   │   ├── __init__.py
│   │   ├── base.py               # Abstract base class
│   │   ├── openai_adapter.py     # Only keep the configured provider
│   │   └── factory.py            # Factory method
│   ├── l2_interface/             # Model Interface Layer
│   │   ├── __init__.py
│   │   ├── chat_interface.py     # Unified chat interface
│   │   ├── streaming.py          # Streaming handling
│   │   └── retry.py              # Retry strategy
│   ├── l3_prompt/                # Prompt Engineering Layer
│   │   ├── __init__.py
│   │   ├── system_prompts.py     # System prompts (injected from config)
│   │   ├── prompt_builder.py     # Prompt builder
│   │   └── output_parsers.py     # Output parsers
│   ├── l4_agent/                 # Agent Framework Layer
│   │   ├── __init__.py
│   │   ├── state.py              # Agent state definition
│   │   ├── graph.py              # Graph construction (single/multi-Agent)
│   │   ├── nodes.py              # Node logic
│   │   └── router.py             # Routing decisions
│   ├── l5_tools/                 # Tool Execution Layer
│   │   ├── __init__.py
│   │   ├── registry.py           # Tool registry
│   │   ├── base_tools.py         # Base tool implementations
│   │   └── custom_tools.py       # Custom tool implementations
│   ├── l6_memory/                # Memory & Knowledge Layer
│   │   ├── __init__.py
│   │   ├── buffer.py             # Conversation buffer
│   │   ├── session_manager.py    # Session management
│   │   └── vector_store.py       # Vector store (optional)
│   ├── l7_orchestrator/          # Orchestration Layer
│   │   ├── __init__.py
│   │   ├── base.py               # Orchestrator base class
│   │   ├── orchestrator.py       # Orchestrator
│   │   └── aggregator.py         # Result aggregation
│   └── l8_api/                   # API Service Layer
│       ├── __init__.py
│       ├── schemas.py            # Data models
│       ├── routes/
│       │   ├── chat.py           # Chat endpoint
│       │   └── health.py         # Health check
│       └── middleware/
│           └── auth.py           # Authentication (optional)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # Root component (dynamic rendering)
│       ├── l8_api/
│       │   └── api.ts            # API client
│       ├── l9_ui/
│       │   ├── chat/
│       │   │   ├── ChatWindow.tsx
│       │   │   ├── ChatInput.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   └── ToolCall.tsx
│       │   └── layout/
│       │       ├── Header.tsx
│       │       └── Sidebar.tsx
│       ├── types/
│       │   └── index.ts
│       └── styles/
│           └── index.css
└── scripts/
    ├── start.sh                  # Start script
    └── run.sh                    # One-click run
```

#### Verification Checklist

After generating each layer, check:

- [ ] L1: Adapter code is correct; the factory method supports the configured provider
- [ ] L2: Interface layer has the correct retry and fallback strategies configured
- [ ] L3: System prompt injected; role template set
- [ ] L4: Graph structure is correct (single-Agent / multi-Agent)
- [ ] L5: Tools registered per config; custom tools implemented
- [ ] L6: Memory type configured
- [ ] L7: Orchestration mode configured
- [ ] L8: API routes registered; authentication configured
- [ ] L9: Frontend components rendered per feature config
- [ ] L10: Deployment config complete; environment variables correct

---


### Step 5: Deployment & Verification

**Goal**: Ensure the generated code runs correctly.

**AI behavior**:
1. Guide the user to configure environment variables
2. Start the backend and frontend
3. Verify basic functionality
4. If using Docker, verify the Docker deployment

#### 5.1 Environment Configuration

```bash
cd generated_agent

### Copy the environment variable template
cp .env.example .env

### Edit .env and fill in the LLM API Key
### OPENAI_API_KEY=sk-...
```

**AI dialogue example**:
```
AI: The code has been generated! Now let's deploy. First, please fill in your API Key in the .env file.
If you're using OpenAI, you need to set OPENAI_API_KEY.
```

#### 5.2 Start the Backend

```bash
### Install dependencies
cd generated_agent
pip install -r requirements.txt

### Start the backend
uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/health`

#### 5.3 Start the Frontend

```bash
cd generated_agent/frontend
npm install
npm run dev
```

Verify: Open `http://localhost:5173` in the browser

#### 5.4 Docker Deployment

```bash
cd generated_agent
docker-compose up --build
```

Verify: `http://localhost:5173` + `http://localhost:8000/docs`

#### 5.5 Functional Testing

- [ ] Sending a message returns a reply
- [ ] Streaming output works correctly
- [ ] Tool calls execute correctly
- [ ] Multi-session switching works
- [ ] Error handling shows friendly messages

---


### Usage Examples

### Example 1: Research Assistant

```
User description: I need a research assistant that can search the web, summarize content, and save notes
```

**Step 1 - Requirements record**:
```markdown
- Type: research
- LLM: GPT-4o
- Tools: Search + web fetch + save notes
- Memory: Conversation buffer
- UI: Chat window
```

**Step 2 - Template selection**: Template B (Research)

**Step 3 - Config generation**: Generate `agent.yaml` (research assistant config)

**Step 4 - Code generation**: Generate code for each layer

**Step 5 - Deployment verification**: docker-compose up

---

### Example 2: Data Analysis Agent

```
User description: Help me build a data analysis Agent that can upload CSV files, analyze data, and generate charts
```

**Step 1 - Requirements record**:
```markdown
- Type: data_analysis
- LLM: Claude 3.5 Sonnet
- Tools: CSV read + data analysis + chart generation
- Memory: Conversation buffer + file cache
- UI: Chat window + file upload + chart display
```

**Step 2 - Template selection**: Template E (Data Analysis)

**Step 3 - Config generation**: Generate `agent.yaml`

**Step 4 - Code generation**: Generate code for each layer; L9 frontend adds file upload and chart panel

**Step 5 - Deployment verification**: docker-compose up

---

### Example 3: Multi-Agent Customer Service System

```
User description: Build a customer service Agent that first classifies the question, then routes to different specialist Agents, and finally summarizes the answer
```

**Step 1 - Requirements record**:
```markdown
- Type: customer_service
- LLM: GPT-4o (supervisor) + GPT-4o-mini (sub-Agents)
- Tools: Order query, refund handling, product consultation
- Memory: Conversation buffer + customer history
- Orchestration: Multi-Agent (supervisor + routing + aggregation)
- UI: Chat window + ticket status
```

**Step 2 - Template selection**: Template D (Customer Service)

**Step 3 - Config generation**: Generate `agent.yaml`, defining 5 sub-Agents

**Step 4 - Code generation**: Generate code for each layer; L4 uses a multi-Agent graph

**Step 5 - Deployment verification**: docker-compose up

## Part 5 · 协议与技术（A2A / MCP / 调用链 / 技术栈 / 生成映射）

### API 端点一览（按模块汇总，后端 `app/l8_api/routes/`）
| 模块 | 端点 |
|---|---|
| 健康/配置 | `GET /api/health` · `GET/PUT /api/config` |
| 对话 | `POST /api/chat`(流式/non，`mode`开关) · `POST /api/chat/reset` |
| 会话 | `GET/POST /api/sessions` · `PUT/DELETE /api/sessions/{id}` · `groups/share/export/files` |
| 工具/MCP | `GET /api/tools*` · `POST /api/tools/mcp/connect|disconnect` · `GET /api/mcp/tools|status` |
| 沙箱 | `GET/POST/PUT/DELETE /api/sandbox/envs` · `POST /api/sandbox/run` · `envs/{id}/enable` |
| 任务 | `GET/POST /api/tasks` · `{id}/start|progress|complete|fail|retry|cancel|DELETE` |
| 工作区 | `GET/POST /api/workspaces` · `PUT/DELETE {id}` · `{id}/members` |
| 能力库 | `GET /api/skills` · `GET/POST /api/skills` · `PUT/DELETE /api/skills/{kind}/{id}` |
| 通知 | `GET /api/notifications` · `unread_count/read/read_all/DELETE` · `WS /api/notifications/ws` |
| 画布 | `GET/POST /api/canvas` · `GET/PUT/DELETE {id}` |
| 记忆/知识库 | `GET/POST /api/admin/memory*` · `kbs/documents/query` |
| 编排 | `GET/POST /api/admin/workflows*` |
| A2A | `GET/POST /api/a2a*` · `/a2a/rpc` · `/.well-known/agent.json` |
| 语音 | `POST /api/voice/transcribe` · `GET /api/voice/speak` |
| NLP | `POST /api/nlp/keywords|analyze|summary|validate|retrieve` |
| 安全 | `POST /api/security/scan|redact` · `GET /api/security/breakers|audit` |
| 管理(admin) | `prompts/models/tools/agents/memory/workflows/evaluations/metrics/alerts/settings/usage/backup/tasks/security/users|api_keys|audit/a2a/logs/traces/drift` |
| 指标 | `GET /metrics`(Prometheus) |
| 定时 | `/api/admin/tasks`(cron) |


### A2A Protocol (Agent-to-Agent)

The A2A (Agent-to-Agent) protocol proposed by Google (Apr 2025) has become an industry standard alongside MCP. The relationship between the two:

> **MCP gives your Agent hands; A2A gives your Agent colleagues.**

- **MCP** = Agent-to-Tool communication (vertical layer: Agent calls tools)
- **A2A** = Agent-to-Agent communication (horizontal layer: Agents collaborate with each other)

A2A has received support from 150+ organizations, with 22,000+ GitHub stars.

### Three Core Primitives

| Primitive | Description | Key Fields |
|-----------|-------------|------------|
| **Agent Card** | Agent capability declaration, located at `/.well-known/agent.json` | `name`, `description`, `capabilities`, `skills`, `endpoints` |
| **Task** | Task lifecycle management | `id`, `status` (submitted→working→input-required→completed/failed/canceled), `input`, `output` |
| **Artifact** | Task products (files, text, structured data) | `id`, `type`, `content`, `metadata` |

### Communication Methods

- **Short tasks**: JSON-RPC 2.0 over HTTPS, synchronous request-response
- **Long tasks**: SSE streaming push, real-time task status updates
- **Multi-turn interaction**: The `input-required` status allows an Agent to ask the requester for more information

### Agent Card Example

```json
{
  "name": "ResearchAssistant",
  "description": "Web search research assistant",
  "capabilities": ["web_search", "summarization", "note_taking"],
  "skills": [
    {
      "id": "research",
      "name": "Information Research",
      "description": "Search and summarize web information",
      "input": { "type": "text", "description": "Research topic" },
      "output": { "type": "markdown", "description": "Research report" }
    }
  ],
  "endpoints": {
    "base_url": "https://assistant.example.com",
    "task_submit": "/a2a/task",
    "task_stream": "/a2a/task/stream"
  }
}
```

### Relationship to the Architecture

In the 10-layer architecture, A2A spans the **L7 Orchestration Layer** and the **L8 API Service Layer**:

- An Agent exposes its own capabilities via `/.well-known/agent.json` (L8)
- The orchestrator delegates subtasks to other Agents via the A2A Task protocol (L7)
- Supports cross-framework communication: LangGraph Agent ↔ Claude Agent SDK Agent ↔ OpenAI Agents SDK Agent

---


### MCP Protocol Update (2026-07-28 Stateless Spec)

MCP (Model Context Protocol) was upgraded to a **stateless protocol** on 2026-07-28, no longer using bidirectional handshakes and stateful sessions.

### Key Changes

| Old Protocol (Stateful) | New Protocol (Stateless 2026-07-28) |
|-------------------------|-------------------------------------|
| `initialize` / `initialized` handshake | No handshake needed; each request is self-describing |
| `Mcp-Session-Id` header | Removed |
| Duplex connection, server push | Pure request-response, Header routing |
| Implicit session state | `_meta` passed explicitly in requests (protocol version, identity, capabilities) |
| Not cacheable | List results cacheable (with `cache_hint`) |

### New Protocol Characteristics

- **Self-describing requests**: Each request carries `protocol_version`, `client_id`, and `capabilities` in `_meta`
- **Header routing**: `Mcp-Method` and `Mcp-Name` HTTP headers replace method name encoding
- **Cacheable lists**: List responses include `cache_hint` (TTL suggestion), and clients can cache them
- **server/discover**: New RPC for optional capability discovery
- **MRTR** (Multi Round-Trip Requests): Supports multi-round communication from server to client

### Server Code Example (FastMCP)

```python
from mcp.server.fastmcp import FastMCP

### Create MCP server (stateless, no handshake needed)
mcp = FastMCP("ResearchAssistant", version="1.0.0")

@mcp.tool()
async def web_search(query: str) -> str:
    """Search web information"""
    # Tool implementation...
    return f"Search results: {query}"

@mcp.tool()
async def save_note(title: str, content: str) -> str:
    """Save a note"""
    with open(f"notes/{title}.md", "w", encoding="utf-8") as f:
        f.write(content)
    return f"Note saved: {title}.md"

### Start MCP service (stdio or HTTP)
if __name__ == "__main__":
    mcp.run(transport="stdio")
    # Or HTTP mode:
    # mcp.run(transport="http", host="0.0.0.0", port=8001)
```

---


### Complete Call Chain

The complete call chain from user input to final output, running through all 10 layers and supporting A2A cross-Agent communication:

```
User Input
    │
    ▼
[L9 Frontend] User enters message → calls API
    │
    ▼
[L8 API] /api/chat endpoint → parameter validation → create SSE stream
    │                                  │
    │                                  └→ [A2A endpoint] Expose Agent Card capabilities
    │
    ▼
[L7 Orchestration] Determine whether multi-Agent is needed → task decomposition → forward
    │                                  │
    │                                  ├→ [A2A client] Delegate to external Agent
    │                                  └→ [Hierarchical subagent] Internal sub-Agent execution
    │
    ▼
[L6 Memory] Load conversation history → retrieve relevant knowledge → inject context
    │
    ▼
[L4 Agent] Enter Agent node → prepare messages
    │
    ▼
[L3 Prompt] Build system prompt → inject role template → assemble complete prompt
    │
    ▼
[L2 Interface] Call LLM → stream → handle callbacks
    │
    ▼
[L1 LLM] GPT-4o / Claude / DeepSeek actual reasoning
    │
    ▼
[L2 Interface] Receive streaming tokens → return piece by piece
    │
    ▼
[L4 Agent] Parse response → determine whether a tool call is needed
    │
    ├── Needs tool → [L5 Tool Execution] → call tool (incl. MCP remote tools)
    │                              │
    │                              └→ Call external tool service via MCP protocol
    │
    └── Direct answer → [L8 SSE] → stream push to frontend
                            │
                            ▼
                        [L9 Frontend] Render tokens in real time
                            │
                            ▼
                        [L6 Memory] Save conversation history
                            │
                            ▼
                        User sees the final answer
```

---


### Technology Stack

| Layer | Technology | Version | Description |
|-------|------------|---------|-------------|
| **L1 LLM** | GPT-4o / Claude / DeepSeek / Ollama | - | Multiple model support |
| **L2 Model Interface** | Provider factory (8 vendor adapters) + langchain_core messages | - | Unified LLM call abstraction (openai/anthropic/deepseek/ollama/gemini/qwen/glm/kimi) |
| **L3 Prompt Engineering** | Native prompt_builder / role_templates | - | Prompt templates, few-shot, output parsers, sanitizer |
| **L4 Agent Framework** | AgentRuntime + 6 adapters | - | bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen (framework-agnostic) |
| **L5 Tool Execution** | Native registry/executor + MCP | 2026-07-28 | Tool registration & execution + MCP client/server (stateless) |
| **L6 Memory & Knowledge** | VectorStore (stdlib) / ChromaDB | 0.6+ | Memory and vector retrieval (stdlib-first, optional backends) |
| **L7 Orchestration** | Supervisor/Router/Workflow + A2A | 1.0 | Multi-Agent collaboration + cross-Agent communication protocol |
| **L8 API Service** | FastAPI + SSE | 0.115+ | High-performance async API |
| **L9 Frontend UI** | React 19 + TypeScript | 19+ / 5.7+ | Modern frontend |
| **L10 Infrastructure** | Docker + Docker Compose | 27+ / 2.27+ | Deployment and operations |
| **Cross-layer** | Pydantic | 2.10+ | Data models and validation |

---


### Code Generation Reference

### Key Patterns for Generating from Config

When generating code, always follow these principles:

1. **Config-driven**: All variable behavior is read from `agent.yaml`; do not hardcode
2. **Generate on demand**: Only generate the code that is needed; do not keep unused modules
3. **Template substitution**: Use template strings to substitute config values rather than complex AST operations
4. **Stay readable**: Generated code should be readable and manually modifiable

### Config → Code Mapping Table

```python
### agent.yaml config items → code generation rules per layer

config = {
    "llm": {"provider": "openai", "model": "gpt-4o"},
    "tools": {"enabled": ["web_search", "web_fetch"]},
    "prompt": {"system_prompt": "You are a research assistant..."},
}

### L1 → app/l1_llm/factory.py
def create_llm():
    provider = config["llm"]["provider"]  # "openai"
    model = config["llm"]["model"]        # "gpt-4o"
    return OpenAIAdapter(model=model)

### L3 → app/l3_prompt/system_prompts.py
SYSTEM_PROMPT = """{config['prompt']['system_prompt']}"""

### L5 → app/l5_tools/registry.py
def register_tools():
    for tool_name in config["tools"]["enabled"]:
        ToolRegistry.register(tool_name)
```

---


## Part 6 · 最佳实践与输出要求

### Best Practices

### 1. Discovery Principles
- Ask open-ended questions first, then multiple-choice questions
- Ask about only one dimension per question
- Record the user's answers — don't omit anything
- **AI behavior**: Don't throw all questions at the user at once; guide gradually

### 2. Architecture Design Principles
- Start simple: prefer a single Agent
- Only introduce multi-Agent orchestration when needed
- Enable tools on demand; don't over-engineer
- **AI behavior**: When confirming each layer, explain the layer's role to the user

### 3. Config Generation Principles
- The config is the single source of truth
- All code generation is based on the config; do not manually modify generated code
- Regenerate code when the config changes
- **AI behavior**: After generating the config, show the key items to the user for confirmation

### 4. Code Generation Principles
- Each layer focuses only on its own responsibilities
- Lower layers don't depend on upper layers; upper layers depend on lower layers
- Layers communicate through well-defined interfaces
- Any layer can be replaced without modifying the others
- **AI behavior**: Prefer the `generate.py` script; manual generation as a fallback

### 5. Tool Design Principles
- Each tool does one thing, and does it well
- Define tool parameters strictly with Pydantic models
- Include detailed docstrings in tool functions

### 6. Error Handling
- Every tool node has try-catch
- Routing nodes have fallback logic
- The frontend shows friendly error messages
- **AI behavior**: During deployment testing, if errors occur, analyze the cause and fix them

### 7. Security
- Read API Keys from environment variables
- Apply length limits to user input
- Tools have timeout mechanisms

---


### Output Requirements

After each build is complete, you must ensure:

1. **agent_requirements.md**: Requirements document is complete
2. **architecture.md**: Architecture design document is complete
3. **agent.yaml**: Configuration file is complete
4. **L1–L10 each layer's code is complete**: No layer is missing
5. **Backend is runnable**: `pip install -r requirements.txt && uvicorn app.main:app --reload`
6. **Frontend is runnable**: `npm install && npm run dev`
7. **Full stack is runnable**: `docker-compose up`
8. **Streaming response**: SSE streaming works correctly
9. **Error handling**: API errors return reasonable error messages
10. **Type safety**: TypeScript and Python type definitions are complete

---

