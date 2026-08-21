# agent.yaml 字段字典

| 字段 | 含义 | 默认值 | 说明 |
|---|---|---|---|
| `agent.name` | 应用名 | `Agent` | 用于标题/日志/Agent Card |
| `agent.type` | 用途类型 | `chat` | chat/research/coding/customer_service/data_analysis 等 |
| `agent.description` | 一句话描述 | — | 建议必填，注入系统提示词与前端副标题 |
| `llm.provider` | 提供商 | `openai` | openai/anthropic/deepseek/gemini/glm/kimi/ollama/qwen |
| `llm.model` | 模型名 | `gpt-4o-mini` | 如 claude-sonnet-4 / deepseek-chat / qwen-max |
| `llm.api_base` | 自定义端点 | 空 | 兼容 OpenAI 协议的第三方服务 |
| `llm.temperature` / `max_tokens` | 采样参数 | `0.7` / `4096` | — |
| `interface.retry.max_retries` | 重试次数 | `3` | tenacity 指数退避 |
| `prompt.system_prompt` | 系统提示词 | 通用助手 | 决定人设，支持多行 |
| `prompt.role_template` | 角色模板 | `default` | research_assistant/code_reviewer 等 |
| `framework` | 运行时框架 | `langgraph` | 或 `bare`（零框架依赖） |
| `agent_framework.graph_type` | 图类型 | `single` | 多智能体用 `supervisor` |
| `agent_framework.plan` / `reflect` | 规划/反思节点 | `false` | 需要思考链时开启 |
| `tools.enabled` | 启用工具列表 | 见 defaults.md | 名字必须在通用工具集或 custom 中 |
| `tools.custom[]` | 自定义工具 | `[]` | `{name, description, parameters}`；生成后带 TODO 业务逻辑占位 |
| `memory.type` | 记忆类型 | `buffer` | 会话内缓冲；知识库场景配 knowledge.enabled |
| `memory.max_messages` | 历史条数上限 | `50` | — |
| `orchestration.mode` | 编排模式 | `single` | `supervisor` 时需 `agents[]` |
| `orchestration.agents[]` | 子智能体 | — | `{name, role, system_prompt, tools}` + 聚合器自动添加 |
| `api.auth_enabled` | API Key 认证 | `false` | 开启后中间件校验 |
| `api.rate_limit` | 每分钟限流 | `60` | — |
| `api.cors_origins` | 跨域白名单 | localhost:5173/3000 | 前端地址 |
| `security.SECURITY_ENABLED` | 安全强制 | `true` | 注入防御 + PII 双向脱敏 |
| `deployment.type` | 部署方式 | `local` | docker 可选 |

## 校验规则（validate_config 强制）

1. 必填：`agent.name`、`llm.provider`、`llm.model`
2. `framework` ∈ {langgraph, bare, openai-agents, claude-sdk, adk, autogen}；
   后四者生成器暂输出适配器骨架，生产可用为前两者
3. `tools.enabled` ⊆ 通用工具集 ∪ `tools.custom[].name`
4. `orchestration.mode: "supervisor"` 时 `agents[]` 至少 2 个且 name 不重复
