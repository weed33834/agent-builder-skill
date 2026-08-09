# Universal Agent Builder

## 概述

万能 Agent 构建器是一个**元技能**——它不直接提供一个现成的 Agent，而是通过自然语言描述，自动生成一个完整、可运行的前后端智能体应用。

**核心能力**：你只需用自然语言描述你想要的 Agent 功能，这个 Skill 会引导你完成全流程构建，交付一个开箱即用的程序。

---

## 完整架构分层（10层）

一个完整的 Agent 应用从最底层的大模型到最上层的用户界面，共分为 **10 层**。每一层都独立负责一个关注点，上层依赖下层，下层不感知上层。

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

| 提供商 | 模型 | 特点 |
|--------|------|------|
| **OpenAI** | GPT-4o, GPT-4o-mini, o1, o3 | 最强综合能力，生态最好 |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku | 长上下文，安全性高 |
| **DeepSeek** | DeepSeek-V3, DeepSeek-R1 | 性价比高，中文优秀 |
| **Ollama** | Qwen2.5, Llama3.1, Mistral | 本地部署，数据安全 |
| **兼容接口** | 任何 OpenAI 兼容 API | 灵活适配 |

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
| **安全过滤** | 提示注入防护 | `prompt_sanitizer.py` |

**代码结构**：
```
app/l3_prompt/
├── __init__.py
├── system_prompts.py    # 系统提示词定义
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

**工具注册机制**：
```python
class ToolRegistry:
    _tools: dict[str, BaseTool] = {}
    
    @classmethod
    def register(cls, tool: BaseTool) -> None:
        cls._tools[tool.name] = tool
    
    @classmethod
    def get_tools(cls, names: list[str] | None = None) -> list[BaseTool]:
        if names is None:
            return list(cls._tools.values())
        return [cls._tools[n] for n in names if n in cls._tools]
    
    @classmethod
    async def execute(cls, name: str, args: dict) -> str: ...
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

**记忆架构**：
```
短期记忆 (Buffer)        长期记忆 (Vector Store)
┌──────────────────┐    ┌──────────────────────┐
│ 当前会话消息       │    │ 历史对话 embeddings   │
│ (最近50条)        │    │ 文档知识库            │
│                  │    │ 用户偏好向量           │
└──────────────────┘    └──────────────────────┘
         │                        │
         └────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │  记忆管理器      │
         │  get_context()  │  → 注入到 LLM 上下文
         └─────────────────┘
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
| **重试策略** | 失败自动重试 | `RetryPolicy` |
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
| **CORS** | 跨域支持 | `CORSMiddleware` |

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

### 完整调用链

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

## 工作流程

### 第 1 步：需求分析

当你描述你的 Agent 想法时，你需要分析以下维度：

| 维度 | 问题 | 示例 |
|------|------|------|
| **核心功能** | Agent 主要做什么？ | 搜索研究、代码审查、客服问答、数据分析 |
| **输入方式** | 用户如何与 Agent 交互？ | 文本聊天、文件上传、URL 输入 |
| **输出形式** | Agent 返回什么？ | 文本回答、图表、代码、报告 |
| **工具需求** | Agent 需要调用哪些外部能力？ | 网页搜索、API 调用、数据库查询、文件读写 |
| **记忆需求** | 需要对话历史/长期记忆吗？ | 短期会话记忆、向量数据库长期记忆 |
| **多智能体** | 需要多个 Agent 协作吗？ | 单 Agent、多 Agent 编排、Managers + Workers |

### 第 2 步：架构设计

根据需求分析，选择对应的架构蓝图：

#### 单 Agent 架构（适合简单任务）
```
用户输入 → L8→L7→L6→L4→L3→L2→L1→L2→L4→L5/L4→L8→L9→输出
```

#### 多 Agent 编排（适合复杂任务）
```
用户输入 → L7 监督Agent → 任务分解 → 多个L4 Agent并行 → L7 结果聚合 → 输出
```

#### Agent + RAG（适合知识密集型任务）
```
用户输入 → L6 检索 → 向量数据库 → 增强上下文 → L4 Agent → 输出
```

### 第 3 步：生成代码

根据架构设计，按 L1→L10 的顺序逐层生成代码。每层生成时参考对应模板。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **L1 大模型** | GPT-4o / Claude / DeepSeek / Ollama | 多种模型支持 |
| **L2 模型接口** | LangChain Core | 统一 LLM 调用抽象 |
| **L3 提示工程** | LangChain Prompts | 提示词模板和解析器 |
| **L4 Agent 框架** | LangGraph | 有状态 Agent 编排图 |
| **L5 工具执行** | LangChain Tools | 工具注册和执行 |
| **L6 记忆与知识** | LangChain Memory / ChromaDB | 记忆和向量检索 |
| **L7 编排调度** | LangGraph (多 Agent) | 多 Agent 协作 |
| **L8 API 服务** | FastAPI + SSE | 高性能异步 API |
| **L9 前端展示** | React 18 + TypeScript | 现代前端 |
| **L10 基础设施** | Docker + Docker Compose | 部署和运维 |

---

## 代码生成参考

### L1 - 大模型适配器 (l1_llm/base.py)

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.runnables import Runnable

class LLMAdapter(ABC):
    """LLM 适配器抽象基类"""
    
    @abstractmethod
    async def invoke(self, messages: list, tools: Optional[list] = None) -> AIMessage:
        """调用 LLM"""
        ...
    
    @abstractmethod
    async def stream(self, messages: list, tools: Optional[list] = None) -> AsyncIterator[str]:
        """流式调用 LLM"""
        ...
    
    @abstractmethod
    def bind_tools(self, tools: list) -> Runnable:
        """绑定工具到 LLM"""
        ...
```

