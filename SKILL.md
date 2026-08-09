# Universal Agent Builder (万能 Agent 构建器)

## 概述

**万能 Agent 构建器**是一个**元技能**——它不直接提供一个现成的 Agent，而是通过一系列结构化引导步骤，**自动生成**一个完整、可运行、符合用户需求的 AI Agent 应用。

**核心能力**：你（AI 开发者）通过本技能引导用户（需求方）从自然语言描述到可运行 Agent 的完整交付。

---

## AI 行为准则（重要！）

> 当你使用本技能时，你扮演的是 **AI 产品经理 + 架构师 + 全栈工程师** 三重角色。你必须：
> 1. **主动引导**：不要等用户把所有需求说完，要一步步问
> 2. **记录决策**：每一步的决策都要写入文件
> 3. **解释选择**：让用户理解每个选项的利弊
> 4. **交付可运行代码**：最终产物必须是能启动的完整应用

**切记**：
- 你不是在写文档，你是在**引导用户完成构建过程**
- 每次对话结束时，用户应该比之前更清楚自己要什么
- 不要一次性生成所有代码，要按步骤推进
- 每一步都要让用户确认后再继续

---

## 核心工作流程（5步法）

```
第1步：需求发现  →  第2步：架构设计  →  第3步：配置生成  →  第4步：代码生成  →  第5步：部署验证
  用户说需求         选模板定架构       生成 YAML 配置     生成完整代码         启动与测试
```

---

### 第1步：需求发现 (Discovery)

**目标**：通过对话了解用户想要的 Agent，输出一份结构化的需求文档 `agent_requirements.md`。

**AI 行为**：你需要像产品经理一样，通过对话逐步了解用户需求。**不要一次性把所有问题抛给用户**，而是按下面的顺序，每次问 1-2 个问题，等用户回答后再继续。

#### 对话开场

```
你：你好！我来帮你搭建一个 AI Agent。先请你用一句话描述一下，你想让这个 Agent 做什么？
用户：我想做一个研究助手，帮我搜索和分析信息。

你：好的！我们来一步步确定需求。
```

#### 1.1 核心功能（先问这个）

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 你的 Agent 主要做什么？ | 自由描述 | `purpose` |
| 属于哪种类型？ | 聊天助手 / 研究助手 / 编码助手 / 客服系统 / 数据分析 / 自定义 | `agent_type` |

**AI 对话示例**：
```
你：你的 Agent 主要解决什么问题？能具体描述一下使用场景吗？
用户：我需要一个能搜索网页、总结内容、保存笔记的研究助手。

你：好的，这属于"研究助手"类型。接下来我问问技术细节。
```

#### 1.2 技术选型（再问这个）

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 用什么大模型？ | OpenAI / Anthropic / DeepSeek / Ollama / 混合 | `llm_provider` |
| 具体哪个模型？ | GPT-4o / Claude-3.5 / DeepSeek-V3 / 自定义 | `llm_model` |
| 需要本地部署吗？ | 是 / 否 | `local_deploy` |

**AI 对话示例**：
```
你：你倾向用哪个大模型？如果追求综合能力推荐 GPT-4o，代码能力推荐 Claude-3.5，
性价比推荐 DeepSeek-V3，本地部署可以用 Ollama。
用户：用 GPT-4o 吧。

你：好的。需要本地部署吗？如果不需要，我们就用云端 API。
用户：不需要本地部署。
```

#### 1.3 工具需求

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 需要搜索网页吗？ | 是 / 否 | `tools.web_search` |
| 需要读写文件吗？ | 是 / 否 | `tools.file_ops` |
| 需要代码执行吗？ | 是 / 否 | `tools.code_exec` |
| 需要自定义工具吗？ | 是 / 否 → 描述 | `tools.custom` |

#### 1.4 记忆与知识

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 需要记住对话历史吗？ | 短期（当前会话）/ 长期（跨会话） / 不需要 | `memory.type` |
| 需要上传知识文档吗？ | 是 / 否 | `knowledge.enabled` |

#### 1.5 多 Agent 与编排

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 需要多个 Agent 协作吗？ | 单 Agent / 多 Agent | `orchestration.mode` |

#### 1.6 界面与部署

| 问题 | 选项 | 记录字段 |
|------|------|----------|
| 需要什么界面？ | 聊天窗口 / 仪表盘 / 管理后台 / 最小化 | `ui.type` |
| 部署方式？ | Docker / 云服务 / 本地直接运行 | `deployment.type` |

#### 输出：`agent_requirements.md`

收集完所有信息后，生成 `agent_requirements.md`：

```markdown
# Agent 需求文档

## 基本信息
- **名称**: ResearchAssistant
- **类型**: research
- **用途**: 网页搜索研究助手，可以搜索、总结、保存笔记

## 技术选型
- **LLM 提供商**: openai
- **LLM 模型**: gpt-4o
- **本地部署**: 否

## 工具
- web_search: 网页搜索
- web_fetch: 网页抓取
- current_time: 获取时间
- calculate: 数学计算
- save_note: 保存笔记（自定义）

## 记忆与知识
- **记忆类型**: buffer
- **知识库**: 无

## 编排
- **模式**: single

## 界面
- **UI 类型**: chat
- **部署方式**: docker
```

---

### 第2步：架构设计 (Architecture Design)

**目标**：根据需求文档，选择架构模板并确定各层配置。

**AI 行为**：根据需求文档中的 `agent_type`，选择对应的架构模板，并向用户解释选择。

#### 2.1 Agent 类型决策树

```
用户需求
    │
    ├── 通用对话、简单问答 → 模板 A: 聊天助手 (chat)
    │
    ├── 搜索、总结、研究 → 模板 B: 研究助手 (research)
    │
    ├── 写代码、调试、审查 → 模板 C: 编码助手 (coding)
    │
    ├── 多 Agent 分工协作 → 模板 D: 客服系统 (customer_service)
    │
    ├── 数据分析、图表 → 模板 E: 数据分析 (data_analysis)
    │
    └── 其他特殊需求 → 自由组合各层
```

**AI 对话示例**：
```
你：根据你的需求，我推荐使用"研究助手"模板。这个模板预配置了：
- 搜索和网页抓取工具
- 适合研究场景的提示词模板
- 会话记忆管理

你觉得这个方向对吗？还是想调整什么？
```

