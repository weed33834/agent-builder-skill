# Changelog

本项目所有显著变更均记录于此。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Planned
- v0.6.0：generate.py 模块化重构（argparse / copytree / 模板外置）；admin.py 数据驱动 CRUD 工厂；外部库替换手造轮子（见 `docs/tech-debt.md`）。

## [0.5.2] - 2026-08-22

### Changed
- **版本源统一为单一事实**：README ×3 徽章 / frontend package.json / .env.example / l10_infra config.py（含生成器模板）全部对齐 `0.5.2`（此前五处四个值：v0.1.0 / 0.5.0 / 2.0.0 / 1.0.0）。
- README 测试声明改为可机检事实："CI 门禁 verify_all.py 全矩阵 24/24 绿"取代无法验证的"43 条 pytest"。
- requirements.txt 全部依赖加版本上界（兼容区间），终结开放式 `>=` 造成的 dependabot 刷屏。
- dependabot.yml pip 生态按包分组（grouped updates），减少 PR 数量；auto-merge 等待窗口 15s → 90s，且"无其他检查"时不再立即合并。

### Removed
- 移除误入仓库根目录的工作日志 `task-arch-audit-fix_20260811_0945.md`。

## [0.5.1] - 2026-08-22

### Fixed
- **P0：静态模板覆盖生成产物（Windows 根因）**——`copy_static_templates` 的 GENERATED 排除集用 POSIX 路径与 `os.path.normpath` 输出比较，Windows 下反斜杠永不匹配，导致 graph.py / main.py / config.py / base_tools.py / custom_tools.py / system_prompts.py 六个文件被静态模板静默覆盖。改用 `Path.as_posix()` 归一化。
- **P0：GBK 控制台崩溃**——生成器输出的 ✓/→ 字符在 Windows 默认码页抛 `UnicodeEncodeError`。入口处 `sys.stdout/stderr.reconfigure(encoding="utf-8")`。
- **P0：bare 产物自测失败**——根因即上述覆盖 bug；修复后 bare 产物自带测试 5/5 通过。
- langgraph 单体/supervisor 模板的 `get_graph_config()` 改读 `settings.MAX_TOOL_CALLS`（此前硬编码 10，与参考模板漂移）。

### Added
- **生成产物携带完整测试套件**：`copy_static_templates` 补拷 `templates/backend/tests/*.py` 与新增 `requirements-dev.txt`——langgraph 产物此前零测试，违反自家完整性清单。
- **工具全量生成 + 启用集过滤**：`base_tools.py` 始终包含全部基础工具实现，新增 `ENABLED_TOOL_NAMES`（来自 agent.yaml `tools.enabled`），main.py 启动时仅注册启用集。修复 chat 模式上下文注入在禁用 web_search 产品中的隐性 ImportError。
- **CI 矩阵门禁** `scripts/verify_all.py`：每模板 × 每框架执行 生成→导入→pytest；本地全矩阵 **24/24 绿**（12 配置 × bare/langgraph）。ci.yml 接入并新增 windows-latest job（3 配置 × 2 框架）防平台回归。

### Fixed (contract parity)
- bare 版 chat 路由补齐模块级 `_build_context`（与 langgraph 版同签名），SSE done 事件只发一次（此前发两次）。
- a2a 内省路由懒初始化 A2A server；未知 task 返回 HTTP 404（此前 500 `A2AServerError`）。
- `test_streaming` 假运行时升级为双契约（astream_events + AgentEvent.stream）；`test_security_thinking` 显式导入 `l2_interface.chat_interface` 子模块，消除 import 顺序依赖。

## [0.5.0] - 2026-08-11

> 注：本节由原 CHANGELOG 中两个重复的 `[0.5.0]` 条目合并而成。

