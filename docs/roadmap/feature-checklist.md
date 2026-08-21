# Universal Agent Builder — 完整功能清单与实现指南（Feature Checklist & Implementation Guide）

> **用途**：作为"智能体完整性对照清单"——逐项对比任何智能体缺什么、有什么。
> 覆盖所有大厂生态（Anthropic / OpenAI / Google / Microsoft）+ 开源主流框架 + 前沿论文。
> **用法**：每行功能 = 一个对比项。对比时逐项打勾：✅ 已有 / 🔶 部分 / ⬜ 缺失，缺失的按"怎么做"列补。
> 配套：本仓库按此清单作为**通用底座**，用户智能体的具体业务细节在底座之上自行叠加。
> 配套文档（按验证用途分）：
> - **框架选型**：docs/framework-selection.md（多框架全景矩阵 + 中立架构 + 选型决策树，平台不默认绑定框架）
> - **管理控制台**：docs/admin-console-design.md（每个功能资源的管理界面深度设计：布局/控制/AI 生成/外部导入）
> - **可验证规格书**：docs/full-spec.md（**页面级 P0-P10 全量规格**：每项=是什么+怎么做+管理增删改调+前端页面+后端接口+状态；
>   含豆包/GPT 网页端功能对照表、前后端对齐矩阵（后端功能前端不隐藏）、缺口清单与补齐路线）
> - **模块级深度规格**：docs/deep-spec/（**每个模块写深写全**：资产模型全字段 + 配置项全清单 + 管理界面增删改调/辅助功能 + 运行时真实嵌入链路 + 安全权限 + 前后端对齐矩阵 + 验证方法。
>   目标：拒绝空壳——每项功能可验证真实工作，而非只有按钮和路由。**已全量完成 37 份**（00 统一模板 + 01-36 模块规格）：01 提示词 / 02 沙箱 / 03 上下文 / 04 工具 / 05 记忆 / 06 模型 / 07 编排工作流 / 08 语音 / 09 定时任务 / 10 技能插件 / 11 评估 / 12 监控告警 / 13 权限 IAM / 14 Agent 生命周期 / 15 对话体验全集（**14 交互域 800+ 细节点**）/ 16 企业级·组织级通用能力（**13 子域 ≈130 项**）/ 17 教训与坑全集（**14 域 ≈144 项**）/ 18 可接入生态与现成服务大全（**9 类 ≈100 项**）/ 19 布局与设计规范（**7 域 ≈74 项**）/ 20 底层基础能力（**7 域 ≈66 项**）/ 21 文档与辅助体系（**7 域 ≈56 项**）/ 22 数据治理与数据资产 / 23 成本计费与配额治理 / 24 测试与质量保障 / 25 性能工程 / 26 用户研究与增长 / 27 AI 安全攻防与红队（威胁模型/注入检测/越狱防护/防御纵深/红队演练/护栏）/ 28 多模态能力（图音视频理解与生成/跨模态检索/多模态 RAG）/ 29 Agent 互操作与开放协议（A2A/MCP/Agent Card/信任策略）/ 30 数据管道与集成（ETL-ELT/批流一体/CDC/编排/质量中心）/ 31 容灾与业务连续性（RTO-RPO/3-2-1 备份/多活切换/演练/故障注入）/ 32 RAG 检索增强（查询改写/分块/多路召回/RRF 融合/重排/引用溯源/评测，Naive→Advanced→Modular/LongRAG/Self-RAG/GraphRAG 选型）/ 33 多端与端云协同（状态同步而非广播/雪花 ID 游标/离线队列/断点续传/跨端会话迁移）/ 34 实时协作（在线状态/操作日志/冲突检测与解决/区域锁定/快照回滚/Agent 协作 op 流）/ 35 弱网与离线韧性（重试退避/熔断/LLM 降级路由/缓存兜底/离线队列/断点续传/对账补偿/弱网实验室）/ 36 推送与触达（渠道矩阵/模板渲染/免打扰/频率治理/深链回跳/回执归因/触达漏斗）。每个 M 板块下方挂载对应深度规格入口）
> - **对标应用分析**：docs/comparison-2026.md（Codex / ChatGPT / Claude Code / WorkBuddy 功能全景对比 + 独有高级功能吸收清单：工作树隔离/移动端审批/会话分叉/侧边问题/画布模式/任务卡/三模式/专家市场等，标 ✅🔶⬜ 映射到各模块）
> - **验收测试清单**：docs/acceptance-test.md（36 模块 430 条可执行验收项，逐条=步骤+预期结果，全绿=完整性验收通过；15 对话体验域 20 条覆盖 14 交互域，16 企业级 30 条覆盖 13 子域，17 教训域 20 条覆盖 14 域，18 生态 14 条覆盖 9 类，19 布局 14 条覆盖 7 域，20 底层 14 条覆盖 7 域，21 文档 14 条覆盖 7 域，22 数据治理 14 条，23 成本计费 14 条，24 测试质量 14 条，25 性能 14 条，26 增长 14 条，27 AI 安全 14 条，28 多模态 14 条，29 互操作 14 条，30 数据管道 14 条，31 容灾 14 条，32 RAG 检索 14 条，33 多端同步 14 条，34 实时协作 14 条，35 弱网韧性 14 条，36 推送触达 14 条）

---

## 📋 模块总览（35 大板块，≈1465 功能项）

