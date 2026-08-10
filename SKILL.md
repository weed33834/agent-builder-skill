---
name: "agent-builder"
description: "Builds production-ready AI agents from natural-language requirements. Invoke when user wants to create, build, or generate an AI agent or assistant application."
---

# Universal Agent Builder

## Overview

**Universal Agent Builder** is a **meta-skill** — it does not directly provide a ready-made Agent. Instead, through a series of structured guidance steps, it **automatically generates** a complete, runnable AI Agent application that meets user requirements.

**Core capability**: You (the AI developer) guide the user (the requirements provider) from a natural-language description all the way to a fully delivered, runnable Agent, using this skill.

---

## AI Behavior Guidelines

> When you use this skill, you play a triple role: **AI Product Manager + Architect + Full-Stack Engineer**. You must:
> 1. **Guide proactively**: Do not wait for the user to spell out every requirement; ask step by step.
> 2. **Record decisions**: Write every decision from each step into a file.
> 3. **Explain choices**: Help the user understand the pros and cons of each option.
> 4. **Deliver runnable code**: The final product must be a complete, launchable application.

**Keep in mind**:
- You are not writing documentation; you are **guiding the user through the building process**.
- At the end of each conversation, the user should be clearer about what they want than before.
- Do not generate all the code at once; proceed step by step.
- At every step, get the user's confirmation before continuing.

---

## When to Use / When NOT to Use

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

## Core Workflow (5-Step Method)

```
Step 1: Discovery  →  Step 2: Architecture Design  →  Step 3: Config Generation  →  Step 4: Code Generation  →  Step 5: Deployment & Verification
  User states requirements   Choose template & architecture    Generate YAML config       Generate complete code         Launch & test
```

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
# Agent Requirements Document

## Basic Information
- **Name**: ResearchAssistant
- **Type**: research
- **Purpose**: A web search research assistant that can search, summarize, and save notes

## Technology Selection
- **LLM Provider**: openai
- **LLM Model**: gpt-4o
- **Local Deployment**: No

## Tools
- web_search: Web search
- web_fetch: Web fetching
- current_time: Get current time
- calculate: Math calculation
- save_note: Save notes (custom)

## Memory & Knowledge
- **Memory Type**: buffer
- **Knowledge Base**: None

## Orchestration
- **Mode**: single

## Interface
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
# Architecture Design Document

## Architecture Blueprint
Research Assistant — Single Agent

## Per-Layer Configuration

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
# ============================================================
# agent.yaml - Complete Agent configuration (single source of truth)
# All code generation is based on this configuration
# ============================================================

# Agent basic information
agent:
  name: "ResearchAssistant"
  type: "research"
  description: "A web search research assistant that can search the web, summarize content, and save notes"

# L1: LLM Layer
llm:
  provider: "openai"           # openai | anthropic | deepseek | ollama
  model: "gpt-4o"
  api_base: ""                 # Optional, for third-party services compatible with the OpenAI format
  temperature: 0.7
  max_tokens: 4096

# L2: Model Interface Layer
interface:
  retry:
    enabled: true
    max_retries: 3
    delay: 1.0
  fallback:
    enabled: false
    models: []

# L3: Prompt Engineering Layer
prompt:
  system_prompt: |
    你是一个专业的研究助手。你的任务是：
    1. 理解用户的问题
    2. 搜索相关信息
    3. 总结和分析结果
    4. 给出有深度、有来源的回答
  role_template: "research_assistant"
  output_format: "markdown"

# L4: Agent Framework Layer
agent_framework:
  graph_type: "single"         # single | multi | supervisor
  max_iterations: 10
  checkpointer: "memory"       # memory | postgres | none

# L5: Tool Execution Layer
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

# L6: Memory & Knowledge Layer
memory:
  type: "buffer"               # buffer | vector | both
  max_messages: 50
  knowledge:
    enabled: false
    vector_store: "chroma"

# L7: Orchestration Layer
orchestration:
  mode: "single"               # single | multi
  max_subtasks: 5
  timeout: 120

# L8: API Service Layer
api:
  auth_enabled: false
  rate_limit: 60
  cors_origins:
    - "http://localhost:5173"
    - "http://localhost:3000"

# L9: Frontend UI Layer
ui:
  type: "chat"                 # chat | dashboard | minimal
  title: "Research Assistant"
  features:
    - tool_visualization
    - session_management
    - markdown_rendering

# L10: Infrastructure Layer
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

---

### Step 4: Code Generation

**Goal**: Based on the `agent.yaml` configuration, generate the complete code layer by layer.

**AI behavior**:
1. Run the `scripts/generate.py` script to generate the code
2. Or manually generate the code layer by layer (in L1 → L10 order)
3. After generating each layer, verify the correctness of that layer's code
4. Finally produce a complete project directory

#### Using the Generation Script (Recommended)

```bash
# Syntax: python scripts/generate.py <config.yaml> <output_dir>
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

# Copy the environment variable template
cp .env.example .env

# Edit .env and fill in the LLM API Key
# OPENAI_API_KEY=sk-...
```

**AI dialogue example**:
```
AI: The code has been generated! Now let's deploy. First, please fill in your API Key in the .env file.
If you're using OpenAI, you need to set OPENAI_API_KEY.
```

#### 5.2 Start the Backend

```bash
# Install dependencies
cd generated_agent
pip install -r requirements.txt

# Start the backend
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

## Architecture Template Library

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
# L3 layer: Research assistant role template
SYSTEM_PROMPT = """You are a professional research assistant. Your tasks are:
1. Understand the user's question
2. Search for relevant information
3. Summarize and analyze results
4. Provide in-depth, sourced answers"""

# Custom tool
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
# L3 layer: Coding assistant role template
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

# Code execution tool
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

# L4 layer: Multi-Agent graph
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
# L5 layer: Data analysis tools
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

## Complete Architecture Layers (10 Layers)

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

# Define sub-Agents
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

# Create the supervisor Agent
supervisor = create_supervisor(
    agents=[research_agent, analysis_agent],
    model=llm,
    prompt="You coordinate research and analysis tasks.",
)

# Compile and run
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

# A2A protocol endpoints
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

## Complete Call Chain

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

## A2A Protocol (Agent-to-Agent)

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

## MCP Protocol Update (2026-07-28 Stateless Spec)

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

# Create MCP server (stateless, no handshake needed)
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

# Start MCP service (stdio or HTTP)
if __name__ == "__main__":
    mcp.run(transport="stdio")
    # Or HTTP mode:
    # mcp.run(transport="http", host="0.0.0.0", port=8001)
```

---

## Technology Stack

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

## Code Generation Reference

### Key Patterns for Generating from Config

When generating code, always follow these principles:

1. **Config-driven**: All variable behavior is read from `agent.yaml`; do not hardcode
2. **Generate on demand**: Only generate the code that is needed; do not keep unused modules
3. **Template substitution**: Use template strings to substitute config values rather than complex AST operations
4. **Stay readable**: Generated code should be readable and manually modifiable

### Config → Code Mapping Table

```python
# agent.yaml config items → code generation rules per layer

config = {
    "llm": {"provider": "openai", "model": "gpt-4o"},
    "tools": {"enabled": ["web_search", "web_fetch"]},
    "prompt": {"system_prompt": "You are a research assistant..."},
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

---

## Best Practices

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

## Output Requirements

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

## Usage Examples

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
