# 通用智能体能力全景（市场调研 + 差距审计）

> 定位：本项目（Universal Agent Builder）作为**预装载工作流**，需覆盖市面上所有通用智能体普遍具备的基础能力。本文档 = 市场调研结论 + 能力分类 + 本项目实现状态 + 深化路线，供每次构建智能体时对照。

---

## 1. 调研依据

- **MIT《2025 AI Agent Index》**：对 30 个 SOTA 智能体（Claude Code、ChatGPT Agent、Manus、Perplexity Comet、Devin、OpenHands 等）在 **6 大维度 × 45 字段** 标注：产品概述 / 公司与责任 / 技术能力与架构 / 自主与控制 / 生态交互 / 安全与评估。
- **主流框架**：LangGraph、CrewAI、AutoGen/AG2、n8n、OpenAI Agents SDK、Claude Agent SDK、Google ADK。
- **架构共识**：通用智能体 = **LLM(大脑) + while-loop(执行循环) + 记忆(Memory) + 规划(Planning) + 工具/浏览器(手脚) + 安全护栏(Safety)**。

---

## 2. 能力全景与实现状态

状态标记：✅ 已实现并接线 · 🔶 已实现但未完全接线/较浅 · ⬜ 仅文档(deep-spec)未实现 · ➕ 本次补强

### A. 模型与推理层
| 能力 | 状态 | 深化 |
|---|---|---|
| 多提供商适配（openai/anthropic/deepseek/gemini/glm/kimi/ollama/qwen） | ✅ | 增 base_url 兼容任意 OpenAI 兼容端点 |
| 自动重试（指数退避） | ✅ retry | — |
| 模型回退链 | 🔶 FallbackChain 已定义、retry 已接线；fallback 未默认接线 | 在 ChatInterface 支持 `chat_with_fallback`，主模型失败自动降级 |
| 结构化输出 / JSON Schema 校验 | ✅ output_parsers/validator | — |
| 上下文 / Token 管理 | ✅ token_manager | 深化：长会话自动压缩/摘要注入 |
| **规划（plan）** | ➕ planner_node（`agent_framework.plan` 开关） | 深化：多步规划-执行交错、Plan-and-Execute |
| **反思 / 自愈（reflect）** | ➕ reflect_node（`agent_framework.reflect` 开关） | 深化：ReAct 反思、Self-Refine 循环、错误自动修复重试 |
| 流式（SSE token/content_block） | ✅ | — |

### B. 工具与执行层
| 能力 | 状态 | 深化 |
|---|---|---|
| 函数调用（tool calling） | ✅ | — |
| 通用工具集：web_search / web_fetch / current_time / calculate | ✅ | — |
| 代码执行（沙箱子进程） | ✅ code_execute/run_code | 深化：高危命令检测、受限 PATH/目录、docker 隔离沙箱 |
| 文件读写 | ✅ file_read/file_write | — |
| 数据分析：read_csv / analyze_data / generate_chart | ✅ | 深化：接 pandas/matplotlib，升级为真实图表 |
| MCP 客户端 / 服务端 | ✅ | — |
| 自定义工具注册 | ✅ CUSTOM_TOOLS | — |

### C. 记忆与知识层
| 能力 | 状态 | 深化 |
|---|---|---|
| 会话记忆（buffer） | ✅ | — |
| 向量记忆 / RAG（多路召回+引用溯源） | ✅ | — |
| 知识库 / 文档摄入 | ✅ 路由 + 可选 pypdf | 深化：批量摄入、增量索引 |
| 摘要 / 上下文压缩 | ✅ summary | — |
| 跨会话持久化 | ✅ session_manager | — |

### D. 编排与多智能体层
| 能力 | 状态 | 深化 |
|---|---|---|
| 单 Agent ReAct | ✅ | — |
| Supervisor 多 Agent | ✅ | — |
| Handoff / 交接 | 🔶 文档 | 深化：实现 handoff 节点 |
| A2A 协议（Agent-to-Agent） | ✅ | — |
| 结果聚合 | ✅ aggregator | — |
| GroupChat / 团队（autogen 适配器） | 🔶 适配器在，SDK 可选 | — |

### E. 安全与治理层
| 能力 | 状态 | 深化 |
|---|---|---|
| **提示词注入防御（接入管线）** | ➕ 已接入 ChatInterface（block 高风险注入） | 深化：LLM 辅助注入引擎 |
| **PII 脱敏（接入管线）** | ➕ 输入输出双向脱敏 | — |
| 内容过滤 | ✅ 端点；管线内 🔶 | 深化：接入 chat_stream |
| 限流 | ✅ 中间件 | — |
| 认证（API Key） | ✅ 中间件 | — |
| 审计 / 合规 | 🔶 | — |
| 沙箱隔离 | 🔶 子进程 | 深化：docker/受限沙箱 |

### F. 可观测性与评估层
| 能力 | 状态 | 深化 |
|---|---|---|
| 结构化日志 | ✅ | — |
| 指标 / Prometheus | ✅ | — |
| 追踪（Trace） | 🔶 | 深化：跨节点/工具追踪 |
| 评估（eval + 路由） | ✅ | — |
| 成本计费 | ✅ usage | — |
| 告警 | ✅ | — |

### G. 交互与前端层
| 能力 | 状态 | 深化 |
|---|---|---|
| 会话 / 分组 / 分享 / 附件 | ✅ | — |
| 流式 UI（ChatWindow） | ✅ | — |
| 管理台（Admin） | ✅ | — |
| **工作台（Task/Workspace/Skill/Notif/Command/Canvas/Memory）** | ✅ 本轮补齐 | 深化：通知 WS 实时、画布拖拽、命令全局唤起 |
| 语音 TTS/STT | ✅ | — |
| 人工介入 / 审批 | 🔶 agent_node_with_human | 深化：审批流 + 工具确认 |

### H. 平台与部署层
| 能力 | 状态 | 深化 |
|---|---|---|
| Docker | ✅ | — |
| 配置管理 | ✅ | — |
| 定时任务 / 调度 | ✅ scheduler | — |
| 插件 / 技能加载 | ✅ | — |
| 多端同步 / 离线 / 推送 | ⬜ deep-spec 33/35/36 | 按需扩展 |

---

## 3. 本轮补强（已落地）

1. **安全强制**：`SECURITY_ENABLED` 默认开，`ChatInterface` 统一接入注入防御 + PII 双向脱敏，高风险注入直接拦截。
2. **规划 + 反思**：`planner_node` / `reflect_node` 加入单 Agent 图，`agent_framework.plan` / `agent_framework.reflect` 开关控制。
3. 配套测试：`test_security_thinking.py`（43 用例全绿）。

## 4. 下一步深化建议（优先级）
- P1：模型回退接线（chat_with_fallback）；代码执行高危命令检测/受限沙箱。
- P2：Handoff 节点；长会话上下文自动压缩。
- P3：内容过滤接入 chat_stream；跨节点 Trace。
- P4：按需扩展 deep-spec 33/35/36（多端/离线/推送）。