| 模块 | 板块 | 功能项数 | 对标来源 | 深度规格 |
|------|------|---------|---------|---------|
| M0 | Agent 类型模板（通用 + 垂直 + 框架选型） | 24 | 各厂 Agent 商店 + 框架生态 | —（模板表见下） |
| M1 | LLM 接入层 | 18 | OpenAI/Anthropic/Google/国产 | 06-models.md |
| M2 | 提示工程 | 13 | Anthropic 八条原则 | 01-prompt-system.md |
| M3 | Agent 核心运行时 | 20 | Claude Agent SDK / LangGraph / 框架中立 | 15-ux-detail.md（对话层） |
| M4 | 工具系统 | 21 | MCP / Claude Code / OpenAI Tools | 04-tools.md + 02-sandbox.md |
| M5 | 记忆与知识 | 16 | MemGPT / 记忆综述论文 | 05-memory.md + 03-context.md |
| M6 | 编排与多 Agent | 24 | A2A / AutoGen / Swarm / LangGraph | 07-workflow.md |
| M7 | API 服务层 | 16 | OpenAI Assistants / 生产规范 | 08-voice.md（语音入口） |
| M8 | 前端 UI | 23 | ChatGPT / Claude / 管理控制台设计 | 15-ux-detail.md + admin-console-design.md |
| M9 | 基础设施与 DevOps | 15 | 12-Factor / 生产规范 | 09-schedule.md + 12-monitor.md |
| M10 | 评估体系 | 14 | Anthropic 评测驱动 / 论文 | 11-eval.md |
| M11 | 安全与合规 | 14 | OWASP LLM / Prompt Guard | 13-iam.md |
| M12 | 高级能力 | 24 | 各厂前沿功能 | 10-skill-plugin.md + 14-agent-lifecycle.md |
| M13 | 可观测性 | 12 | OTel / LangSmith / AgentOps | 12-monitor.md |
| M14 | 企业级·组织级通用能力（多租户/账号/SSO-MFA/知识库/审计合规/成本/开放平台/发布/协作/分析/运维/安全私有化/国际化） | ≈130 | Dify 企业版 / Coze / LangSmith / Copilot Studio / OneAPI / MuleSoft / 等保·ISO·SOC2 | **16-enterprise-org.md** |
| M15 | 教训与坑全集（AI 死板风格/Agent 常犯错误/工具·记忆·提示词·数据·评测·安全·架构·运维·产品·团队坑/不重复造轮子清单/企业·高校特坑） | ≈144 | CSDN/企鹅号/头条避坑系列 / LangChain 生态 / Gartner 行业结论 | **17-ai-lessons.md** |
| M16 | 可接入生态与现成服务大全（AI 应用平台/MCP 工具生态/浏览器自动化/模型服务/检索存储/数据源/渠道 IM/可观测运营/眼前一亮项目） | ≈100 | Dify/Coze/RAGFlow/FastGPT/Open WebUI/LobeChat/n8n/Flowise / MCP 官方生态 / browser-use / Langfuse | **18-ecosystem-connect.md** |
| M17 | 布局与设计规范（信息架构/页面布局模式/导航系统/内容组织分类/设计系统/响应式无障碍/关键页面布局规格） | ≈74 | Dify/Coze 管理台 / vue-element-admin / AntD / 知乎·CSDN 布局方法论 | **19-ux-layout-design.md** |
| M18 | 底层基础能力（流式输出全家桶/结构化输出与工具调用/文本处理算法/检索算法/并发性能韧性/多模态底层/前端底层） | ≈66 | OpenAI/Anthropic API 工程实践 / BM25+向量混合检索 / 生产级并发治理 | **20-foundation-capabilities.md** |
| M19 | 文档与辅助体系（错误码体系/前端报错指令/报错文档/使用文档/开发者文档/管理员运维文档/文档工程） | ≈56 | 腾讯云/阿里云错误码规范 / Keep a Changelog / Docs-as-Code | **21-docs-support.md** |
| M20 | 数据治理与数据资产（资产目录/元数据管理/血缘可视化/质量监控/分类分级/数据源管理/资产生命周期/数据服务 API） | ≈40 | DAMA-DMBOK / 数据资产管理实践 / 数据要素入表 | **22-data-governance.md** |
| M21 | 成本计费与配额治理（成本看板/价格表/预算阶梯告警/配额控制/账单分摊/模型比价器/优化建议） | ≈45 | LiteLLM/OpenRouter / Langfuse 成本追踪 / CostBench / 云厂商计费 | **23-cost-billing.md** |
| M22 | 测试与质量保障（测试金字塔/三类用例库/LLM 判分器/回归趋势/混沌测试/安全攻击用例/CI 质量门禁） | ≈45 | LLM 应用测试策略 / DeepEval / Langfuse / 混沌工程 | **24-test-quality.md** |
| M23 | 性能工程（TTFT/TPOT/吞吐指标/压测中心/prompt+语义缓存/自动伸缩/队列监控/调优建议） | ≈40 | vLLM/SGLang 推理引擎 / KV Cache/量化/推测解码 / 性能调优指南 | **25-performance-engineering.md** |
| M24 | 用户研究与增长（指标大盘/埋点体系/留存分析/漏斗分析/A-B 实验台/用户分群/反馈中心/Aha 挖掘） | ≈50 | AARRR/RARRA / 北极星指标 / 字节 DataTester / 神策 / SaaS 增长 | **26-user-growth.md** |
| M25 | AI 安全攻防与红队（威胁态势大屏/威胁用例库/注入检测规则/防御纵深编排/红队演练台/安全事件中心/护栏管理/模型安全评估） | ≈45 | OWASP LLM Top 10 v2.0 / Agentic Top 10 / GenAI 数据安全 21 风险 / 微软 Agent 治理工具包 / promptfoo 红队 | **27-ai-security.md** |
| M26 | 多模态能力（多模态资产库/处理任务中心/索引管理/跨模态检索台/生成工作台/多模态 RAG 配置/模型路由） | ≈40 | CLIP/BLIP / 多模态 RAG 三方法 / Whisper+CLIP+VLM 视频流水线 / SkyReels-V3 | **28-multimodal.md** |
| M27 | Agent 互操作与开放协议（Agent Card 管理/A2A 任务监控/外部 Agent 目录/MCP 服务器管理/互操作策略/协议实验室/标准合规） | ≈40 | A2A 协议（Linux 基金会 150+ 组织）/ MCP 2026-07 无状态化重构 / GB/Z 185-2026 / OpenAN A2A-T | **29-interoperability.md** |
| M28 | 数据管道与集成（数据源管理/可视化 DAG 编排/任务执行监控/转换规则库/数据质量中心/同步统计/CDC 实时同步） | ≈45 | Airflow/Luigi / Kafka 实时管道 / CDC 变更捕获 / RestCloud 可视化 ETL / 批流一体 | **30-data-pipeline.md** |
| M29 | 容灾与业务连续性（备份中心/恢复控制台/容灾拓扑图/DR 计划管理/切换演练台/故障注入实验室/连续性看板） | ≈40 | RTO-RPO 体系 / 3-2-1 备份原则 / 多活容灾 / DRP / 月度恢复演练常态化 | **31-disaster-recovery.md** |
| M30 | RAG 检索增强（数据源管理/分块实验台/索引管理/检索调试台/管线发布/引用管理/评测中心） | ≈42 | RAG 最佳实践十环节 / Naive→Advanced→Modular 演进 / LongRAG·Self-RAG·GraphRAG / 混合检索 RRF / cross-encoder 重排 | **32-rag-search.md** |
| M31 | 多端与端云协同（端管理/设备管理/同步监控台/游标管理/离线队列/冲突中心/多端会话视图） | ≈38 | 腾讯云 IM+Push / MPush 分布式软总线 / 小程序-APP 双通道 / 状态同步而非广播 | **33-multi-end-sync.md** |
| M32 | 实时协作（协作会话管理/在线状态面板/操作日志查看器/冲突中心/区域锁定/快照回滚/审查流/协作看板） | ≈36 | Label Studio 实时协作 / Rust 全栈实时协作 / 协同编辑冲突处理研究 / Excel 区域锁定 | **34-real-time-collab.md** |
| M33 | 弱网与离线韧性（策略中心/熔断器看板/降级事件流/缓存管理/离线任务中心/断点续传/对账中心/弱网模拟实验室） | ≈40 | LLM API 优雅降级 / 断点续传 / 微服务降级熔断·舱壁隔离 / 离线优先架构 | **35-offline-resilience.md** |
| M34 | 推送与触达（模板中心/发送中心/渠道管理/免打扰管理/频率治理/回执与效果/用户偏好/触达看板） | ≈38 | 腾讯云 Push / MPush 高并发架构 / 小程序-APP 统一推送网关 / 推送到达率归因 | **36-push-engagement.md** |
| **合计** | | **≈1465** | | **docs/deep-spec/01-36** | |

