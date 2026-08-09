# Universal Agent Builder (万能 Agent 构建器)

A complete **10-layer architecture** Agent building skill, covering everything from large language models to frontend UI, providing an out-of-the-box intelligent agent application development framework.

## Architecture Overview / 架构总览

```
┌──────────────────────────────────────────────────────────┐
│  L10  Infrastructure Layer (基础设施层)                   │
│  Docker deployment / Env config / Monitoring / Logs / CI/CD │
├──────────────────────────────────────────────────────────┤
│  L9   Frontend UI Layer (前端展示层)                      │
│  React components / Chat interface / Tool visualization / State management / Responsive │
├──────────────────────────────────────────────────────────┤
│  L8   API Service Layer (API 服务层)                      │
│  FastAPI endpoints / SSE streaming / Auth & authorization / Rate limiting / Middleware │
├──────────────────────────────────────────────────────────┤
│  L7   Orchestration Layer (编排调度层)                    │
│  Multi-agent coordination / Task decomposition / Workflow management / Conditional routing / Retry │
├──────────────────────────────────────────────────────────┤
│  L6   Memory & Knowledge Layer (记忆与知识层)             │
│  Conversation buffer / Vector storage / RAG retrieval / Knowledge base / Long-term memory │
├──────────────────────────────────────────────────────────┤
│  L5   Tool Execution Layer (工具执行层)                   │
│  Tool registry / Parameter parsing / Execution engine / Result handling / Error recovery │
├──────────────────────────────────────────────────────────┤
│  L4   Agent Framework Layer (Agent 框架层)                │
│  LangGraph graph / State management / Node definitions / Edge routing / Checkpoints │
├──────────────────────────────────────────────────────────┤
│  L3   Prompt Engineering Layer (提示工程层)               │
│  System prompts / Role templates / Few-shot / Output parsing / Instruction injection │
├──────────────────────────────────────────────────────────┤
│  L2   Model Interface Layer (模型接口层)                  │
│  LangChain unified abstraction / Model switching / Retry / Fallback / Streaming │
├──────────────────────────────────────────────────────────┤
│  L1   LLM Foundation Layer (大模型层)                     │
│  OpenAI / Anthropic / DeepSeek / Ollama / Local models   │
└──────────────────────────────────────────────────────────┘
```

## Features / 特性

- **10-Layer Architecture**: From L1 LLM to L10 infrastructure, each layer has clear responsibilities
- **Multi-Model Support**: One-click switching between OpenAI, Anthropic, DeepSeek, and Ollama
- **LangGraph Agent**: Stateful graph execution with support for tool calls and conditional routing
- **Tool Registry**: Unified management of tool registration, discovery, and execution
- **SSE Streaming Response**: Real-time push of LLM output and tool call status
- **Multi-Agent Orchestration**: Task decomposition, routing, and result aggregation
- **Configuration-Driven Generation**: Define agent behavior via `agent.yaml`, generate a complete project with `generate.py` in one step
- **5 Agent Templates**: Chat assistant, research assistant, coding assistant, customer service system, data analysis
- **React Frontend**: Modern chat interface with tool call visualization and dynamic config rendering
- **Docker Deployment**: Containerized frontend and backend, one-click launch

## Quick Start / 快速开始

### Option 1: Generate Agent from Template

```bash
# Generate an agent from a preset template
python scripts/generate.py templates/agent-types/research.yaml ./my_agent

# Enter the generated directory
cd my_agent

# Configure environment variables
cp .env.example .env
# Edit .env to fill in your LLM API Key

# Start the backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Start the frontend
cd frontend && npm install && npm run dev
```

### Option 2: Use Docker

```bash
# 1. Configure environment variables
cp .env.example .env
# Edit .env to fill in your LLM API Key

# 2. Start with Docker
docker-compose up -d

# 3. Access the frontend
# http://localhost:5173

# 4. Access the API documentation
# http://localhost:8000/docs
```

### Option 3: Manually Start the Template

```bash
# Backend
cd templates/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd templates/frontend
npm install
npm run dev
```

## Project Structure / 项目结构