#### 2.2 各层配置确认

根据需求文档，逐层确认配置。**AI 行为**：不要一次性列出所有层，而是按重要性顺序确认：

```
确认顺序：L1(模型) → L5(工具) → L4(单/多Agent) → L3(提示词) → L6(记忆) → L9(界面) → L10(部署)
```

每层确认时，**AI 行为**：
1. 向用户解释这一层是什么
2. 给出推荐配置
3. 让用户确认或修改

**示例**：
```
你：接下来我们确定 L1 大模型层。你选择了 GPT-4o，温度和最大 Token 数用默认
（0.7 和 4096）可以吗？这些参数影响回答的创意性和长度。
用户：可以。
```

#### 2.3 架构文档输出

生成 `architecture.md`：

```markdown
# 架构设计文档

## 架构蓝图
研究助手 - 单 Agent

## 各层配置

### L1 大模型层
- 提供商: openai
- 模型: gpt-4o
- 温度: 0.7
- 最大 Token: 4096

### L2 模型接口层
- 重试: 启用（最多3次，延迟1秒）
- 模型回退: 禁用

### L3 提示工程层
- 角色模板: research_assistant
- 输出格式: markdown
- 自定义系统提示: 已设置

### L4 Agent 框架层
- 图类型: single（单Agent）
- 最大迭代: 10
- 检查点: memory

### L5 工具执行层
- 基础工具: web_search, web_fetch, current_time, calculate
- 自定义工具: save_note（保存研究笔记）

### L6 记忆与知识层
- 记忆类型: buffer
- 最大消息: 50
- 知识库: 无

### L7 编排调度层
- 模式: single
- 最大子任务: 5

### L8 API 服务层
- 端点: /api/chat, /api/health, /api/sessions
- 认证: 无
- 限流: 60次/分钟

### L9 前端展示层
- 组件: ChatWindow, Sidebar, Header
- 功能: 工具调用可视化, 多会话管理, Markdown渲染

### L10 基础设施层
- 部署: docker
- 日志级别: INFO
```

---

### 第3步：配置生成 (Config Generation)

**目标**：根据架构设计，生成 `agent.yaml` 配置文件。

**AI 行为**：
1. 根据架构文档生成 `agent.yaml`
2. 向用户展示关键配置项
3. 让用户确认后继续

```yaml
# ============================================================
# agent.yaml - Agent 完整配置（单一事实来源）
# 所有代码生成基于此配置
# ============================================================

# Agent 基本信息
agent:
  name: "ResearchAssistant"
  type: "research"
  description: "网页搜索研究助手，可以搜索网页、总结内容、保存笔记"

# L1: 大模型层
llm:
  provider: "openai"           # openai | anthropic | deepseek | ollama
  model: "gpt-4o"
  api_base: ""                 # 可选，兼容 OpenAI 格式的第三方服务
  temperature: 0.7
  max_tokens: 4096

# L2: 模型接口层
interface:
  retry:
    enabled: true
    max_retries: 3
    delay: 1.0
  fallback:
    enabled: false
    models: []

# L3: 提示工程层
prompt:
  system_prompt: |
    你是一个专业的研究助手。你的任务是：
    1. 理解用户的问题
    2. 搜索相关信息
    3. 总结和分析结果
    4. 给出有深度、有来源的回答
  role_template: "research_assistant"
  output_format: "markdown"

# L4: Agent 框架层
agent_framework:
  graph_type: "single"         # single | multi | supervisor
  max_iterations: 10
  checkpointer: "memory"       # memory | postgres | none

# L5: 工具执行层
tools:
  enabled:
    - web_search
    - web_fetch
    - current_time
    - calculate
  custom:
    - name: "save_note"
      description: "保存研究笔记到本地文件"
      parameters:
        title: { type: "string", description: "笔记标题" }
        content: { type: "string", description: "笔记内容" }

# L6: 记忆与知识层
memory:
  type: "buffer"               # buffer | vector | both
  max_messages: 50
  knowledge:
    enabled: false
    vector_store: "chroma"

# L7: 编排调度层
orchestration:
  mode: "single"               # single | multi
  max_subtasks: 5
  timeout: 120

# L8: API 服务层
api:
  auth_enabled: false
  rate_limit: 60
  cors_origins:
    - "http://localhost:5173"
    - "http://localhost:3000"

# L9: 前端展示层
ui:
  type: "chat"                 # chat | dashboard | minimal
  title: "研究助手"
  features:
    - tool_visualization
    - session_management
    - markdown_rendering

# L10: 基础设施层
deployment:
  type: "docker"               # docker | local
  log_level: "INFO"
  debug: false
```

**AI 对话示例**：
```
你：配置已经生成好了。核心配置如下：
- 模型: GPT-4o
- 工具: 搜索、网页抓取、计算、保存笔记
- 架构: 单 Agent
- 界面: 聊天窗口
- 部署: Docker

请确认是否要按这个配置生成代码？或者需要调整什么？
```

---

### 第4步：代码生成 (Code Generation)

**目标**：根据 `agent.yaml` 配置，逐层生成完整代码。

**AI 行为**：
1. 运行 `scripts/generate.py` 脚本生成代码
2. 或者手动逐层生成代码（按 L1 → L10 顺序）
3. 每生成完一层，验证该层代码正确性
4. 最终生成一个完整的项目目录

#### 使用生成脚本（推荐）

```bash
# 语法: python scripts/generate.py <config.yaml> <output_dir>
python scripts/generate.py agent.yaml ./generated_agent
```

#### 手动生成策略

如果自动生成脚本不可用，按 L1 → L10 顺序逐层生成。每层生成规则：

| 层级 | 配置源 | 生成目标 | 关键操作 |
|------|--------|----------|----------|
| L1 | `llm.*` | `app/l1_llm/factory.py` | 只保留配置的提供商适配器 |
| L2 | `interface.*` | `app/l2_interface/chat_interface.py` | 配置重试和回退策略 |
| L3 | `prompt.*` | `app/l3_prompt/system_prompts.py` | 注入系统提示词、角色模板 |
| L4 | `agent_framework.*` | `app/l4_agent/graph.py` | 单 Agent 或多 Agent 图 |
| L5 | `tools.*` | `app/l5_tools/` | 只注册启用的工具 |
| L6 | `memory.*` | `app/l6_memory/` | 配置记忆类型 |
| L7 | `orchestration.*` | `app/l7_orchestrator/` | 单/多 Agent 编排 |
| L8 | `api.*` | `app/l8_api/routes/` | 生成 API 路由 |
| L9 | `ui.*` | `frontend/src/` | 动态渲染 UI 组件 |
| L10 | `deployment.*` | `docker-compose.yml`, `.env` | 部署配置 |