> 各模块按"生成物完整性"排序：M0 决定生成什么类型，M1-M6 决定智能体能力，M7-M9 决定能不能上线，M10-M13 决定质量和安全。

---

## M0. Agent 类型模板（通用 + 垂直）

> 目的：让"生成器"开箱能产出任何领域的智能体，用户只需填 YAML + 业务细节。
> 做法：每个模板 = `agent.yaml`（配置）+ 默认 system prompt + 默认工具集 + 默认编排模式。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M0.1 | 通用助手（general-purpose） | 全能问答/任务执行底座 | ReAct 循环 + 全工具集 + 多轮记忆，默认模板 |
| M0.2 | 研究型（research） | 多步调研、跨源综合 | 编排者-工作者：规划→并行搜索→聚合→报告（✅ 现有模板，需补规划器） |
| M0.3 | 编程型（coding） | 写码/改码/调试/解释 | 内置文件读写+shell+代码执行沙箱；参考 Claude Code / OpenAI Codex |
| M0.4 | 客服型（customer_service） | 工单/FAQ/情绪识别 | 知识库 RAG + 意图路由 + 转人工（human-in-the-loop） |
| M0.5 | 数据分析型（data_analysis） | 查数/分析/可视化 | 数据库工具 + pandas 执行沙箱 + 图表生成 |
| M0.6 | 写作型（writing） | 文案/长文/润色/翻译 | 评估者-优化者模式（写→评→改循环） |
| M0.7 | 翻译型（translation） | 多语互译+术语一致 | 术语表记忆 + 领域 few-shot |
| M0.8 | DevOps/SRE 型 | 运维/排障/发布 | shell + 监控 API 工具 + 只读优先权限 |
| M0.9 | 代码评审型（code_reviewer） | 审查 PR/找 bug/合规 | Coder+Reviewer 双 Agent（AutoGen 模式） |
| M0.10 | 测试型（qa_agent） | 生成用例/跑测试/报告 | 沙箱执行 + 覆盖率工具 |
| M0.11 | 知识库问答型（rag_qa） | 基于私有文档问答 | 混合检索 RAG + 引用溯源（✅ 现有模板，需补检索） |
| M0.12 | 数据库 DBA 型 | 写 SQL/优化/解释 | SQL 工具 + schema 记忆 + 只读默认 |
| M0.13 | 爬虫/信息采集型 | 网页抓取/结构化抽取 | WebFetch + 浏览器自动化（Playwright） |
| M0.14 | 舆情监控型 | 关键词监测/摘要/告警 | 定时任务 + 搜索工具 + 推送通知 |
| M0.15 | 多模态助手 | 图/音/视频理解 | 多模态模型适配（M1.16）+ 媒体工具 |
| M0.16 | 教育型（tutor） | 教学/答疑/出题 | 苏格拉底式 prompt + 知识分级 |
| M0.17 | 金融分析型 | 行情/研报/风控 | 行情 API + 合规护栏 + 审计日志 |
| M0.18 | 医疗咨询型（仅信息） | 症状查询/科普（非诊断） | 免责声明 + 内容过滤 + 转医生 |
| M0.19 | 法律文书型 | 合同审阅/法条检索 | 法条库 RAG + 人工复核节点（强制 HITL） |
| M0.20 | 电商运营型 | 商品描述/客服/选品 | 电商 API 工具 + 模板库 |
| M0.21 | 框架选型字段 | agent.yaml 显式声明框架 | `framework: langgraph \| openai-agents \| claude-sdk \| adk \| autogen \| bare`，默认空=必须选择，见 docs/framework-selection.md 2.3 |
| M0.22 | 框架全景矩阵 | 选型时不默认绑定 | 六类框架全景+决策树（通用编排/多 Agent/厂商 SDK/协议/低代码/自研），见 docs/framework-selection.md 一章 |
| M0.21 | HR/招聘型 | JD 生成/简历筛选 | 简历解析 + 评分 rubric |
| M0.22 | 项目管理型 | 任务拆解/进度跟踪/会议纪要 | 规划器 + 日历/任务工具 |

---

## M1. LLM 接入层

> 目的：任何模型都能插拔接入，统一接口。参考各厂 SDK + LiteLLM 设计。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M1.1 | 多 Provider 适配 | OpenAI/Anthropic/DeepSeek/Ollama/Gemini/通义/智谱/Moonshot/百度/火山/混元 | 每个 provider 一个 adapter 类，实现统一 `chat()` 接口（✅ 现有 l1_llm/adapters，需补 Gemini/国产） |
| M1.2 | 统一 Chat 接口 | 所有模型同一调用方式 | `ChatProvider` 抽象基类：`complete(messages, tools, stream, temperature)` |
| M1.3 | 统一 Embedding 接口 | 向量化统一 | `embed(texts) -> list[list[float]]`，适配各厂 embedding 模型 |
| M1.4 | 流式输出 | SSE 逐字/逐 token 返回 | 统一返回 AsyncGenerator；前端用 EventSource/fetch-stream |
| M1.5 | 工具调用（function calling） | 模型请求调用工具 | 归一化为 `ToolCall{name, arguments}`，适配各厂格式差异 |
| M1.6 | 结构化输出 | JSON Schema 强制输出 | `response_format={"type":"json_schema"}`；不支持则用解析器+重试 |
| M1.7 | 模型路由 | 按任务/成本/延迟选模型 | 路由表：任务类型→模型（简单问答用 Flash/便宜模型，复杂推理用旗舰） |
| M1.8 | Fallback 链 | 主模型挂了自动切换 | `try provider A → except → provider B`，记录降级事件 |
| M1.9 | 自动重试 | 限流/5xx 指数退避重试 | tenacity 装饰器：`retry(stop=3, wait=exponential(1,8))` |
| M1.10 | Token 计数与预算 | 控制每次调用成本 | tiktoken + 调用前预算检查，超预算降级到便宜模型 |
| M1.11 | 上下文窗口管理 | 超长自动截断/压缩 | 见 M3.14 上下文压缩，按 token 阈值触发 |
| M1.12 | 成本追踪 | 每请求成本记录 | 用量×单价，写入 metrics（M13） |
| M1.13 | 采样参数暴露 | 温度/top_p/max_tokens 可配 | 从 agent.yaml 读取并透传 |
| M1.14 | 多模态输入 | 图/音频输入 | 归一化为 `content: [{type:text|image|audio, ...}]` 格式 |
| M1.15 | 本地模型支持 | Ollama/vLLM 私有化部署 | Ollama adapter（✅ 已有）+ vLLM OpenAI 兼容 endpoint |
| M1.16 | 模型健康探测 | 启动时验证 key/连通性 | 启动跑一次最小请求，失败给出明确报错 |
| M1.17 | 超时控制 | 防模型卡死 | 每请求 `timeout` 配置 + 流式保活 |
| M1.18 | 多租户 key 管理 | 不同用户不同 key/额度 | key 存库，请求按租户路由（见 M7.15） |