```
agent-builder-skill/
├── SKILL.md                        # Complete skill documentation (5-step guided method)
├── README.md                       # Project description
├── docker-compose.yml              # Docker deployment config
├── .env.example                    # Environment variable template
├── LICENSE                         # Apache 2.0
├── scripts/
│   └── generate.py                 # Agent code generator
├── templates/
│   ├── agent-types/                # Agent type templates
│   │   ├── chat.yaml               # Chat assistant
│   │   ├── research.yaml           # Research assistant
│   │   ├── coding.yaml             # Coding assistant
│   │   ├── customer_service.yaml   # Customer service system (multi-agent)
│   │   └── data_analysis.yaml      # Data analysis
│   ├── backend/                    # Backend code templates
│   │   ├── app/
│   │   │   ├── l1_llm/            # LLM adapters
│   │   │   ├── l2_interface/      # Model interface layer
│   │   │   ├── l3_prompt/         # Prompt engineering layer
│   │   │   ├── l4_agent/          # Agent framework layer
│   │   │   ├── l5_tools/          # Tool execution layer
│   │   │   ├── l6_memory/         # Memory & knowledge layer
│   │   │   ├── l7_orchestrator/   # Orchestration layer
│   │   │   ├── l8_api/            # API service layer
│   │   │   │   ├── routes/        # Routes (chat/health/config)
│   │   │   │   ├── middleware/    # Middleware
│   │   │   │   └── schemas.py     # Data models
│   │   │   ├── l10_infra/         # Infrastructure layer
│   │   │   └── main.py            # Application entry
│   │   └── requirements.txt
│   └── frontend/                   # Frontend code templates
│       ├── src/
│       │   ├── l8_api/            # API client (SSE)
│       │   ├── l9_ui/             # UI components
│       │   │   ├── chat/          # Chat interface
│       │   │   ├── layout/        # Layout components
│       │   │   └── shared/        # Shared components
│       │   ├── styles/            # Styles
│       │   └── types/             # Type definitions
│       └── package.json
└── scripts/
    └── generate.py                 # Code generator
```

## Environment Variables / 环境变量

| Variable | Description | Default |
|----------|-------------|---------|
| LLM_PROVIDER | Model provider | openai |
| LLM_MODEL | Model name | gpt-4o |
| LLM_API_KEY | API Key | - |
| LLM_API_BASE | Custom API endpoint | - |
| LLM_TEMPERATURE | Temperature parameter | 0.7 |
| LLM_MAX_TOKENS | Maximum number of tokens | 4096 |
| LLM_RETRY_COUNT | Number of retries | 3 |
| LLM_RETRY_DELAY | Retry delay (seconds) | 1.0 |
| MODEL_FALLBACK_ENABLED | Enable model fallback | false |
| MAX_TOOL_CALLS | Maximum number of tool calls | 10 |
| TOOL_TIMEOUT | Tool timeout (seconds) | 30 |
| MEMORY_TYPE | Memory type | buffer |
| MEMORY_MAX_MESSAGES | Maximum number of messages | 50 |
| API_KEY | API authentication key | - |
| RATE_LIMIT | Rate limit (requests per minute) | 60 |
| LOG_LEVEL | Log level | INFO |
| LANGCHAIN_TRACING_V2 | LangChain tracing | false |
| LANGCHAIN_API_KEY | LangChain API Key | - |
| LANGCHAIN_PROJECT | LangChain project name | - |

## Agent Type Templates / Agent 类型模板

| Template | Type | Use Case | Complexity |
|----------|------|----------|------------|
| `chat.yaml` | Chat assistant | General conversation, simple Q&A | Low |
| `research.yaml` | Research assistant | Search, summarize, analyze information | Medium |
| `coding.yaml` | Coding assistant | Write code, review, debug | Medium |
| `customer_service.yaml` | Customer service system | Multi-agent collaborative customer service | High |
| `data_analysis.yaml` | Data analysis | Data upload, analysis, visualization | High |

## Tech Stack / 技术栈

- **Backend**: Python 3.12+, FastAPI, LangChain, LangGraph
- **Frontend**: React 18, TypeScript, Vite
- **Deployment**: Docker, Docker Compose
- **LLM**: OpenAI, Anthropic, DeepSeek, Ollama

## License / 许可证

Apache License 2.0