#### 生成后的项目结构

```
generated_agent/
├── agent.yaml                    # 配置文件（单一事实来源）
├── agent_requirements.md         # 需求文档
├── architecture.md               # 架构文档
├── .env.example                  # 环境变量模板
├── docker-compose.yml            # Docker 编排
├── Dockerfile                    # 后端镜像
├── requirements.txt              # Python 依赖
├── app/
│   ├── main.py                   # 应用入口 (L8+L10)
│   ├── l1_llm/                   # 大模型层
│   │   ├── __init__.py
│   │   ├── base.py               # 抽象基类
│   │   ├── openai_adapter.py     # 只保留配置的提供商
│   │   └── factory.py            # 工厂方法
│   ├── l2_interface/             # 模型接口层
│   │   ├── __init__.py
│   │   ├── chat_interface.py     # 统一聊天接口
│   │   ├── streaming.py          # 流式处理
│   │   └── retry.py              # 重试策略
│   ├── l3_prompt/                # 提示工程层
│   │   ├── __init__.py
│   │   ├── system_prompts.py     # 系统提示词（从配置注入）
│   │   ├── prompt_builder.py     # 提示词构建器
│   │   └── output_parsers.py     # 输出解析器
│   ├── l4_agent/                 # Agent 框架层
│   │   ├── __init__.py
│   │   ├── state.py              # Agent 状态定义
│   │   ├── graph.py              # 图构建（单/多Agent）
│   │   ├── nodes.py              # 节点逻辑
│   │   └── router.py             # 路由决策
│   ├── l5_tools/                 # 工具执行层
│   │   ├── __init__.py
│   │   ├── registry.py           # 工具注册表
│   │   ├── base_tools.py         # 基础工具实现
│   │   └── custom_tools.py       # 自定义工具实现
│   ├── l6_memory/                # 记忆与知识层
│   │   ├── __init__.py
│   │   ├── buffer.py             # 对话缓冲
│   │   ├── session_manager.py    # 会话管理
│   │   └── vector_store.py       # 向量存储（可选）
│   ├── l7_orchestrator/          # 编排调度层
│   │   ├── __init__.py
│   │   ├── base.py               # 编排基类
│   │   ├── orchestrator.py       # 编排器
│   │   └── aggregator.py         # 结果聚合
│   └── l8_api/                   # API 服务层
│       ├── __init__.py
│       ├── schemas.py            # 数据模型
│       ├── routes/
│       │   ├── chat.py           # 聊天端点
│       │   └── health.py         # 健康检查
│       └── middleware/
│           └── auth.py           # 认证（可选）
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # 根组件（动态渲染）
│       ├── l8_api/
│       │   └── api.ts            # API 客户端
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
    ├── start.sh                  # 启动脚本
    └── run.sh                    # 一键运行
```

#### 验证清单

每生成完一层后，检查：

- [ ] L1: 适配器代码正确，工厂方法支持配置的提供商
- [ ] L2: 接口层配置了正确的重试和回退策略
- [ ] L3: 系统提示词已注入，角色模板已设置
- [ ] L4: 图结构正确（单Agent / 多Agent）
- [ ] L5: 工具已按配置注册，自定义工具已实现
- [ ] L6: 记忆类型已配置
- [ ] L7: 编排模式已配置
- [ ] L8: API 路由已注册，认证已配置
- [ ] L9: 前端组件已按功能配置渲染
- [ ] L10: 部署配置完整，环境变量正确

---

### 第5步：部署验证 (Deployment)

**目标**：确保生成的代码可以正常运行。

**AI 行为**：
1. 引导用户配置环境变量
2. 启动后端和前端
3. 验证基本功能
4. 如果使用 Docker，验证 Docker 部署

#### 5.1 环境配置

```bash
cd generated_agent

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 填入 LLM API Key
# OPENAI_API_KEY=sk-...
```

**AI 对话示例**：
```
你：代码已经生成好了！现在来部署。首先，请在 .env 文件中填入你的 API Key。
如果你用的是 OpenAI，需要设置 OPENAI_API_KEY。
```

#### 5.2 启动后端

```bash
# 安装依赖
cd generated_agent
pip install -r requirements.txt

# 启动后端
uvicorn app.main:app --reload --port 8000
```

验证：`curl http://localhost:8000/api/health`

#### 5.3 启动前端

```bash
cd generated_agent/frontend
npm install
npm run dev
```

验证：浏览器打开 `http://localhost:5173`

#### 5.4 Docker 部署

```bash
cd generated_agent
docker-compose up --build
```

验证：`http://localhost:5173` + `http://localhost:8000/docs`

#### 5.5 功能测试

- [ ] 发送消息能收到回复
- [ ] 流式输出正常工作
- [ ] 工具调用能正确执行
- [ ] 多会话切换正常
- [ ] 错误处理显示友好提示

---

## 架构模板库

### 模板 A：聊天助手 (Chat)

**适用场景**：通用对话助手，最简单的 Agent

**配置差异**：
- `llm.model`: `gpt-4o-mini`（低成本模型即可）
- `tools.enabled`: `[current_time]`（最少工具）
- `agent_framework.graph_type`: `single`
- `ui.features`: `[session_management]`

**核心代码量**：最少，约 10 个文件

**YAML 配置**：
```yaml
agent:
  name: "ChatAssistant"
  type: "chat"
  description: "通用对话助手"

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

### 模板 B：研究助手 (Research)

**适用场景**：搜索、分析、总结信息

**配置差异**：
- `llm.model`: `gpt-4o`（更强推理能力）
- `tools.enabled`: `[web_search, web_fetch, current_time, calculate]`
- `prompt.role_template`: `research_assistant`
- `prompt.output_format`: `markdown`
- `memory.max_messages`: `100`（更长记忆）

**关键代码差异**：
```python
# L3 层：研究助手角色模板
SYSTEM_PROMPT = """你是一个专业的研究助手。你的任务是：
1. 理解用户的问题
2. 搜索相关信息
3. 总结和分析结果
4. 给出有深度、有来源的回答"""