---

## M2. 提示工程

> 参考：Anthropic《Building Effective Agents》八条提示原则 + Claude Code 最佳实践。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M2.1 | 系统提示模板 | 角色/能力/边界声明 | `system_prompts/` 目录，按 agent 类型存放，YAML 引用 |
| M2.2 | 角色模板 | 身份设定（你是资深数据分析师…） | 模板变量 `{role}` `{domain}` |
| M2.3 | 指令分层 | system/user/assistant 职责划分 | system=规则，user=任务，assistant=示例 |
| M2.4 | Few-shot 示例 | 示例引导输出格式 | `examples/` 目录，按类型加载 2-5 条 |
| M2.5 | 思维链（CoT） | 复杂问题逐步推理 | prompt 中加"请逐步推理"，或强制 `reasoning` 字段输出 |
| M2.6 | ReAct 格式 | 推理-行动-观察循环的 prompt 编排 | Thought→Action→Observation 三段模板（✅ 已有基础） |
| M2.7 | 输出解析器 | JSON/XML/Markdown/代码块解析 | `OutputParser` 基类 + 各格式实现，解析失败重试 |
| M2.8 | 输出校验器（sanitizer） | 非法输出修复 | 校验 schema/格式 → 不合法则带错误信息重问模型 |
| M2.9 | 提示注入防护 | 防用户指令覆盖系统规则 | 输入分隔符+系统指令强化+输入过滤（见 M11） |
| M2.10 | 动态上下文注入 | 工具结果/记忆/检索结果入 prompt | 运行时拼装 `context` 区块，控制长度 |
| M2.11 | 提示版本管理 | prompt 可追溯/回滚 | prompts 存文件走 git，生成物含版本号 |
| M2.12 | 长度控制 | 防 prompt 膨胀 | 每区块 budget，超限自动摘要 |
| M2.13 | 多语言提示 | 中/英/日等 | `i18n/` 目录按 locale 存放模板 |

---

## M3. Agent 核心运行时

> 参考：Claude Agent SDK（工具循环/上下文压缩/子代理/生命周期钩子）+ LangGraph 1.0（StateGraph/Command/checkpoint）。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M3.1 | Agent 循环（Agent Loop） | 模型↔工具循环直到完成 | `while model.request_tools: execute → feed back`（Claude SDK 核心，✅ 需实现） |
| M3.2 | ReAct 节点 | 单步推理+行动 | LangGraph node：`agent_node`（✅ 模板有） |
| M3.3 | 工具执行节点 | 执行工具调用 | `tool_node`，含错误捕获（✅ 模板有） |
| M3.4 | 状态机管理 | 对话/执行状态流转 | LangGraph StateGraph + TypedDict state（✅ 已有） |
| M3.5 | 步骤上限 | 防死循环 | `max_steps` 配置，超限强制结束并说明 |
| M3.6 | 超时控制 | 任务级超时 | 整体 deadline + 每步超时 |
| M3.7 | 并行工具调用 | 多工具同时执行 | 模型返回多 tool_calls 时 asyncio.gather |
| M3.8 | 规划器（Planner） | 任务拆解成步骤 | Plan-and-Execute：先 plan 再逐步执行，可中途 replan（research 模板必需） |
| M3.9 | 反思器（Reflector） | 自我批判/修正 | 输出后让模型自评，不达标重跑（evaluator-optimizer） |
| M3.10 | 自我纠错 | 工具报错后自动修复 | 错误信息回喂模型，限次重试 |
| M3.11 | Human-in-the-loop | 关键节点暂停等人工 | LangGraph `interrupt()` / checkpoint 恢复（✅ LangGraph 1.0 原生） |
| M3.12 | 中断恢复 | 进程重启后继续任务 | 持久化 checkpoint（MemorySaver→PostgresSaver） |
| M3.13 | 多轮会话状态 | 上下文延续 | session_id → 消息历史存储（M5.1） |
| M3.14 | 上下文压缩 | 超长历史自动摘要 | 滚动摘要节点：旧消息→摘要，保留关键信息（Claude Code 核心） |
| M3.15 | 子 Agent（subagent） | 主 Agent 派生子任务 | 子 agent 独立循环，结果返回主 agent（Claude Research 架构） |
| M3.16 | 生命周期钩子 | 事件触发回调 | `on_start/on_tool/on_message/on_error` hooks（Claude SDK 原生） |
| M3.17 | 权限控制 | 工具白名单 | allowed_tools 配置 + 运行时校验 |
| M3.18 | 流式事件输出 | 步骤级实时推送 | 事件流：`agent_message/tool_call/tool_result/done` 类型化事件 |
| M3.19 | 框架中立运行时抽象 | 业务逻辑与框架解耦 | `AgentRuntime` 抽象接口（run/stream/bind_tools/checkpoint/hooks），适配器模式接入任意框架，见 docs/framework-selection.md 二章 |
| M3.20 | 多框架适配器 | ≥2 个可用适配器 | LangGraphAdapter / OpenAI AgentsAdapter / ClaudeSDKAdapter / ADKAdapter / AutoGenAdapter / BareAdapter，generator `--framework` 可选 |

---

## M4. 工具系统

