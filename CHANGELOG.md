# Changelog

本项目所有显著变更均记录于此。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 待办（Planned）
- 前端 Q 矩阵缺口组件补齐（TaskCard / WorkspacePanel / SkillSidebar / NotificationBell / CommandPalette / CanvasView / MemoryPanel 等）
- deep-spec 16-19/21 企业级 / 生态 / 布局 / 文档体系 ⬜ 子域实现
- 框架适配器真实 SDK 集成测试（langgraph / openai-agents / claude-sdk / adk / autogen）
- generate.py 各框架模板完善（目前 bare / langgraph 完整）

## [0.5.0] - 2026-08-11

### Added
- **会话工作空间（G1-G5）**：分组 / 搜索 / 收藏 / 分享 / 导出 MD / 附件上传（会话持久化 `data/sessions.json`）
- **管理后端 admin.py 34 → 81 路由**：M1 模型 key 池/回退链、M2 提示词版本/回滚/A-B、M4 工具试跑/热加载、M5 知识库文档、M6 A2A 注册表、M9 告警历史、M10 Trace/日志/漂移、M11 IAM、M12 Agent 生成/导入/模板市场/发布、G11 定时任务、M13 备份迁移
- **真实底层能力（deep-spec 20）**：text_processing（jieba 分词/TF-IDF+TextRank 关键词/摘要）、retrieval（BM25+向量 RRF 混合检索+引用溯源）、output_validator（结构化输出校验）、`/api/nlp/*`
- **成本计费（23）**：usage.py + `/api/admin/usage`（接入对话管线）
- **AI 安全（27）+ 数据治理（22）**：ai_security.py（注入双引擎/PII 脱敏/内容过滤）+ `/api/security/*`
- **性能工程（25）**：circuit_breaker.py 熔断器
- **管理页消除 mock**：PromptEditor / ToolRegistry / ModelConfig / AgentGraph / OrchestrationWorkflow / SettingsPanel 接入真实后端
- **UI/UX 视觉升级**：重写设计令牌 + 微动效 + 毛玻璃/渐变/卡片层次；App 新增对话/管理台视图切换

### Fixed
- `langgraph.graph.Command` 导入错误（改 `langgraph.types.Command`）
- `logging.py` 缺失 `Optional`；结构化日志新增 `StructuredLogger`

## [0.4.0] - 2026-08-11

### Added
- **深度规格 27-31（批次三）**：27-ai-security（AI 安全攻防与红队，OWASP LLM Top10 v2.0 / 五道纵深 / 注入双引擎 / 越狱库 / 护栏 / 红队演练台）、28-multimodal（多模态：CLIP 联合嵌入 / 多模态 RAG 三方法 / 视频四段式 / 生成工作台）、29-interoperability（Agent 互操作：MCP+A2A / A2A 四对象 / 信任分级 / GB-Z 185-2026）、30-data-pipeline（数据管道：ETL-ELT / CDC / Kafka 批流一体 / 可视化 DAG）、31-disaster-recovery（容灾：RTO-RPO / 3-2-1 备份 / 多活 / DR 计划 / 切换演练）
- 验收测试扩展至 **360 条**（27-31 各 14 条）
- 功能清单扩展至 **1290+ 项**（M25-M29）
- 文档中心 docs/README.md（32 份深度规格总览索引）
- README v2 全量重写（六框架 / MCP-A2A / 11 模板 / 文档体系 / 徽章）
- 开源配套：CODE_OF_CONDUCT / CHANGELOG / .editorconfig / Issue 模板（Bug+Feature）/ PR 模板 / AUTHORS

## [0.3.0] - 2026-08-11

### Added
- **深度规格 22-26（批次二）**：22-data-governance（数据治理）、23-cost-billing（成本计费）、24-test-quality（测试质量）、25-performance-engineering（性能工程）、26-user-growth（用户增长）
- 验收测试扩展至 290 条；功能清单扩展至 ≈1040 项（M20-M24）

## [0.2.0] - 2026-08-11

### Added
- **深度规格 18-21（批次一）**：18-ecosystem-connect（可接入生态大全 9 类 ≈100 项）、19-ux-layout-design（布局与设计 7 域 ≈74 项）、20-foundation-capabilities（底层基础能力 7 域 ≈66 项）、21-docs-support（文档与辅助体系 7 域 ≈56 项）
- 验收测试扩展至 220 条；功能清单扩展至 ≈820 项（M16-M19）
- 16-enterprise-org（企业级组织能力 13 子域 ≈130 项）、17-ai-lessons（AI 教训 14 域 ≈144 项）

## [0.1.0] - 2026-08-10

### Added
- 10 层架构（L1 LLM → L10 基础设施）完整代码模板：后端（l1_llm ~ l10_infra）+ 前端（React 18 + TS + Vite）
- 框架中立 **AgentRuntime** 契约 + 注册表 + 6 框架适配器（bare / langgraph / openai-agents / claude-sdk / adk / autogen）
- L8 管理 API 40+ 端点全 CRUD；前端 admin 12 组件（4476 行）
- MCP 客户端 + MCP 服务端双端实现；A2A 客户端 + 服务端
- 8 家 LLM 适配器（OpenAI / Anthropic / DeepSeek / Qwen / Kimi / GLM / Gemini / Ollama）
- 配置驱动生成器 generate.py + 11 类 Agent YAML 模板
- 深度规格体系启动：00-template + 01-14（提示词 / 沙箱 / 上下文 / 工具 / 记忆 / 模型 / 工作流 / 语音 / 定时 / 技能插件 / 评估 / 监控 / IAM / 生命周期）
- 15-ux-detail（对话体验 14 交互域 800+ 细节点）
- 顶层文档：full-spec（P0-P10）、feature-checklist（M0-M13）、acceptance-test（114 条）、framework-selection、admin-console-design、comparison-2026
- CI（后端 pytest / 前端 tsc+build / 生成器 smoke-run）、Dependabot 自动更新
- Apache 2.0 License