# 自定义工具
@tool
async def save_note(title: str, content: str) -> str:
    """保存研究笔记到本地文件"""
    with open(f"notes/{title}.md", "w", encoding="utf-8") as f:
        f.write(content)
    return f"笔记已保存: {title}.md"
```

---

### 模板 C：编码助手 (Coding)

**适用场景**：编程辅助、代码审查、调试

**配置差异**：
- `llm.provider`: `anthropic`
- `llm.model`: `claude-3-5-sonnet-20241022`（代码能力最强）
- `tools.enabled`: `[web_search, code_execute, file_read, file_write, current_time]`
- `prompt.role_template`: `code_reviewer`

**关键代码差异**：
```python
# L3 层：编码助手角色模板
SYSTEM_PROMPT = """你是一个专业编程助手。你擅长：
1. 编写高质量代码
2. 代码审查和优化
3. 调试和修复 Bug
4. 架构设计建议

代码规范：
- 遵循 PEP 8 / 语言标准规范
- 添加必要的类型注解
- 包含错误处理
- 注重可读性和可维护性"""

# 代码执行工具
@tool
async def code_execute(code: str, language: str = "python") -> str:
    """在沙箱中执行代码"""
    # 使用 Docker 沙箱或 subprocess
    ...

@tool
async def file_read(path: str) -> str:
    """读取文件内容"""
    ...

@tool
async def file_write(path: str, content: str) -> str:
    """写入文件内容"""
    ...
```

---

### 模板 D：客服系统 (Customer Service)

**适用场景**：多 Agent 协作的客服系统

**配置差异**：
- `agent_framework.graph_type`: `multi`
- `orchestration.mode`: `multi`
- 需要定义多个子 Agent

**多 Agent 配置**：
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
      role: "问题分类"
      system_prompt: "你负责将用户问题分类到：订单、退款、产品咨询"
      tools: []
    - name: "order_agent"
      role: "订单处理"
      system_prompt: "你负责处理订单相关查询"
      tools: [query_order, cancel_order]
    - name: "refund_agent"
      role: "退款处理"
      system_prompt: "你负责处理退款请求"
      tools: [process_refund, check_refund_status]
    - name: "aggregator"
      role: "结果汇总"
      system_prompt: "你负责汇总所有子 Agent 的结果，生成最终回复"
      tools: []

ui:
  type: "chat"
  features: [tool_visualization, session_management]
```

**关键代码差异**：
```python
# L4 层：多 Agent 图
def build_multi_agent_graph(agents: list) -> StateGraph:
    """构建多 Agent 编排图"""
    workflow = StateGraph(AgentState)
    
    # 分类 Agent
    workflow.add_node("classifier", create_agent_node(agents[0]))
    # 专业 Agent
    workflow.add_node("order_agent", create_agent_node(agents[1]))
    workflow.add_node("refund_agent", create_agent_node(agents[2]))
    # 汇总 Agent
    workflow.add_node("aggregator", create_agent_node(agents[3]))
    
    workflow.set_entry_point("classifier")
    
    # 条件路由：分类 → 专业 Agent
    workflow.add_conditional_edges(
        "classifier",
        classifier_router,
        {
            "order_agent": "order_agent",
            "refund_agent": "refund_agent",
            "aggregator": "aggregator",
        },
    )
    
    # 专业 Agent → 汇总
    workflow.add_edge("order_agent", "aggregator")
    workflow.add_edge("refund_agent", "aggregator")
    workflow.add_edge("aggregator", END)
    
    return workflow
```

---

### 模板 E：数据分析 (Data Analysis)

**适用场景**：数据上传、分析、可视化

**配置差异**：
- `tools.enabled`: `[read_csv, analyze_data, generate_chart, current_time]`
- `memory.knowledge.enabled`: `true`
- `ui.features`: `[tool_visualization, file_upload, chart_display]`

**关键代码差异**：
```python
# L5 层：数据分析工具
@tool
async def read_csv(file_path: str) -> str:
    """读取 CSV 文件并返回数据摘要"""
    import pandas as pd
    df = pd.read_csv(file_path)
    return f"行数: {len(df)}, 列: {list(df.columns)}\n{df.describe().to_string()}"

@tool
async def analyze_data(data_description: str, analysis_type: str) -> str:
    """执行数据分析"""
    ...

@tool
async def generate_chart(data: str, chart_type: str = "bar") -> str:
    """生成图表并保存为图片"""
    import matplotlib.pyplot as plt
    ...
```

---

## 完整架构分层（10层）

```
┌──────────────────────────────────────────────────────────┐
│  L10  基础设施层 (Infrastructure)                         │
│  Docker 部署 / 环境配置 / 监控 / 日志 / CI/CD             │
├──────────────────────────────────────────────────────────┤
│  L9   前端展示层 (Frontend UI)                             │
│  React 组件 / 聊天界面 / 工具可视化 / 状态管理 / 响应式    │
├──────────────────────────────────────────────────────────┤
│  L8   API 服务层 (API Service)                             │
│  FastAPI 端点 / SSE 流式 / 认证鉴权 / 限流 / 中间件        │
├──────────────────────────────────────────────────────────┤
│  L7   编排调度层 (Orchestration)                           │
│  多 Agent 协调 / 任务分解 / 工作流管理 / 条件路由 / 重试   │
├──────────────────────────────────────────────────────────┤
│  L6   记忆与知识层 (Memory & Knowledge)                    │
│  对话缓冲 / 向量存储 / RAG 检索 / 知识库 / 长期记忆        │
├──────────────────────────────────────────────────────────┤
│  L5   工具执行层 (Tool Execution)                          │
│  工具注册 / 参数解析 / 执行引擎 / 结果处理 / 错误恢复      │
├──────────────────────────────────────────────────────────┤
│  L4   Agent 框架层 (Agent Framework)                      │
│  LangGraph 图 / 状态管理 / 节点定义 / 边路由 / 检查点      │
├──────────────────────────────────────────────────────────┤
│  L3   提示工程层 (Prompt Engineering)                      │
│  系统提示 / 角色模板 / Few-shot / 输出解析 / 指令注入      │
├──────────────────────────────────────────────────────────┤
│  L2   模型接口层 (Model Interface)                         │
│  LangChain 统一抽象 / 模型切换 / 重试 / 回退 / 流式        │
├──────────────────────────────────────────────────────────┤
│  L1   大模型层 (LLM Foundation)                            │
│  OpenAI / Anthropic / DeepSeek / Ollama / 本地模型         │
└──────────────────────────────────────────────────────────┘
```