> 参考：MCP 协议（2026-07-28 stateless 版）+ Claude Code 工具集（Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/ComputerUse）+ OpenAI 内置工具。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M4.1 | 工具注册中心 | 统一注册/发现 | 装饰器 `@tool(name, description, schema)` 自动注册（✅ 已有基础） |
| M4.2 | 工具 Schema 自动生成 | 从函数签名生成 JSON Schema | pydantic 函数参数 → JSON Schema（✅ 已有基础） |
| M4.3 | 文件读取/写入/编辑 | 代码类 agent 必备 | Read/Write/Edit 工具，路径白名单 |
| M4.4 | Shell 执行 | 运行命令 | Bash 工具 + 沙箱（M4.18）+ 超时 + 输出截断 |
| M4.5 | 代码执行沙箱 | 运行 Python/JS | Docker 容器或 subprocess 隔离，限制资源/网络 |
| M4.6 | 网络搜索 | 实时信息 | WebSearch 工具（封装 search API） |
| M4.7 | 网页抓取 | 读取网页内容 | WebFetch 工具（HTML→Markdown） |
| M4.8 | 浏览器自动化 | 点击/填表/截图 | Playwright MCP server 接入 |
| M4.9 | 数据库查询 | 查库/写 SQL | SQL 工具（只读默认，写操作需授权） |
| M4.10 | API 调用 | 调外部 REST | GenericHttp 工具：method/url/headers/body |
| M4.11 | 数学/计算 | 精确计算 | 内置 Python eval 沙箱（受限） |
| M4.12 | 图表生成 | 数据可视化 | matplotlib/echarts 生成图片返回 |
| M4.13 | 文件搜索 | 本地文件定位 | Glob/Grep 工具（Claude Code 同款） |
| M4.14 | 日历/邮件 | 日程/通信 | 日历 API + 邮件发送（需 OAuth） |
| M4.15 | 翻译/图像/语音 | 媒体能力 | 调用各厂媒体 API |
| M4.16 | MCP 客户端 | 连接外部 MCP 服务器 | `mcp_client.py`：stdio/HTTP/SSE 传输，tools 自动导入（⚠️ 缺失，需补） |
| M4.17 | MCP 服务器 | 把自己的工具暴露给外部 | `mcp_server.py`：FastMCP 包装工具集 |
| M4.18 | 工具执行沙箱 | 隔离不安全工具 | 容器化/最小权限/网络策略 |
| M4.19 | 工具结果管理 | 截断/摘要防爆上下文 | 大结果自动截断或摘要（Claude Code 做法） |
| M4.20 | 工具审计日志 | 谁在何时调了啥 | 每次调用记录：工具/参数/结果/耗时（M13） |
| M4.21 | 工具热加载 | 运行中动态加工具 | 插件目录扫描 + 动态 import |

---

## M5. 记忆与知识

> 参考：MemGPT 分层记忆、LangGraph 短期/长期记忆、《Memory for Autonomous LLM Agents》(2026-03)、Anthropic 上下文管理最佳实践。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M5.1 | 会话记忆（短期） | 当前对话上下文 | Redis/DB 存 messages，按 session_id 取 |
| M5.2 | 滚动摘要记忆 | 长对话压缩 | 超阈值触发摘要（M3.14） |
| M5.3 | 长期记忆（跨会话） | 记住用户/项目事实 | key-value 记忆库，重要事实自动写入 |
| M5.4 | 情景记忆（episodic） | 记住"上次做过什么" | 任务/会话记录结构化存储 |
| M5.5 | 语义记忆（semantic） | 概念/知识提取 | 提取→向量化→检索 |
| M5.6 | 程序性记忆（procedural） | 技能/经验沉淀 | "这次怎么做的"存为可复用 skill（Agent Skills 理念） |
| M5.7 | 向量数据库 | 语义检索底座 | Chroma（轻量）/pgvector（生产）/Milvus（大规模） |
| M5.8 | 混合检索 | BM25+向量融合 | Elasticsearch/pgvector 混合，RRF 融合排序 |
| M5.9 | RAG 知识库 | 私有文档问答 | 文档加载→切分→向量化→检索→引用（⚠️ rag_engine.py 缺失） |
| M5.10 | 多格式文档解析 | PDF/Word/Excel/网页 | pypdf/docx/openpyxl/trafilatura 加载器 |
| M5.11 | 记忆分层 | 工作→情景→语义自动流转 | MemGPT 式：重要度评分+自动归档 |
| M5.12 | 遗忘机制 | 过期记忆清理 | TTL + 重要性加权清理 |
| M5.13 | 用户画像 | 偏好/习惯记忆 | 用户配置 + 交互中学习（M12.18） |
| M5.14 | 记忆检索增强 | 决策前查记忆 | agent loop 内每轮检索相关记忆注入 |
| M5.15 | 知识图谱 | 实体关系记忆 | neo4j/自研 triples，关系问答 |
| M5.16 | 记忆加密与隐私 | 敏感记忆保护 | PII 检测+脱敏（M11.8）+ 加密存储 |

---

## M6. 编排与多 Agent

> 参考：A2A 协议（Google，Agent Card/Task/Artifact/Message）+ AutoGen（群聊/ConversableAgent）+ Magentic-One（Orchestrator+Task Ledger+Progress Ledger）+ OpenAI Swarm/Agents SDK（Handoff/Guardrails）+ LangGraph（Supervisor/Subgraph/Fan-out/Fan-in）+ Anthropic 六模式。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M6.1 | 单 Agent 模式 | 一个循环跑到底 | 默认模式，无编排开销 |
| M6.2 | Supervisor 模式 | 主管派活给多个 Worker | langgraph-supervisor：supervisor 节点决定下一个 agent（✅ 模板有） |
| M6.3 | Handoff（交接） | agent 间转交任务 | OpenAI Agents SDK 模式：`handoff(to=agent, description=)` |
| M6.4 | 群聊模式 | 多 agent 互相对话 | AutoGen GroupChat：轮流发言+管理器 |
| M6.5 | 路由模式 | 按意图分发 | router 节点：意图分类→对应 agent（Anthropic routing 模式） |
| M6.6 | 并行模式 | fan-out/fan-in | 任务拆解→并行 worker→聚合（LangGraph fan-out/fan-in） |
| M6.7 | 评估者-优化者 | 生成→评估→改进循环 | Generator+Evaluator 双 agent 循环（Anthropic 模式） |
| M6.8 | 提示链模式 | 步骤串行传递 | chain：A 输出→B 输入（Anthropic 模式） |
| M6.9 | 分层团队 | 子 supervisor 嵌套 | 子图（subgraph）嵌套，每层独立 supervisor |
| M6.10 | 动态 Agent 创建 | 按需生成新 agent | AgentFactory：从模板 yaml 运行时实例化 |
| M6.11 | 任务分解器 | 大任务拆小 | Decomposer agent：任务→子任务清单（Magentic-One Task Ledger） |
| M6.12 | 进度账本 | 任务状态跟踪 | Progress Ledger：每步状态/阻塞/完成记录（Magentic-One 核心） |
| M6.13 | 结果聚合器 | 多 worker 结果合并 | Aggregator：去重/冲突消解/结构化汇总（✅ 已有 base） |
| M6.14 | 共享状态/白板 | 全局上下文共享 | 共享 state dict，任何 agent 可读写（LangGraph state） |
| M6.15 | A2A 客户端 | 调用远程 agent | a2a_client：Agent Card 发现+Task 提交+轮询（⚠️ 缺失） |
| M6.16 | A2A 服务器 | 暴露自身给外部 agent | a2a_server：Agent Card 发布+Task 处理（⚠️ 缺失） |
| M6.17 | 跨框架互操作 | 与别家 agent 通信 | 实现 A2A JSON-RPC 端点 + 认证（Google 标准）+ MCP 工具接入，双协议互通（见 framework-selection.md 一.4） |
| M6.18 | 多 agent 消息协议 | 结构化消息 | 统一 Message 类型：sender/recipient/content/artifact |
| M6.19 | 辩论/博弈模式 | 多观点对抗 | 正反方 agent 辩论→裁判 agent 裁决 |
| M6.20 | 反思循环 | 任务后复盘改进 | Post-task review：什么失败→存入程序性记忆 |
| M6.21 | 编排可视化 | 看到 agent 执行链路 | LangSmith/LangGraph Studio/自绘流程图 |
| M6.22 | 超时与降级 | 子 agent 失败处理 | 子任务超时→降级重试/换 agent/通知 |
| M6.23 | 负载均衡 | 多 worker 分配 | 简单轮询/按能力路由 |
| M6.24 | 编排配置化 | YAML 定义拓扑 | `orchestrator:` 段：模式/成员/连接关系 |

