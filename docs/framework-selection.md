# 框架选型全景与中立架构设计（Framework Selection & Agnostic Architecture）

> **背景**：v1 默认 LangChain/LangGraph 系。这是错误的起点——框架应该由用户按场景选择，
> 平台层（generate.py / 模板 / 管理控制台）必须**框架中立**：核心逻辑与具体框架解耦，
> 通过适配器（Adapter）接入任意框架，生成器让用户先选框架再生成。

---

## 一、框架全景矩阵（选型地图）

按**类型**分 6 类，每类给出现状与适用场景。用户/开发者在这里选型，而不是被默认绑定。

### 1️⃣ 通用 Agent 编排框架（语言绑定、图/循环式）

| 框架 | 语言 | 核心模型 | 多Agent | 记忆 | 流式 | HITL | 成熟度 | 许可证 | 适合 |
|------|------|---------|--------|------|------|------|--------|--------|------|
| **LangGraph** | Python/JS | StateGraph+Command | ✅ Supervisor/子图 | ✅ checkpoint/short-long-term | ✅ | ✅ interrupt | 高 | MIT | 生产级复杂编排、状态机、图可视化 |
| **LlamaIndex** | Python | AgentRunner/Workflows | ✅ | ✅ | ✅ | 🔶 | 高 | MIT | RAG 强场景、文档为中心 |
| **Haystack** | Python | Pipeline/Agents | 🔶 | ✅ | ✅ | 🔶 | 高 | Apache-2.0 | 搜索/RAG 管线、企业检索 |
| **自研核心** | 任意 | 自己的 Loop | 自己实现 | 自己实现 | ✅ | 自己实现 | 自控 | 自定 | 完全可控、无依赖、教学/审计 |

### 2️⃣ 多 Agent 协作框架（群体智能、角色化）

| 框架 | 语言 | 核心模型 | 协作模式 | 记忆 | 成熟度 | 许可证 | 适合 |
|------|------|---------|---------|------|--------|--------|------|
| **AutoGen / AG2** | Python | ConversableAgent+GroupChat | 对话式多方 | ✅ | 高 | MIT/CC | 多角色讨论、代码生成、研究 |
| **CrewAI** | Python | Crew+Agent+Task | 角色分工流水线 | ✅ | 高 | MIT | 业务团队模拟、任务流水线 |
| **MetaGPT** | Python | SOP 角色化 | 标准作业流程 | 🔶 | 中 | MIT | 软件公司 SOP 模拟 |
| **AgentScope** | Python | 消息传递 | 分布式多Agent | 🔶 | 中 | Apache-2.0 | 大规模仿真、阿里系 |
| **CAMEL** | Python | 角色扮演对话 | 双Agent互聊 | 🔶 | 中 | Apache-2.0 | 研究、角色扮演探索 |

### 3️⃣ 厂商原生 SDK（绑定自家模型生态）

| SDK | 厂商 | 核心模型 | 特点 | 适合 |
|-----|------|---------|------|------|
| **Claude Agent SDK**（原 Claude Code SDK） | Anthropic | Agent Loop+Subagent | 工具循环/上下文压缩/生命周期钩子最完善 | Claude 系模型、代码类 Agent |
| **OpenAI Agents SDK**（Swarm 继任） | OpenAI | Agent+Handoffs+Guardrails | 轻量、交接制、追踪内置 | OpenAI 系模型、快速交付 |
| **Google ADK** | Google | Agent+RemoteA2AAgent | A2A 原生、多模态、Live 流式 | Gemini 系、Google 生态 |
| **Semantic Kernel** | Microsoft | Kernel+Planner+Plugins | 企业级、.NET/Python/Java、与 Azure AI Foundry 深度集成 | 微软企业栈 |
| **Microsoft Agent Framework** | Microsoft | Agent+群聊+技能 | 跨语言、MCP 优先、与 Copilot Studio 打通 | 微软生态企业应用 |
| **Gemini API 原生 Agent** | Google | 原生工具循环 | 简单直接、免费额度 | Gemini 轻量场景 |

### 4️⃣ 协议与标准层（跨框架互操作，不是框架但必选）

| 协议 | 作用 | 本平台落点 |
|------|------|-----------|
| **MCP**（Model Context Protocol） | 工具/资源统一接入 | L5 工具层：MCP 客户端/服务端（✅ 已实现） |
| **A2A**（Agent-to-Agent） | 智能体间通信（Agent Card + Task 生命周期） | L7 编排层：a2a_client/server（✅ 已实现） |
| **OTel GenAI 语义约定** | 可观测性标准 | L13 监控层（✅ 已实现） |
| **Agent Card / Agent Metadata** | Agent 能力发现 | L7 已暴露 `/.well-known/agent.json` |

### 5️⃣ 低代码/可视化平台（非编码用户）

| 平台 | 厂商 | 特点 | 适合 |
|------|------|------|------|
| Dify | 开源 | 可视化编排+RAG+插件市场 | 非编码团队快速上线 |
| Flowise | 开源 | 拖拽式 LangChain 包装 | 原型验证 |
| n8n | 开源 | 通用工作流+AI 节点 | 自动化流程 |
| Coze（扣子） | 字节 | 插件市场丰富、免部署 | 国内业务、bot 商店 |
| 阿里云百炼 / 百度千帆 | 阿里/百度 | 国内大模型平台 | 国内云生态 |

### 6️⃣ 选型决策树（按需求收敛）