### 各层详解

#### L1 - 大模型层 (LLM Foundation)

最底层，提供实际的推理能力。支持多种模型提供商和本地部署。

| 提供商 | 模型 | 特点 | 适用场景 |
|--------|------|------|----------|
| **OpenAI** | GPT-4o, GPT-4o-mini | 最强综合能力，生态最好 | 通用场景 |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku | 长上下文，安全性高 | 编码、长文档 |
| **DeepSeek** | DeepSeek-V3, DeepSeek-R1 | 性价比高，中文优秀 | 中文场景 |
| **Ollama** | Qwen2.5, Llama3.1, Mistral | 本地部署，数据安全 | 隐私敏感场景 |

**代码结构**：
```
app/l1_llm/
├── __init__.py          # 导出所有 LLM 适配器
├── base.py              # 抽象基类定义
├── openai_adapter.py    # OpenAI 适配器
├── anthropic_adapter.py # Anthropic 适配器
├── deepseek_adapter.py  # DeepSeek 适配器
├── ollama_adapter.py    # Ollama 本地适配器
└── factory.py           # 工厂方法，根据配置创建实例
```

**核心接口**：
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

#### L2 - 模型接口层 (Model Interface)

在 L1 之上提供统一的调用抽象，屏蔽不同提供商的差异。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **统一调用** | 同一套 API 调用所有模型 | `chat()`, `stream()` |
| **自动重试** | 失败自动重试（指数退避） | `retry_with_backoff()` |
| **模型回退** | 主模型失败时降级到备用模型 | `fallback_chain` |
| **流式封装** | 统一流式输出格式 | `StreamingCallback` |
| **Token 管理** | 上下文窗口检测和截断 | `token_manager` |

**代码结构**：
```
app/l2_interface/
├── __init__.py
├── chat_interface.py    # 统一聊天接口
├── streaming.py         # 流式处理封装
├── retry.py             # 重试和回退策略
├── token_manager.py     # Token 计数和窗口管理
└── callbacks.py         # 回调处理器
```

---

#### L3 - 提示工程层 (Prompt Engineering)

管理所有与 LLM 交互的提示词，确保输出质量和一致性。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **系统提示** | 定义 Agent 角色和行为准则 | `system_prompts.py` |
| **角色模板** | 预定义多种专业角色 | `research_assistant`, `code_reviewer` 等 |
| **Few-shot 示例** | 在提示中注入示例 | `few_shot_examples.py` |
| **输出解析器** | 将 LLM 输出转为结构化数据 | `PydanticOutputParser` |
| **指令注入** | 动态注入用户需求 | `prompt_builder.py` |

**代码结构**：
```
app/l3_prompt/
├── __init__.py
├── system_prompts.py    # 系统提示词定义（从配置生成）
├── role_templates.py    # 角色模板
├── prompt_builder.py    # 提示词构建器
├── output_parsers.py    # 输出解析器
├── few_shot.py          # Few-shot 示例管理
└── sanitizer.py         # 提示安全过滤
```

**核心设计**：
```python
class PromptBuilder:
    """链式构建提示词"""
    
    def with_system(self, role: str) -> PromptBuilder: ...
    def with_context(self, context: dict) -> PromptBuilder: ...
    def with_examples(self, examples: list) -> PromptBuilder: ...
    def with_tools(self, tools: list) -> PromptBuilder: ...
    def with_history(self, messages: list) -> PromptBuilder: ...
    def build(self) -> list[dict]: ...
```

---

#### L4 - Agent 框架层 (Agent Framework)

核心编排层，基于 LangGraph 构建有状态的 Agent 执行图。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **状态图** | 定义 Agent 执行流程 | `StateGraph` |
| **状态管理** | 跨节点状态传递 | `AgentState` (TypedDict) |
| **节点定义** | 每个处理步骤 | `agent_node`, `tool_node`, `router_node` |
| **边路由** | 条件跳转和循环 | `add_conditional_edges` |
| **检查点** | 执行状态持久化 | `MemorySaver`, `PostgresSaver` |
| **中断/恢复** | 支持 human-in-the-loop | `interrupt`, `Command` |

**代码结构**：
```
app/l4_agent/
├── __init__.py
├── state.py             # AgentState 类型定义
├── graph.py             # 图构建和编译
├── nodes.py             # 节点逻辑
├── router.py            # 路由决策
├── checkpointer.py      # 检查点管理
└── intercepts.py        # 中断和恢复
```

**状态流转**：
```
                    ┌───────────┐
                    │  ENTRY    │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Agent    │  ← LLM 决定下一步
                    │  节点     │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  路由     │  ← 需要工具？结束？
                    └─────┬─────┘
                     ╱         ╲
                    ╱           ╲
            ┌──────▼────┐  ┌────▼──────┐
            │  工具节点  │  │   END     │
            │  执行工具  │  │  返回结果  │
            └──────┬────┘  └───────────┘
                   │
                   └────────→ 回到 Agent 节点
```

---

#### L5 - 工具执行层 (Tool Execution)

管理 Agent 可调用的所有外部能力。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **工具注册表** | 注册和发现所有工具 | `ToolRegistry` |
| **工具定义** | 工具参数和描述 | `@tool` 装饰器 + Pydantic |
| **执行引擎** | 调用工具并返回结果 | `execute_tool()` |
| **结果处理** | 格式化工具输出 | `format_tool_result()` |
| **错误恢复** | 工具失败时的降级策略 | `ToolErrorHandler` |
| **超时控制** | 防止工具执行过长 | `asyncio.timeout` |

**代码结构**：
```
app/l5_tools/
├── __init__.py
├── registry.py          # 工具注册表
├── base_tools.py        # 基础工具（搜索/抓取/计算/时间）
├── custom_tools.py      # 自定义工具模板
├── executor.py          # 工具执行引擎
├── errors.py            # 错误处理
└── schemas.py           # 工具参数 Schema
```