---

## M7. API 服务层

> 参考：OpenAI Assistants API 设计 + FastAPI 生产规范。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M7.1 | 对话端点 | POST /chat | 输入 messages+session_id → 流式/非流式 |
| M7.2 | Agent 运行端点 | POST /agents/run | 输入任务 → agent 执行 |
| M7.3 | 会话管理端点 | CRUD /sessions | 创建/列表/删除会话 |
| M7.4 | 消息历史端点 | GET /sessions/{id}/messages | 历史拉取/分页 |
| M7.5 | 工具端点 | GET /tools | 列出可用工具（OpenAI 风格） |
| M7.6 | 流式 SSE | GET /chat/stream | `text/event-stream`，事件类型化 |
| M7.7 | WebSocket | 实时双向 | 长任务进度推送 + 中断指令 |
| M7.8 | 鉴权 | API Key/JWT/OAuth | middleware 校验（⚠️ 缺失需补） |
| M7.9 | 限流 | 防滥用 | 令牌桶 per key（⚠️ rate_limit.py 缺失） |
| M7.10 | 错误处理 | 统一错误码 | 异常→`{error: {code, message}}`，不泄露堆栈 |
| M7.11 | 健康检查 | GET /health | 依赖探活（DB/模型连通性） |
| M7.12 | 指标端点 | GET /metrics | Prometheus 格式（M13） |
| M7.13 | OpenAPI 文档 | 自动 API 文档 | FastAPI 自带 /docs |
| M7.14 | CORS 配置 | 跨域 | middleware 白名单 |
| M7.15 | 多租户 | 用户/组织隔离 | 租户 id 贯穿请求→存储→配额 |
| M7.16 | API 版本化 | /v1/ 前缀 | 路由前缀+兼容策略 |

---

## M8. 前端 UI

> 参考：ChatGPT / Claude 交互设计。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M8.1 | 聊天界面 | 消息列表+输入框 | React+Vite（✅ 已有框架） |
| M8.2 | 流式渲染 | 逐字输出 | SSE→增量渲染 |
| M8.3 | Markdown/代码渲染 | 富文本展示 | react-markdown + 代码高亮（✅ 已有） |
| M8.4 | 工具调用可视化 | 展示 agent 思考/调工具 | 卡片式展示 tool_call/结果（Claude 风格） |
| M8.5 | 多会话管理 | 侧边栏会话列表 | localStorage/后端 API |
| M8.6 | 会话重命名/删除 | 会话管理操作 | 标题自动生成（LLM 摘要） |
| M8.7 | 文件上传 | 拖拽上传文档 | 上传→入库→RAG |
| M8.8 | 文件下载 | 结果导出 | 生成物列表+下载链接 |
| M8.9 | 语音输入/输出 | 语音对话 | Web Speech API/Whisper+TTS |
| M8.10 | 配置面板 | 模型/温度/工具开关 | 设置抽屉（M10 之外的用户配置） |
| M8.11 | 暗色模式 | 主题切换 | CSS 变量+持久化 |
| M8.12 | 移动端适配 | 响应式 | 移动优先 CSS |
| M8.13 | 国际化 | 多语言 UI | i18next |
| M8.14 | 可访问性 | a11y | ARIA/键盘导航 |
| M8.15 | 会话分享/导出 | 分享链接/导出 MD/PDF | 后端生成分享 token |
| M8.16 | 管理控制台骨架 | 资源列表+详情工作区 | 左侧导航+资源列表+4-Tab 详情（配置/测试/运行/审计），见 docs/admin-console-design.md 〇章 |
| M8.17 | 提示词管理界面 | 可视化编辑+变量+版本+测试 | Prompt 编辑器（语法高亮/变量扫描/token 计数）+ 区块预算条 + 版本 diff/回滚（见设计文档 一章） |
| M8.18 | AI 自动生成 | 每个资源内嵌 AI 助手 | 从描述生成/优化/改写/多语言/防注入审查，结果另存为草稿版本（见设计文档 1.2） |
| M8.19 | 外部导入导出 | 文件/Git/URL/市场/平台转换 | 统一 Importer：YAML/JSON/CSV 拖拽、Git 同步、URL 拉取、模板市场、其他平台格式转换（见设计文档 1.3） |
| M8.20 | 统一测试台 | 任何资源保存前可试跑 | SchemaForm 渲染配置 + TestRunner 沙盒试跑（输入→输出→指标），测试不通过不允许启用（见设计文档 〇章组件表） |
| M8.21 | 工具/模型/Agent 管理界面 | 资源配置、启停、测试 | Tool Manager（Schema 可视化/MCP 向导/热加载）、Model Manager（多 key 轮换/fallback 链）、Agent Manager（Graph 可视化/发布灰度）（见设计文档 二~四章） |
| M8.22 | 记忆/编排/评估管理界面 | 知识库、拓扑、跑分 | Knowledge Manager（分块预览/检索测试）、Orchestration Manager（任务 DAG 监控）、Eval Manager（回归对比/质量门禁）（见设计文档 五~七章） |
| M8.23 | 监控/权限/系统设置 | 运营面 | 指标看板/告警规则/IAM 权限矩阵/环境变量可视化（见设计文档 八~十章） |

---

## M9. 基础设施与 DevOps