### Added
- **会话工作空间（G1-G5）**：分组 / 搜索 / 收藏 / 分享 / 导出 MD / 附件上传（会话持久化 `data/sessions.json`）
- **管理后端 admin.py 34 → 81 路由**：M1 模型 key 池/回退链、M2 提示词版本/回滚/A-B、M4 工具试跑/热加载、M5 知识库文档、M6 A2A 注册表、M9 告警历史、M10 Trace/日志/漂移、M11 IAM、M12 Agent 生成/导入/模板市场/发布、G11 定时任务、M13 备份迁移
- **真实底层能力（deep-spec 20）**：text_processing（jieba 分词/TF-IDF+TextRank 关键词/摘要）、retrieval（BM25+向量 RRF 混合检索+引用溯源）、output_validator（结构化输出校验）、`/api/nlp/*`
- **成本计费（23）**：usage.py + `/api/admin/usage`（接入对话管线）
- **AI 安全（27）+ 数据治理（22）**：ai_security.py（注入双引擎/PII 脱敏/内容过滤）+ `/api/security/*`
- **性能工程（25）**：circuit_breaker.py 熔断器
- **管理页消除 mock**：PromptEditor / ToolRegistry / ModelConfig / AgentGraph / OrchestrationWorkflow / SettingsPanel 接入真实后端
- **UI/UX 视觉升级**：重写设计令牌 + 微动效 + 毛玻璃/渐变/卡片层次；App 新增对话/管理台视图切换
- **深度规格 17-36 批次落地**：AI 教训 / 企业组织 / 生态接入 / UX 布局 / 底层能力 / 文档支持 / 数据治理 / 成本计费 / 测试质量 / 性能工程 / 用户增长 / AI 安全 / 多模态 / 互操作 / 数据管道 / 容灾 / RAG 检索 / 多端同步 / 实时协作 / 弱网韧性 / 推送触达
- 验收测试扩展至 430 条；功能清单扩展至 1465+ 项
- 对话模式开关真实生效：`POST /api/chat` 新增 `mode`（web_search/deep_think/kb_id/sandbox），前后端接线

### Fixed
- `langgraph.graph.Command` 导入错误（改 `langgraph.types.Command`）
- `logging.py` 缺失 `Optional`；结构化日志新增 `StructuredLogger`
- P0 生成器工具注册 / supervisor 图 / bare 运行时 / CI 强化 / 卫生项

## [0.4.0] - 2026-08-11

### Added
- **深度规格 27-31（批次三）**：27-ai-security（AI 安全攻防与红队，OWASP LLM Top10 v2.0 / 五道纵深 / 注入双引擎 / 越狱库 / 护栏 / 红队演练台）、28-multimodal（多模态）、29-interoperability（Agent 互操作）、30-data-pipeline（数据管道）、31-disaster-recovery（容灾）
- 验收测试扩展至 360 条；功能清单扩展至 1290+ 项（M25-M29）
- 文档中心 docs/README.md；README v2 全量重写；开源配套文件（CoC / CHANGELOG / Issue·PR 模板 / AUTHORS）

## [0.3.0] - 2026-08-11

### Added
- **深度规格 22-26（批次二）**：22-data-governance、23-cost-billing、24-test-quality、25-performance-engineering、26-user-growth
- 验收测试扩展至 290 条；功能清单约 1040 项（M20-M24）

## [0.2.0] - 2026-08-11

### Added
- **深度规格 18-21（批次一）**：18-ecosystem-connect、19-ux-layout-design、20-foundation-capabilities、21-docs-support
- 验收测试扩展至 220 条；功能清单约 820 项（M16-M19）
- 16-enterprise-org、17-ai-lessons

## [0.1.0] - 2026-08-10

### Added
- 10 层架构（L1 LLM → L10 基础设施）完整代码模板：后端（l1_llm ~ l10_infra）+ 前端（React + TS + Vite）
- 框架中立 **AgentRuntime** 契约 + 注册表 + 6 框架适配器（bare / langgraph / openai-agents / claude-sdk / adk / autogen）
- L8 管理 API 40+ 端点全 CRUD；前端 admin 12 组件
- MCP 客户端 + 服务端双端实现；A2A 客户端 + 服务端
- 8 家 LLM 适配器（OpenAI / Anthropic / DeepSeek / Qwen / Kimi / GLM / Gemini / Ollama）
- 配置驱动生成器 generate.py + Agent YAML 模板
- 深度规格体系启动：00-template + 01-15
- CI（后端 pytest / 前端 tsc+build / 生成器 smoke-run）、Dependabot 自动更新
- Apache 2.0 License