---

#### L6 - 记忆与知识层 (Memory & Knowledge)

管理 Agent 的短期记忆、长期记忆和外部知识。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **对话缓冲** | 短期会话记忆 | `ConversationBufferMemory` |
| **摘要记忆** | 长对话自动摘要 | `ConversationSummaryMemory` |
| **向量存储** | 语义搜索和检索 | `ChromaDB`, `FAISS` |
| **RAG 引擎** | 检索增强生成 | `RetrievalQA` chain |
| **知识库** | 结构化知识管理 | `KnowledgeBase` |

**代码结构**：
```
app/l6_memory/
├── __init__.py
├── buffer.py            # 对话缓冲记忆
├── summary.py           # 摘要记忆
├── vector_store.py      # 向量存储接口
├── rag_engine.py        # RAG 检索增强
├── knowledge_base.py    # 知识库
└── session_manager.py   # 会话管理
```

---

#### L7 - 编排调度层 (Orchestration)

管理多个 Agent 的协作、任务分解和工作流执行。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **任务分解** | 将复杂任务拆分为子任务 | `TaskDecomposer` |
| **多 Agent 协调** | 路由和调度子 Agent | `AgentOrchestrator` |
| **工作流引擎** | 定义执行流程 | `WorkflowGraph` |
| **条件路由** | 根据结果动态路由 | `ConditionalRouter` |
| **结果聚合** | 合并多个 Agent 结果 | `ResultAggregator` |

**代码结构**：
```
app/l7_orchestrator/
├── __init__.py
├── base.py              # 编排基类
├── decomposer.py        # 任务分解器
├── orchestrator.py      # 多 Agent 协调器
├── workflow.py          # 工作流引擎
├── router.py            # 条件路由
├── aggregator.py        # 结果聚合
└── supervisor.py        # 监督 Agent（可选）
```

**多 Agent 编排模式**：
```
┌─────────────┐
│  用户输入    │
└──────┬──────┘
       │
┌──────▼──────┐
│  监督 Agent   │  ← 分析任务，决定分解策略
│  (Supervisor)│
└──────┬──────┘
       │
       │  任务分解
       │
  ┌────┼────┬────┬────┐
  │    │    │    │    │
  ▼    ▼    ▼    ▼    ▼
┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐
│S1│ │S2│ │S3│ │S4│ │S5│  ← 子 Agent 并行执行
└──┘ └──┘ └──┘ └──┘ └──┘
  │    │    │    │    │
  └────┼────┼────┼────┘
       │    │    │
┌──────▼────▼────▼──────┐
│  结果聚合 Agent        │  ← 合并结果，生成最终回答
│  (Aggregator)         │
└──────┬────────────────┘
       │
┌──────▼──────┐
│  最终输出    │
└─────────────┘
```

---

#### L8 - API 服务层 (API Service)

对外提供 HTTP 接口，处理请求/响应、认证、限流等横切关注点。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **路由注册** | 定义 API 端点 | `FastAPI APIRouter` |
| **SSE 流式** | 实时流式响应 | `StreamingResponse` |
| **请求验证** | 输入参数校验 | `Pydantic BaseModel` |
| **认证鉴权** | API Key / JWT | `AuthMiddleware` |
| **限流控制** | 请求频率限制 | `RateLimiter` |
| **错误处理** | 统一错误响应 | `ExceptionHandler` |

**代码结构**：
```
app/l8_api/
├── __init__.py
├── main.py              # FastAPI 应用实例
├── routes/
│   ├── __init__.py
│   ├── chat.py          # 聊天端点
│   ├── health.py        # 健康检查
│   ├── sessions.py      # 会话管理
│   └── tools.py         # 工具查询
├── middleware/
│   ├── __init__.py
│   ├── auth.py          # 认证中间件
│   ├── rate_limit.py    # 限流
│   └── logging.py       # 请求日志
├── schemas.py           # 请求/响应模型
└── errors.py            # 异常处理
```

**API 端点一览**：
```
POST /api/chat          # 流式聊天
POST /api/chat/reset    # 重置会话
GET  /api/health        # 健康检查
GET  /api/sessions      # 会话列表
GET  /api/tools         # 可用工具列表
GET  /api/config        # 获取当前 Agent 配置信息
```

---

#### L9 - 前端展示层 (Frontend UI)

用户交互界面，负责展示和交互。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **聊天界面** | 消息展示和输入 | `ChatWindow`, `MessageBubble`, `ChatInput` |
| **工具可视化** | 工具调用过程和结果 | `ToolCall` 卡片 |
| **会话管理** | 多会话切换 | `Sidebar`, `SessionList` |
| **状态管理** | 应用状态 | React `useState` / `useReducer` |
| **流式渲染** | 实时流式文本展示 | SSE `AsyncGenerator` |
| **动态配置** | 根据 API 配置渲染 UI | `GET /api/config` |
| **响应式布局** | 多端适配 | CSS Media Queries |

**代码结构**：
```
frontend/src/
├── App.tsx              # 根组件（路由 + 布局）
├── main.tsx             # 入口
├── l9_ui/               # L9 前端界面
│   ├── chat/
│   │   ├── ChatWindow.tsx    # 聊天窗口
│   │   ├── MessageBubble.tsx # 消息气泡
│   │   ├── ChatInput.tsx     # 输入框
│   │   └── ToolCall.tsx      # 工具调用可视化
│   ├── layout/
│   │   ├── Header.tsx        # 页头
│   │   └── Sidebar.tsx       # 侧边栏
│   └── shared/
│       ├── Loading.tsx       # 加载动画
│       └── ErrorBoundary.tsx # 错误边界
├── l8_api/
│   └── api.ts           # API 客户端（SSE）
├── types/
│   └── index.ts         # 类型定义
└── styles/
    └── index.css        # 全局样式
```

---

#### L10 - 基础设施层 (Infrastructure)

部署、运行和运维相关配置。

| 模块 | 职责 | 关键实现 |
|------|------|----------|
| **容器化** | Docker 镜像和编排 | `Dockerfile`, `docker-compose.yml` |
| **环境配置** | 环境变量管理 | `.env`, `config.py` |
| **日志** | 运行日志记录 | `structlog`, `logging` |
| **监控** | 性能监控和告警 | 健康检查端点 |
| **CI/CD** | 自动构建和部署 | GitHub Actions |