> 参考：12-Factor + Docker/K8s 生产规范。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M9.1 | 后端 Dockerfile | 可复现镜像 | python:3.11-slim + requirements 锁定 |
| M9.2 | 前端 Dockerfile | 前端镜像 | node build → nginx（⚠️ 缺失） |
| M9.3 | docker-compose | 一键起全套 | backend+frontend+db+vector（✅ 已有 compose） |
| M9.4 | 配置管理 | 环境配置 | pydantic-settings + .env（✅ 已有 .env.example） |
| M9.5 | 密钥管理 | 不落仓库 | .env + Vault/Secret Manager |
| M9.6 | CI 流水线 | 自动测试构建 | GitHub Actions：lint→test→build（⚠️ 只有 dependabot） |
| M9.7 | CD 部署 | 自动发布 | 镜像 push→部署脚本 |
| M9.8 | 单元测试 | 代码正确性 | pytest：graph/API/工具各层 |
| M9.9 | 集成测试 | 端到端 | 起服务→真实调用→断言 |
| M9.10 | Lint/格式化 | 代码规范 | ruff/black/eslint/prettier |
| M9.11 | 版本管理 | tag/release | semver + changelog |
| M9.12 | 数据库迁移 | schema 演进 | alembic |
| M9.13 | 备份恢复 | 数据安全 | DB dump + 恢复演练 |
| M9.14 | K8s 部署（可选） | 生产规模 | helm chart / manifests |
| M9.15 | 灰度发布 | 渐进上线 | 蓝绿/金丝雀 |

---

## M10. 评估体系

> 参考：Anthropic 评测驱动迭代 + LLM-as-judge（论文 GPT-4 as Judge）+ AgentBench/Gaia 基准。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M10.1 | 基准任务集 | 标准测试集 | 每个 agent 类型配 10-50 个典型任务 |
| M10.2 | 工具调用成功率 | 工具是否用对 | 记录正确/错误/幻觉调用 |
| M10.3 | 任务完成率 | 端到端成败 | 结果 vs 期望断言（LLM 判定） |
| M10.4 | LLM-as-Judge | 自动打分 | 裁判 prompt：评分标准+示例，可多裁判投票 |
| M10.5 | 人工评估工作流 | 人工标注 | 结果集→人工评分→入库 |
| M10.6 | 回归测试 | 改动不退化 | CI 跑基准集对比历史分数 |
| M10.7 | 成本/延迟指标 | 效率评估 | 每任务 token/耗时统计 |
| M10.8 | 评估报告生成 | 可视化对比 | 自动生成 markdown/HTML 报告 |
| M10.9 | 对抗性测试 | 注入/边界输入 | 恶意 prompt 集测试鲁棒性 |
| M10.10 | 提示词 A/B 测试 | 优化 prompt | 同任务多 prompt 版本对比 |
| M10.11 | 模型对比 | 换模型评估 | 同任务跑多模型对比（Model Garden 风格） |
| M10.12 | 记忆效果评估 | 记忆有用性 | 跨会话任务：是否记住并利用 |
| M10.13 | 多 Agent 协调评估 | 编排质量 | 子任务分配合理性/空转率 |
| M10.14 | 持续评估集成 | 自动化门槛 | 分数低于基线→CI 失败 |

---

## M11. 安全与合规

> 参考：OWASP LLM Top 10 + Prompt Guard 2 + 各厂安全实践。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M11.1 | 提示注入防护 | 防指令劫持 | 输入分类器（Prompt Guard）+ 输出边界强化 |
| M11.2 | 工具权限最小化 | 只给必需工具 | allowed_tools 白名单 + 运行时不越权 |
| M11.3 | 代码执行沙箱 | 恶意代码隔离 | 容器/受限用户/无网络（M4.18） |
| M11.4 | 路径穿越防护 | 防读写任意文件 | 路径规范化+根目录校验 |
| M11.5 | 输出内容过滤 | 防有害输出 | 关键词+分类器过滤，可配置级别 |
| M11.6 | 数据加密 | 传输+存储加密 | TLS + 字段级加密 |
| M11.7 | PII 脱敏 | 隐私保护 | 检测（姓名/手机/身份证）→掩码 |
| M11.8 | 审计日志 | 全程留痕 | 输入/输出/工具调用/操作者（M13） |
| M11.9 | 密钥安全管理 | 不泄露凭据 | 环境变量+密钥库+日志脱敏 |
| M11.10 | 速率与配额 | 防滥用 | 限流+配额（M7.9） |
| M11.11 | 合规声明 | 领域合规 | 医疗/金融免责 + 合规检查节点 |
| M11.12 | 模型行为护栏 | 拒答有害请求 | 系统提示+输入输出双重过滤 |
| M11.13 | 会话隔离 | 用户数据不串 | 租户/会话级数据隔离 |
| M11.14 | 供应链安全 | 依赖漏洞 | dependabot（✅ 已有）+ 镜像扫描 |

---

## M12. 高级能力

> 参考：各厂 2025-2026 前沿功能全集。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M12.1 | 上下文自动压缩 | 长会话不丢信息 | 滚动摘要（M3.14，Claude Code 核心） |
| M12.2 | 子 Agent 并行 | 多任务同时跑 | Claude Research 模式：fan-out 子 agent |
| M12.3 | 技能系统（Skills） | 可复用技能包 | SKILL.md 规范：frontmatter+指令+scripts（✅ 本仓库自身即技能） |
| M12.4 | 技能渐进式加载 | 按需读取细节 | SKILL.md 洋葱结构：描述→指令→references（Anthropic 规范） |
| M12.5 | 插件系统 | 第三方扩展 | 插件目录+注册表+动态加载 |
| M12.6 | Webhook 事件 | 外部触发 agent | 事件→任务入队→执行→回调 |
| M12.7 | 定时任务 | 周期执行 | cron 调度器（监控/日报等） |
| M12.8 | 后台长任务 | 小时级任务 | 任务队列（Celery/ARQ）+ 进度上报 |
| M12.9 | 任务中断/恢复 | 用户可打断 | checkpoint + 恢复接口 |
| M12.10 | 浏览器自动化 | 模拟人操作网页 | Playwright 工具（M4.8） |
| M12.11 | 计算机使用（Computer Use） | 操作整个桌面 | 截图→坐标点击（Anthropic computer-use 工具） |
| M12.12 | 自主代码调试 | 报错自修 | 错误回喂→定位→修复→重跑（M3.10） |
| M12.13 | 知识图谱推理 | 多跳关系问答 | neo4j + GraphRAG |
| M12.14 | 个性化学习 | 适配用户风格 | 交互日志→画像→输出风格调整 |
| M12.15 | 多语言服务 | 语言自适应 | 检测语言→对应回复+翻译 |
| M12.16 | 语音对话 | 完整语音链路 | ASR→agent→TTS |
| M12.17 | 图像生成 | 文生图 | 接入图像模型工具 |
| M12.18 | 用户偏好记忆 | 记住偏好 | 偏好抽取→记忆库（M5.13） |
| M12.19 | 团队协作 agent | 多个 agent 各自角色协同 | 分层团队模式（M6.9） |
| M12.20 | 自我改进 | 从反馈学习 | 反馈→程序性记忆→下次更优 |
| M12.21 | 多文档综合 | 跨文档答案 | 多源检索→综合→引用（research 核心） |
| M12.22 | 流式规划 | 边做边改计划 | replan 节点：执行中检查计划有效性 |
| M12.23 | 错误降级 | 优雅失败 | 失败→简化方案→告知用户 |
| M12.24 | 环境感知 | 感知运行环境 | 系统信息/当前目录/时间注入 |