### L1 - 工厂方法 (l1_llm/factory.py)

```python
def create_llm(provider: str, model: str, **kwargs) -> LLMAdapter:
    """根据配置创建 LLM 实例"""
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

### L3 - 提示词构建器 (l3_prompt/prompt_builder.py)

```python
class PromptBuilder:
    """链式提示词构建器"""
    
    def __init__(self):
        self._system: Optional[str] = None
        self._tools: list = []
        self._history: list = []
        self._context: dict = {}
        self._examples: list = []
    
    def with_system(self, prompt: str) -> "PromptBuilder": ...
    def with_tools(self, tools: list) -> "PromptBuilder": ...
    def with_history(self, messages: list) -> "PromptBuilder": ...
    def with_context(self, **kwargs) -> "PromptBuilder": ...
    def with_examples(self, examples: list) -> "PromptBuilder": ...
    def build(self) -> list[dict]: ...
```

### L4 - Agent 状态 (l4_agent/state.py)

```python
from typing import TypedDict, Annotated, Sequence, Optional, Any, Dict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """Agent 状态的完整类型定义"""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_step: Optional[str]
    tool_results: Optional[Dict[str, Any]]
    current_tool: Optional[str]
    error: Optional[str]
    metadata: Optional[Dict[str, Any]]
    agent_type: Optional[str]  # 多 Agent 时标识当前 Agent
    task_stack: Optional[list]  # 任务分解栈
```

### L5 - 工具注册 (l5_tools/registry.py)

```python
class ToolRegistry:
    """全局工具注册表"""
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
    def execute(cls, name: str, args: dict) -> Any: ...
```

### L6 - 记忆管理器 (l6_memory/buffer.py)

```python
class ConversationMemory:
    """对话记忆管理器"""
    
    async def add(self, role: str, content: str, thread_id: str) -> None: ...
    async def get_history(self, thread_id: str, limit: int = 50) -> list: ...
    async def clear(self, thread_id: str) -> None: ...
    async def get_context(self, thread_id: str) -> str: ...
```

### L7 - 多 Agent 编排 (l7_orchestrator/orchestrator.py)

```python
class AgentOrchestrator:
    """多 Agent 编排器"""
    
    async def decompose_task(self, task: str) -> list[SubTask]: ...
    async def dispatch(self, subtask: SubTask) -> TaskResult: ...
    async def aggregate(self, results: list[TaskResult]) -> str: ...
    async def run(self, user_input: str) -> str: ...