**代码结构**：
```
├── docker-compose.yml       # 全栈编排
├── Dockerfile               # 后端镜像
├── .env.example             # 环境变量模板
├── scripts/
│   ├── start.sh             # 启动脚本
│   └── run.sh               # 一键运行
└── app/l10_infra/
    ├── __init__.py
    ├── config.py            # 配置管理
    ├── logging.py           # 日志配置
    └── monitoring.py        # 监控
```

---

## 完整调用链

从用户输入到最终输出，贯穿所有 10 层的完整调用链：

```
用户输入
    │
    ▼
[L9 前端] 用户输入消息 → 调用 API
    │
    ▼
[L8 API] /api/chat 端点 → 参数验证 → 创建 SSE 流
    │
    ▼
[L7 编排] 判断是否需要多 Agent → 任务分解 → 转发
    │
    ▼
[L6 记忆] 加载历史对话 → 检索相关知识 → 注入上下文
    │
    ▼
[L4 Agent] 进入 Agent 节点 → 准备消息
    │
    ▼
[L3 提示] 构建系统提示 → 注入角色模板 → 组装完整 Prompt
    │
    ▼
[L2 接口] 调用 LLM → 流式传输 → 处理回调
    │
    ▼
[L1 大模型] GPT-4o / Claude / DeepSeek 实际推理
    │
    ▼
[L2 接口] 接收流式 Token → 逐片返回
    │
    ▼
[L4 Agent] 解析响应 → 判断是否需要工具调用
    │
    ├── 需要工具 → [L5 工具执行] → 调用工具 → 结果返回 Agent
    │
    └── 直接回答 → [L8 SSE] → 流式推送到前端
                            │
                            ▼
                        [L9 前端] 实时渲染 Token
                            │
                            ▼
                        [L6 记忆] 保存对话历史
                            │
                            ▼
                        用户看到最终回答
```

---

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **L1 大模型** | GPT-4o / Claude / DeepSeek / Ollama | - | 多种模型支持 |
| **L2 模型接口** | LangChain Core | 0.3+ | 统一 LLM 调用抽象 |
| **L3 提示工程** | LangChain Prompts | 0.3+ | 提示词模板和解析器 |
| **L4 Agent 框架** | LangGraph | 1.0+ | 有状态 Agent 编排图 |
| **L5 工具执行** | LangChain Tools | 0.3+ | 工具注册和执行 |
| **L6 记忆与知识** | LangChain Memory / ChromaDB | 0.3+ / 0.5+ | 记忆和向量检索 |
| **L7 编排调度** | LangGraph (多 Agent) | 1.0+ | 多 Agent 协作 |
| **L8 API 服务** | FastAPI + SSE | 0.115+ | 高性能异步 API |
| **L9 前端展示** | React 18 + TypeScript | 18+ / 5+ | 现代前端 |
| **L10 基础设施** | Docker + Docker Compose | 24+ / 2.24+ | 部署和运维 |

---

## 代码生成参考

### 从配置生成的关键模式

在生成代码时，始终遵循以下原则：

1. **配置驱动**：所有可变行为从 `agent.yaml` 读取，不硬编码
2. **按需生成**：只生成需要的代码，不保留未使用的模块
3. **模板替换**：使用模板字符串替换配置值，而非复杂的 AST 操作
4. **保持可读**：生成的代码可读、可手动修改

### 配置 → 代码映射表

```python
# agent.yaml 配置项 → 各层代码生成规则

config = {
    "llm": {"provider": "openai", "model": "gpt-4o"},
    "tools": {"enabled": ["web_search", "web_fetch"]},
    "prompt": {"system_prompt": "你是一个研究助手..."},
}

# L1 → app/l1_llm/factory.py
def create_llm():
    provider = config["llm"]["provider"]  # "openai"
    model = config["llm"]["model"]        # "gpt-4o"
    return OpenAIAdapter(model=model)

# L3 → app/l3_prompt/system_prompts.py
SYSTEM_PROMPT = """{config['prompt']['system_prompt']}"""

# L5 → app/l5_tools/registry.py
def register_tools():
    for tool_name in config["tools"]["enabled"]:
        ToolRegistry.register(tool_name)
```

### 代码片段参考

#### L1 - 大模型适配器

```python
class LLMAdapter(ABC):
    @abstractmethod
    async def invoke(self, messages, tools=None) -> AIMessage: ...
    @abstractmethod
    async def stream(self, messages, tools=None) -> AsyncIterator[str]: ...
    @abstractmethod
    def bind_tools(self, tools) -> Runnable: ...
```

#### L1 - 工厂方法

```python
def create_llm(provider: str, model: str, **kwargs) -> LLMAdapter:
    if provider == "openai":
        return OpenAIAdapter(model=model, **kwargs)
    elif provider == "anthropic":
        return AnthropicAdapter(model=model, **kwargs)
    elif provider == "deepseek":
        return DeepSeekAdapter(model=model, **kwargs)
    elif provider == "ollama":
        return OllamaAdapter(model=model, **kwargs)
    else:
        raise ValueError(f"不支持的提供商: {provider}")
```

#### L3 - 提示词构建器

```python
class PromptBuilder:
    def __init__(self):
        self._system = None
        self._tools = []
        self._history = []
        self._context = {}
        self._examples = []
    
    def with_system(self, prompt: str) -> "PromptBuilder": ...
    def with_tools(self, tools: list) -> "PromptBuilder": ...
    def with_history(self, messages: list) -> "PromptBuilder": ...
    def with_context(self, **kwargs) -> "PromptBuilder": ...
    def with_examples(self, examples: list) -> "PromptBuilder": ...
    def build(self) -> list[dict]: ...
```

#### L4 - Agent 状态

```python
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_step: Optional[str]
    tool_results: Optional[Dict[str, Any]]
    current_tool: Optional[str]
    error: Optional[str]
    metadata: Optional[Dict[str, Any]]
    agent_type: Optional[str]  # 多 Agent 时标识当前 Agent
    task_stack: Optional[list]  # 任务分解栈
    iteration_count: Optional[int]  # 迭代次数
```

#### L5 - 工具注册