```
你的场景是？
├─ 生产级复杂编排 / 图状态机 / 需要 checkpoint 恢复 → LangGraph
├─ 快速交付单一 Agent + 厂商绑定
│   ├─ 用 Claude → Claude Agent SDK
│   ├─ 用 OpenAI → OpenAI Agents SDK
│   ├─ 用 Gemini / 需要 A2A → Google ADK
│   └─ 微软企业栈 → Semantic Kernel / MS Agent Framework
├─ 多角色讨论 / 群体智能 → AutoGen / CrewAI
├─ 文档检索为主 → LlamaIndex / Haystack
├─ 非编码 / 可视化 → Dify / Coze / Flowise
├─ 完全自主可控 / 审计 / 教学 → 自研核心 + MCP + A2A
└─ 混合（推荐）→ 平台层选一个主框架，其余经 MCP/A2A 互操作
```

---

## 二、框架中立架构（平台层设计）

核心原则：**业务逻辑与框架解耦，框架可插拔**。10 层架构中只有 L4（运行时）与框架强相关，
其余层（L1 模型 / L2 接口 / L3 提示 / L5 工具 / L6 记忆 / L7 编排 / L8 API / L9 UI / L10 基建）
全部框架无关，天然可复用。

```
┌─────────────────────────────────────────────────────┐
│  L9 管理控制台 / L8 API（框架无关）                    │
├─────────────────────────────────────────────────────┤
│  L3 提示 · L5 工具(MCP) · L6 记忆 · L7 编排(A2A)      │  ← 框架无关，统一接口
├─────────────────────────────────────────────────────┤
│  L4 AgentRuntime 抽象接口                            │
│  run() stream() invoke_tools() checkpoint() hooks() │
├──────┬────────┬────────┬────────┬────────┬──────────┤
│ Lang │ OpenAI │ Claude │ Google │ AutoGen│ 自研核心  │
│ Graph│ Agents │ Agent  │ ADK    │ /Crew  │ (Bare)   │
│ Adap │ SDK Ad │ SDK Ad │ Adapter│ Adapter│ Adapter  │
│ ter  │ apter  │ apter  │        │        │          │
└──────┴────────┴────────┴────────┴────────┴──────────┘
```

### 2.1 AgentRuntime 抽象（L4 唯一对外契约）

```python
class AgentRuntime(ABC):
    """框架无关的运行时契约——所有适配器实现同一接口"""
    framework: str                      # "langgraph" | "openai-agents" | "claude-sdk" | "adk" | "autogen" | "bare"

    @abstractmethod
    async def run(self, messages, config) -> AgentResult: ...
    @abstractmethod
    def stream(self, messages, config) -> AsyncIterator[AgentEvent]: ...
    @abstractmethod
    def bind_tools(self, tools: list[ToolSpec]) -> None: ...
    @abstractmethod
    def checkpoint(self, thread_id) -> CheckpointHandle: ...
    @abstractmethod
    def hooks(self) -> LifecycleHooks: ...        # on_start/on_tool/on_error...
```

- **AgentResult**：统一输出结构（text / tool_calls / usage / latency / trace_id）
- **AgentEvent**：统一事件流（agent_message / tool_call / tool_result / done），L8 SSE 直接消费
- **ToolSpec**：JSON Schema 描述（L5 已有），适配器负责翻译成目标框架的 tool 格式

### 2.2 适配器清单（生成器可选）

| 适配器 | 目标框架 | 翻译要点 | 状态 |
|--------|---------|---------|------|
| `LangGraphAdapter` | LangGraph 1.0 | StateGraph/Command/checkpoint | ✅ 现有 graph.py 即此 |
| `OpenAIAgentsAdapter` | OpenAI Agents SDK | Agent+Handoffs+Guardrails → run/stream | 待生成 |
| `ClaudeSDKAdapter` | Claude Agent SDK | Agent Loop+Subagent+hooks | 待生成 |
| `ADKAdapter` | Google ADK | Agent+RemoteA2AAgent | 待生成 |
| `AutoGenAdapter` | AutoGen/AG2 | GroupChat → 编排映射 | 待生成 |
| `BareAdapter` | 自研核心 | 自己的 while-loop（工具循环） | 待生成（最小实现） |

### 2.3 生成器交互（generate.py 改造）

```
python scripts/generate.py agent.yaml ./out --framework langgraph
python scripts/generate.py agent.yaml ./out --framework openai-agents
python scripts/generate.py agent.yaml ./out --framework bare
python scripts/generate.py agent.yaml ./out --framework list   # 列出可选框架
```

- `agent.yaml` 新增顶层字段 `framework: langgraph | openai-agents | claude-sdk | adk | autogen | bare`
- 未指定时：**进入交互式选择菜单**（打印全景矩阵 + 决策树），不默认
- 生成差异仅限 `app/l4_agent/`（runtime + adapter + graph），其余 9 层代码不变
- 模板自带：每种框架一套 `l4_agent/` 参考实现

---

## 三、对 feature-checklist 的影响

| 变更 | 内容 |
|------|------|
| 新增 M0.x | `framework` 选型字段（agent.yaml），默认值=空，必须显式选择 |
| 新增 M3.19 | 框架中立运行时抽象（AgentRuntime 接口） |
| 新增 M3.20 | 多框架适配器（≥2 个可用适配器才算达标） |
| M3.4 改写 | "状态机管理" 改为框架无关描述（LangGraph 只是实现之一） |
| M6.17 扩充 | 跨框架互操作 = MCP(工具) + A2A(智能体) 双协议 |

> 判定标准：一个脚手架如果**只支持单一框架且无法替换**，视为"架构锁定"缺陷——
> 对照时标记 🔶（部分），替换为框架中立架构后标记 ✅。