```

### L8 - API 流式端点 (l8_api/routes/chat.py)

```python
@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """SSE 流式聊天端点"""
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

### L9 - 前端流式渲染 (l9_ui/chat/ChatWindow.tsx)

```typescript
// 使用 SSE AsyncGenerator 流式渲染
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

## 使用示例

### 示例 1：网页搜索研究助手

```
用户描述：我需要一个研究助手，可以搜索网页、总结内容、保存笔记
```

**各层配置**：
- **L1**: GPT-4o (主力模型)
- **L2**: 标准接口 + 自动重试
- **L3**: 研究助手角色模板
- **L4**: 单 Agent 图 (agent → tools → agent)
- **L5**: web_search, web_fetch, save_note
- **L6**: 对话缓冲 + 笔记长期存储
- **L7**: 单 Agent，无编排
- **L8**: 标准聊天 API
- **L9**: 聊天界面 + 笔记管理面板
- **L10**: Docker Compose 部署

### 示例 2：数据分析 Agent

```
用户描述：帮我做一个数据分析 Agent，能上传 CSV 文件，分析数据，生成图表
```

**各层配置**：
- **L1**: Claude 3.5 Sonnet (长上下文)
- **L2**: 流式接口 + 大窗口支持
- **L3**: 数据分析师角色模板
- **L4**: 单 Agent 图 + 文件处理节点
- **L5**: read_csv, analyze_data, generate_chart
- **L6**: 对话缓冲 + 文件缓存
- **L7**: 单 Agent
- **L8**: 聊天 API + 文件上传端点
- **L9**: 聊天界面 + 文件上传 + 图表展示
- **L10**: Docker Compose 部署

### 示例 3：多 Agent 客服系统

```
用户描述：做一个客服 Agent，先分类问题，然后路由到不同专业 Agent，最后总结回答
```

**各层配置**：
- **L1**: GPT-4o-mini (子Agent) + GPT-4o (监督Agent)
- **L2**: 多模型实例管理
- **L3**: 客服角色模板 + 分类模板
- **L4**: 多 Agent 子图
- **L5**: 订单查询, 退货处理, 产品咨询
- **L6**: 对话缓冲 + 客户历史查询
- **L7**: 监督 Agent → 分类 → 路由 → 聚合
- **L8**: 聊天 API + 工单 API
- **L9**: 聊天界面 + 工单状态展示
- **L10**: Docker Compose 部署 + 日志

---

## 输出要求

每次构建完成后，必须确保：

1. **L1-L10 每层代码完整**：不遗漏任何一层
2. **后端可运行**：`cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`
3. **前端可运行**：`cd frontend && npm install && npm run dev`
4. **全栈可运行**：`docker-compose up`
5. **流式响应**：SSE 流式传输正常工作
6. **错误处理**：API 错误返回合理的错误信息
7. **类型安全**：TypeScript 和 Python 类型定义完整

---

## 最佳实践

### 1. 分层原则
- 每层只关注自己的职责
- 下层不依赖上层，上层依赖下层
- 层间通过明确接口通信
- 可以在不修改其它层的情况下替换任意一层

### 2. 工具设计原则
- 每个工具只做一件事，做好一件事
- 工具参数使用 Pydantic 模型严格定义
- 工具函数包含详细的 docstring

### 3. 状态管理
- 使用 TypedDict 定义状态结构
- 消息使用 add_messages 归约器
- 关键中间结果保存在状态中

### 4. 流式响应
- 后端使用 `astream_events` 实现流式输出
- 前端使用 `ReadableStream` 读取流
- 显示实时的工具调用状态

### 5. 错误处理
- 每个工具节点有 try-catch
- 路由节点有 fallback 逻辑
- 前端显示友好的错误提示

### 6. 安全性
- API Key 从环境变量读取
- 用户输入进行长度限制
- 工具调用有超时机制