```python
class ToolRegistry:
    _tools: Dict[str, BaseTool] = {}
    
    @classmethod
    def register(cls, tool: BaseTool, override: bool = False) -> None: ...
    @classmethod
    def unregister(cls, name: str) -> None: ...
    @classmethod
    def get(cls, name: str) -> BaseTool: ...
    @classmethod
    def list(cls, category: Optional[str] = None) -> list[BaseTool]: ...
    @classmethod
    async def execute(cls, name: str, args: dict) -> Any: ...
```

#### L6 - 记忆管理器

```python
class ConversationMemory:
    async def add(self, role: str, content: str, thread_id: str) -> None: ...
    async def get_history(self, thread_id: str, limit: int = 50) -> list: ...
    async def clear(self, thread_id: str) -> None: ...
    async def get_context(self, thread_id: str) -> str: ...
```

#### L7 - 多 Agent 编排

```python
class AgentOrchestrator:
    async def decompose_task(self, task: str) -> list[SubTask]: ...
    async def dispatch(self, subtask: SubTask) -> TaskResult: ...
    async def aggregate(self, results: list[TaskResult]) -> str: ...
    async def run(self, user_input: str) -> str: ...
```

#### L8 - API 流式端点

```python
@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    async def event_stream():
        async for event in graph.astream_events(input_data, config, version="v1"):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
            elif event["event"] == "on_tool_start":
                yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
            elif event["event"] == "on_tool_end":
                yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name']})}\n\n"
        yield "data: {\"type\": \"done\"}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

#### L9 - 前端流式渲染

```typescript
for await (const event of streamChat(message, threadId)) {
  switch (event.type) {
    case 'token':
      appendToLastMessage(event.content!);
      break;
    case 'tool_start':
      showToolCall(event.tool!, 'running');
      break;
    case 'tool_end':
      updateToolCall(event.tool!, 'completed', event.output);
      break;
    case 'done':
      finalizeMessage();
      break;
  }
}
```

---

## 最佳实践

### 1. 需求发现原则
- 先问开放性问题，再问选择题
- 每个问题只问一个维度
- 用户的回答要记录下来，不要遗漏
- **AI 行为**：不要一次性把所有问题抛给用户，要逐步引导

### 2. 架构设计原则
- 从简单开始：优先选择单 Agent
- 只有在需要时才引入多 Agent 编排
- 工具按需启用，不要过度设计
- **AI 行为**：每层确认时要向用户解释该层的作用

### 3. 配置生成原则
- 配置是单一事实来源
- 所有代码生成基于配置，不要手动修改生成后的代码
- 配置变更时重新生成代码
- **AI 行为**：生成配置后向用户展示关键配置项，让用户确认

### 4. 代码生成原则
- 每层只关注自己的职责
- 下层不依赖上层，上层依赖下层
- 层间通过明确接口通信
- 可以在不修改其它层的情况下替换任意一层
- **AI 行为**：优先使用 `generate.py` 脚本，手动生成为备选

### 5. 工具设计原则
- 每个工具只做一件事，做好一件事
- 工具参数使用 Pydantic 模型严格定义
- 工具函数包含详细的 docstring

### 6. 错误处理
- 每个工具节点有 try-catch
- 路由节点有 fallback 逻辑
- 前端显示友好的错误提示
- **AI 行为**：部署测试时，如果遇到错误，分析错误原因并修复

### 7. 安全性
- API Key 从环境变量读取
- 用户输入进行长度限制
- 工具调用有超时机制

---

## 输出要求

每次构建完成后，必须确保：

1. **agent_requirements.md**：需求文档完整
2. **architecture.md**：架构设计文档完整
3. **agent.yaml**：配置文件完整
4. **L1-L10 每层代码完整**：不遗漏任何一层
5. **后端可运行**：`pip install -r requirements.txt && uvicorn app.main:app --reload`
6. **前端可运行**：`npm install && npm run dev`
7. **全栈可运行**：`docker-compose up`
8. **流式响应**：SSE 流式传输正常工作
9. **错误处理**：API 错误返回合理的错误信息
10. **类型安全**：TypeScript 和 Python 类型定义完整

---

## 使用示例

### 示例 1：研究助手

```
用户描述：我需要一个研究助手，可以搜索网页、总结内容、保存笔记
```

**第1步 - 需求记录**：
```markdown
- 类型: research
- LLM: GPT-4o
- 工具: 搜索 + 网页抓取 + 保存笔记
- 记忆: 对话缓冲
- 界面: 聊天窗口
```

**第2步 - 模板选择**：模板 B (Research)

**第3步 - 配置生成**：生成 `agent.yaml`（研究助手配置）

**第4步 - 代码生成**：生成各层代码

**第5步 - 部署验证**：docker-compose up

---

### 示例 2：数据分析 Agent

```
用户描述：帮我做一个数据分析 Agent，能上传 CSV 文件，分析数据，生成图表
```

**第1步 - 需求记录**：
```markdown
- 类型: data_analysis
- LLM: Claude 3.5 Sonnet
- 工具: CSV 读取 + 数据分析 + 图表生成
- 记忆: 对话缓冲 + 文件缓存
- 界面: 聊天窗口 + 文件上传 + 图表展示
```

**第2步 - 模板选择**：模板 E (Data Analysis)

**第3步 - 配置生成**：生成 `agent.yaml`

**第4步 - 代码生成**：生成各层代码，L9 前端增加文件上传和图表面板

**第5步 - 部署验证**：docker-compose up

---

### 示例 3：多 Agent 客服系统

```
用户描述：做一个客服 Agent，先分类问题，然后路由到不同专业 Agent，最后总结回答
```

**第1步 - 需求记录**：
```markdown
- 类型: customer_service
- LLM: GPT-4o (监督) + GPT-4o-mini (子 Agent)
- 工具: 订单查询、退货处理、产品咨询
- 记忆: 对话缓冲 + 客户历史
- 编排: 多 Agent（监督+路由+聚合）
- 界面: 聊天窗口 + 工单状态
```

**第2步 - 模板选择**：模板 D (Customer Service)

**第3步 - 配置生成**：生成 `agent.yaml`，定义 5 个子 Agent

**第4步 - 代码生成**：生成各层代码，L4 使用多 Agent 图

**第5步 - 部署验证**：docker-compose up