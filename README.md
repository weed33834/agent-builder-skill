# Universal Agent Builder (万能 Agent 构建器)

一个完整的 **10 层架构** Agent 构建技能，从大模型到前端 UI，提供开箱即用的智能体应用开发框架。

## 架构总览

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

## 特性

- **10 层架构**：从 L1 大模型到 L10 基础设施，每层职责清晰
- **多模型支持**：OpenAI、Anthropic、DeepSeek、Ollama 一键切换
- **LangGraph Agent**：有状态图执行，支持工具调用和条件路由
- **工具注册表**：统一管理工具注册、发现和执行
- **SSE 流式响应**：实时推送 LLM 输出和工具调用状态
- **多 Agent 编排**：任务分解、路由、结果聚合
- **配置驱动生成**：通过 `agent.yaml` 定义 Agent 行为，`generate.py` 一键生成完整项目
- **5 种 Agent 模板**：聊天助手、研究助手、编码助手、客服系统、数据分析
- **React 前端**：现代化聊天界面，工具调用可视化，动态配置渲染
- **Docker 部署**：前后端容器化，一键启动

## 快速开始

### 方式一：使用模板生成 Agent

```bash
# 使用预设模板生成 Agent
python scripts/generate.py templates/agent-types/research.yaml ./my_agent

# 进入生成的目录
cd my_agent

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 LLM API Key

# 启动后端
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 启动前端
cd frontend && npm install && npm run dev
```

### 方式二：使用 Docker

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 LLM API Key

# 2. 使用 Docker 启动
docker-compose up -d

# 3. 访问前端
# http://localhost:5173

# 4. 访问 API 文档
# http://localhost:8000/docs
```

### 方式三：手动启动模板

```bash
# 后端
cd templates/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd templates/frontend
npm install
npm run dev
```

## 项目结构

```
agent-builder-skill/
├── SKILL.md                        # 完整技能文档（5步引导法）
├── README.md                       # 项目说明
├── docker-compose.yml              # Docker 部署配置
├── .env.example                    # 环境变量模板
├── LICENSE                         # Apache 2.0
├── scripts/
│   └── generate.py                 # Agent 代码生成器
├── templates/
│   ├── agent-types/                # Agent 类型模板
│   │   ├── chat.yaml               # 聊天助手
│   │   ├── research.yaml           # 研究助手
│   │   ├── coding.yaml             # 编码助手
│   │   ├── customer_service.yaml   # 客服系统（多Agent）
│   │   └── data_analysis.yaml      # 数据分析
│   ├── backend/                    # 后端代码模板
│   │   ├── app/
│   │   │   ├── l1_llm/            # 大模型适配器
│   │   │   ├── l2_interface/      # 模型接口层
│   │   │   ├── l3_prompt/         # 提示工程层
│   │   │   ├── l4_agent/          # Agent 框架层
│   │   │   ├── l5_tools/          # 工具执行层
│   │   │   ├── l6_memory/         # 记忆与知识层
│   │   │   ├── l7_orchestrator/   # 编排调度层
│   │   │   ├── l8_api/            # API 服务层
│   │   │   │   ├── routes/        # 路由（chat/health/config）
│   │   │   │   ├── middleware/    # 中间件
│   │   │   │   └── schemas.py     # 数据模型
│   │   │   ├── l10_infra/         # 基础设施层
│   │   │   └── main.py            # 应用入口
│   │   └── requirements.txt
│   └── frontend/                   # 前端代码模板
│       ├── src/
│       │   ├── l8_api/            # API 客户端（SSE）
│       │   ├── l9_ui/             # UI 组件
│       │   │   ├── chat/          # 聊天界面
│       │   │   ├── layout/        # 布局组件
│       │   │   └── shared/        # 共享组件
│       │   ├── styles/            # 样式
│       │   └── types/             # 类型定义
│       └── package.json
└── scripts/
    └── generate.py                 # 代码生成器
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| LLM_PROVIDER | 模型提供商 | openai |
| LLM_MODEL | 模型名称 | gpt-4o |
| LLM_API_KEY | API Key | - |
| LLM_API_BASE | 自定义 API 地址 | - |
| LLM_TEMPERATURE | 温度参数 | 0.7 |
| LLM_MAX_TOKENS | 最大 Token 数 | 4096 |
| LLM_RETRY_COUNT | 重试次数 | 3 |
| LLM_RETRY_DELAY | 重试延迟(秒) | 1.0 |
| MODEL_FALLBACK_ENABLED | 模型回退 | false |
| MAX_TOOL_CALLS | 最大工具调用次数 | 10 |
| TOOL_TIMEOUT | 工具超时(秒) | 30 |
| MEMORY_TYPE | 记忆类型 | buffer |
| MEMORY_MAX_MESSAGES | 最大消息数 | 50 |
| API_KEY | API 认证密钥 | - |
| RATE_LIMIT | 限流(次/分钟) | 60 |
| LOG_LEVEL | 日志级别 | INFO |
| LANGCHAIN_TRACING_V2 | LangChain 追踪 | false |
| LANGCHAIN_API_KEY | LangChain API Key | - |
| LANGCHAIN_PROJECT | LangChain 项目名 | - |

## Agent 类型模板

| 模板 | 类型 | 适用场景 | 复杂度 |
|------|------|----------|--------|
| `chat.yaml` | 聊天助手 | 通用对话、简单问答 | 低 |
| `research.yaml` | 研究助手 | 搜索、总结、分析信息 | 中 |
| `coding.yaml` | 编码助手 | 编写代码、审查、调试 | 中 |
| `customer_service.yaml` | 客服系统 | 多 Agent 协作客服 | 高 |
| `data_analysis.yaml` | 数据分析 | 数据上传、分析、可视化 | 高 |

## 技术栈

- **后端**: Python 3.12+, FastAPI, LangChain, LangGraph
- **前端**: React 18, TypeScript, Vite
- **部署**: Docker, Docker Compose
- **LLM**: OpenAI, Anthropic, DeepSeek, Ollama

## 许可证

Apache License 2.0