---

## M13. 可观测性

> 参考：OpenTelemetry + LangSmith/Langfuse + AgentOps。

| # | 功能项 | 说明 | 怎么做 |
|---|--------|------|--------|
| M13.1 | 结构化日志 | 可检索日志 | JSON logs + loguru |
| M13.2 | 请求链路追踪 | 全链路定位 | OTel spans：请求→agent→工具→LLM |
| M13.3 | LLM 调用记录 | 每轮 prompt/响应 | 存库可回放（Langfuse 风格） |
| M13.4 | 工具调用追踪 | 工具级指标 | 耗时/成功率/参数 |
| M13.5 | 延迟指标 | p50/p95/p99 | Prometheus histogram |
| M13.6 | 错误率监控 | 异常告警 | 错误计数+告警规则 |
| M13.7 | 成本监控 | 每日成本 | 用量×单价聚合 |
| M13.8 | 令牌用量 | token 消耗追踪 | 输入/输出分开统计 |
| M13.9 | 会话回放 | 重看整个交互 | 消息+工具调用全量存储 |
| M13.10 | 告警通知 | 异常触发推送 | 阈值→webhook/邮件 |
| M13.11 | 健康仪表盘 | 运行状态一览 | Grafana 面板 |
| M13.12 | 评估指标可视化 | 质量趋势 | 分数/成功率时间序列 |

---

## 🏢 大厂生态对标总表（本清单覆盖证明）

| 生态 | 核心资产 | 本清单覆盖的功能 |
|------|---------|-----------------|
| **Anthropic** | Claude Agent SDK（工具循环/上下文压缩/子代理/钩子）、Agent Skills（SKILL.md）、MCP、六种工作流模式 | M3.1/M3.14/M3.15/M3.16、M12.3-M12.4、M4.16-M4.17、M6.5-M6.8 |
| **OpenAI** | Agents SDK（Agent/Handoffs/Guardrails/Tracing）、Swarm、Assistants API、Codex | M6.3、M10.4、M13、M7.x、M0.3 |
| **Google** | A2A 协议（Agent Card/Task/Artifact）、ADK、Vertex AI Agent Builder、Agent Engine | M6.15-M6.17、M7.x、M6.2 |
| **Microsoft** | AutoGen（群聊/ConversableAgent）、Magentic-One（Orchestrator/Ledger）、Semantic Kernel、Agent Framework | M6.4、M6.11-M6.12、M3.11 |
| **LangChain 系** | LangGraph 1.0（StateGraph/Command/checkpoint/supervisor/subgraph）、LangSmith | M3.4/M3.11/M3.12、M6.2/M6.6/M6.9、M13 |
| **开源生态** | CrewAI、LlamaIndex（RAG）、Dify/FastGPT/Coze（低代码）、MemGPT | M5.x、M10.x、M8.x |

---

## 🎯 完整性对比操作手册（怎么用这份清单）

### 对比流程
1. **逐项过清单**：对目标智能体，M0→M13 每项标 ✅/🔶/⬜
2. **看缺口分布**：
   - 缺 M1-M6 → 能力层不足（智能体"不聪明/干不了活"）
   - 缺 M7-M9 → 工程层不足（智能体"上不了线/难维护"）
   - 缺 M10-M13 → 质量层不足（智能体"不可信/不可观测"）
3. **输出对比报告**：缺失项 + 对应"怎么做"列 = 补全方案

### 本仓库定位
- 本仓库 = **通用底座**：按 M0-M13 全量实现（目前缺口见下表）
- 用户智能体 = 底座 + 业务细节：从 M0 选类型模板 → 填业务 YAML → 加垂直工具/知识库

### 本仓库当前缺口（对照 M0-M13）
| 模块 | 状态 | 主要缺口 |
|------|------|---------|
| M0 | 🔶 | 仅 5 类模板，缺 17 类 |
| M1 | 🔶 | 缺 Gemini/国产适配、路由、fallback |
| M2 | 🔶 | 缺版本管理（few-shot/注入防护已补） |
| M3 | 🔶 | 钩子/检查点已补，缺规划器/反思器/压缩 |
| M4 | 🔶 | MCP 客户端+服务器已补，缺沙箱/浏览器 |
| M5 | ✅ | summary/rag/knowledge_base/vector_store 全套已补 |
| M6 | ✅ | supervisor/router/workflow/A2A 客户端+服务器已补 |
| M7 | ✅ | 鉴权/限流/日志中间件已补（多租户待做） |
| M8 | 🔶 | 缺工具可视化/语音/配置面板 |
| M9 | 🔶 | Dockerfile/nginx 已补，缺 CI/CD、测试套件 |
| M10 | 🔶 | evaluate.py 已补，缺数据集与报告模板 |
| M11 | 🔶 | 注入防护/sanitizer 已补，缺完整合规清单 |
| M12 | 🔶 | 缺技能系统/定时/插件/语音 |
| M13 | 🔶 | monitoring.py（OTel+Prometheus）已补，缺面板/告警 |

---

## 📚 参考资料索引

**论文**
- The Rise and Potential of LLM-Based Agents: A Survey（arXiv 2309.07864，复旦）
- A Survey on LLM based Autonomous Agents（arXiv 2308.11432，人大高瓴）
- AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation（arXiv 2308.08155，Microsoft）
- LLM based Multi-Agents: A Survey of Progress and Challenges（NUS）
- The Five Ws of Multi-Agent Communication
- Memory for Autonomous LLM Agents（2026-03）
- SoK: Agentic Skills（2026-02）
- GPT-4 as LLM Judge（arXiv 2306.05685）

**官方文档**
- Anthropic：Building Effective Agents / Claude Agent SDK / Agent Skills / MCP 协议（2026-07-28 stateless）
- OpenAI：Agents SDK / Swarm / Assistants API
- Google：A2A Protocol（Agent Card/Task/Artifact）/ ADK（Agent Development Kit）
- Microsoft：AutoGen / Magentic-One / Semantic Kernel / Agent Framework
- LangChain：LangGraph 1.0 文档

---

*本清单为活文档：大厂生态持续演进，建议每季度对照各厂 Release Notes 增补。*
*维护：agent-dcbd3b02 | 仓库：agent-builder-skill（gitcode/gitee/github 三平台镜像）*
