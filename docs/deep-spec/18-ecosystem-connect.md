# 18. 可接入生态与现成服务大全（Ecosystem & Ready-made Services）

> **定位**：17-J 给出了"别造轮子"的 16 个基础领域；本份把**可接入生态**展开成全景清单——AI 应用平台、MCP 工具生态、浏览器自动化、模型服务、检索存储、数据源、渠道集成、可观测运营、眼前一亮项目等 9 类 ≈100 项。每项标注：**直接接入 / 借鉴参考 / 白标替换 / 仅学习**，避免"明明有现成的还在自己造"。
> **对照基准**：Dify/Coze/FastGPT/RAGFlow/Open WebUI/LobeChat/n8n/Flowise 等开源平台、MCP 官方生态、browser-use 等自动化库、Langfuse 等可观测工具。
> **用法**：选型时先查本清单；接入任何一项前回答三问（17-J 灵魂三问）：①有现成的吗 ②现成哪里不满足 ③自研 5 年维护成本。

## 子域总览（9 类 ≈100 项）

| 类 | 内容 | 项数 | 接入策略 |
|----|------|------|----------|
| A | AI 应用开发平台（对标/可白标/可借鉴） | 14 | 借鉴为主，白标可选 |
| B | MCP 工具生态 | 10 | 直接接入（标准协议） |
| C | 浏览器自动化与 RPA | 6 | 直接接入 |
| D | 模型服务与推理（MaaS/开源/本地） | 12 | 直接接入 |
| E | 检索、向量与存储 | 10 | 直接接入 |
| F | 数据源与内容接入 | 12 | 直接接入 |
| G | 渠道与 IM 集成 | 12 | 直接接入 |
| H | 可观测、评测与运营 | 12 | 直接接入 |
| I | 眼前一亮项目（灵感库） | 12 | 借鉴为主 |
| **合计** | | **≈100** | |

---

## A. AI 应用开发平台（14 项）

| # | 项目 | 定位与关键能力 | 接入策略 | 说明 |
|---|------|----------------|----------|------|
| A.1 | Dify（langgenius/dify，101k★） | 低代码 Agent 平台：工作流编排/Agent/RAG/模型管理/团队协作；四层架构（交互 Next.js → 编排 Flask+Celery → 模型路由 → PG+向量库）；混合检索（BM25+向量，召回精度 +30%） | 借鉴 | 本项目的直接对标物；白标替换需评估深度定制成本 |
| A.2 | Coze（字节） | 云端 Agent 平台：Bot 市场/插件/知识库/工作流/多端发布 | 借鉴 | 交互体验与发布体系对标（见 comparison-2026） |
| A.3 | FastGPT（25k★） | 轻量 RAG+Agent，API 完全兼容 OpenAI 格式，部署最简单 | 直接接入（能力复用） | 团队内快速搭知识问答可直接用 |
| A.4 | RAGFlow（18k★） | 文档解析专家：复杂 PDF/合同/技术文档处理与检索精度业内领先 | 直接接入（RAG 能力）/借鉴 | 16-D 知识库可挂它做解析引擎 |
| A.5 | Open WebUI | 类 ChatGPT 本地界面：离线运行、多模型管理、RBAC、对话加密、RAG 集成 | 白标替换（若不需要深度定制管理台） | 私有化内部助手最快路径 |
| A.6 | LobeChat | 现代化对话前端：插件市场/多模型/文件解析/角色市场 | 白标替换（前端）/借鉴 | 对话 UI 细节可大量借鉴 |
| A.7 | n8n | 流程自动化中枢（400+ 集成节点，支持 AI 节点） | 直接接入（编排）/借鉴 | 09 定时/自动化任务可基于它 |
| A.8 | Flowise | 可视化 LLM 应用搭建（LangChain 封装） | 借鉴 | 拖拽式工作流参考 |
| A.9 | AnythingLLM | 一体化 RAG 桌面/服务应用 | 借鉴 | 轻量知识库场景参考 |
| A.10 | QAnything / MaxKB | 企业知识库问答（网易有道/飞致云） | 直接接入（知识库）/借鉴 | 中文文档解析与问答管线参考 |
| A.11 | Cherry Studio / NextChat | 多模型桌面客户端/Web 客户端 | 借鉴 | 前端模型切换/会话管理体验参考 |
| A.12 | One API / New API | 模型 API 网关（密钥管理/计费/渠道轮询） | 直接接入 | 16-G 开放平台网关可基于它 |
| A.13 | Langfuse / LangSmith | LLM 可观测与评测平台 | 直接接入 | 17-J.5，12-monitor 对接 |
| A.14 | SearXNG | 开源元搜索引擎（Dify 内置工具之一） | 直接接入 | 联网搜索能力私有化方案 |

## B. MCP 工具生态（10 项）

| # | 项目 | 关键能力 | 接入策略 | 说明 |
|---|------|----------|----------|------|
| B.1 | MCP 协议（Model Context Protocol） | 工具/资源/提示的开放标准协议（stdio/HTTP/SSE 传输） | 直接接入（标准） | 04-tools 对外暴露层必须支持 MCP |
| B.2 | mcp-use | 连接任意 LLM↔任意 MCP 服务器；多服务器/动态选择/工具访问控制/流式输出/沙盒（E2B） | 直接接入 | 本项目 AgentRuntime 的工具接入桥 |
| B.3 | browser-use（+mcp-server） | LLM 直接控制真实浏览器（DOM→提示词→JSON 动作→Playwright 执行闭环） | 直接接入 | 02-沙箱/网页自动化能力 |
| B.4 | Playwright MCP | 浏览器自动化 MCP 官方服务 | 直接接入 | 网页测试/抓取 |
| B.5 | GitHub MCP / Git MCP | 仓库/Issue/PR/代码检索 | 直接接入 | 开发者 Agent 标配工具 |
| B.6 | 官方 MCP Servers（Anthropic 官方合集） | 文件系统/数据库/网络/搜索/日历/邮件等 20+ 官方服务器 | 直接接入 | 04-tools 现成工具来源 |
| B.7 | Composio（+MCP） | 250+ 集成工具的 Agent 工具箱平台 | 直接接入（API）/借鉴 | 企业工具接入（GitHub/Slack/Gmail/CRM） |
| B.8 | E2B | 云端沙盒执行环境（MCP 服务器安全运行） | 直接接入 | 02-沙箱云化方案 |
| B.9 | mcp-proxy | MCP 服务器代理/统一接入 | 直接接入 | 网关层复用 |
| B.10 | DeepResearcher | 基于 MCP+browser-use 的深度研究 Agent 范式 | 借鉴 | 研究报告类 Agent 架构参考 |

## C. 浏览器自动化与 RPA（6 项）

| # | 项目 | 关键能力 | 接入策略 | 说明 |
|---|------|----------|----------|------|
| C.1 | Playwright | 跨浏览器自动化（Chromium/Firefox/WebKit），多语言 SDK | 直接接入 | 浏览器自动化底座 |
| C.2 | browser-use | 视觉+DOM 双模态浏览器控制库（Pydantic 输出约束/自定义动作） | 直接接入 | B.3 的库本体 |
| C.3 | Selenium | 传统 Web 自动化 | 按需 | 老系统兼容时才用 |
| C.4 | Puppeteer | Node 系无头浏览器 | 按需 | 截图/PDF 生成 |
| C.5 | RPA 平台（影刀/UIbot 等） | 桌面+网页 RPA | 借鉴 | 企业遗留系统自动化场景 |
| C.6 | OCR+表单识别（PaddleOCR 等） | 验证码/票据/表单结构化 | 直接接入 | 16-D/17-F 联动 |

## D. 模型服务与推理（12 项）

| # | 项目 | 关键能力 | 接入策略 | 说明 |
|---|------|----------|----------|------|
| D.1 | OpenAI / Anthropic / Gemini API | 旗舰闭源模型 | 直接接入 | 06-models 默认通道 |
| D.2 | DeepSeek / Qwen / GLM / Kimi | 国产闭源 API（性价比） | 直接接入 | 中文场景主力 |
| D.3 | OpenRouter | 多模型聚合路由（统一 API） | 直接接入 | 网关备选（J.1） |
| D.4 | Ollama | 本地一键跑开源模型（llama/qwen 等） | 直接接入 | 私有化/离线/开发调试 |
| D.5 | vLLM | 高性能开源模型推理服务（PagedAttention） | 直接接入 | 自建 GPU 推理 |
| D.6 | LocalAI / Xorbits Inference | OpenAI 兼容本地推理运行时 | 直接接入 | 私有化部署 |
| D.7 | Hugging Face / Replicate / Groq / Together / AWS Bedrock | MaaS 聚合（HF 模型托管/Replicate 按次计费/Groq 超低延迟/Together 开源模型/Bedrock 企业合规） | 直接接入 | 06-models 多 provider 路由候选 |
| D.8 | Embedding API（OpenAI/Qwen/bge 等） | 向量化模型服务 | 直接接入 | 检索底座（E 类联动） |
| D.9 | Rerank API（bge-reranker/Cohere） | 检索重排模型 | 直接接入 | 16-D.5 混合检索 rerank 层 |
| D.10 | 语音 API（腾讯/讯飞/OpenAI/Whisper） | ASR/TTS | 直接接入 | 08-voice |
| D.11 | 图像/视频理解 API（GPT-4o/GLM-4V/Qwen-VL） | 多模态理解 | 直接接入 | 02-沙箱/多模态消息 |
| D.12 | 图像生成 API（Stable Diffusion/FLUX/DALL·E/腾讯混元） | 文生图 | 直接接入 | 创意工具类 Agent |

## E. 检索、向量与存储（10 项）

| # | 项目 | 关键能力 | 接入策略 | 说明 |
|---|------|----------|----------|------|
| E.1 | Milvus / Qdrant | 高性能向量数据库（10 亿级/过滤/HNSW） | 直接接入 | 大规模知识库 |
| E.2 | pgvector（PostgreSQL） | 关系库内向量检索 | 直接接入 | 中小规模默认首选（省一套系统） |
| E.3 | Chroma / LanceDB | 轻量向量库（本地/嵌入） | 直接接入 | 原型与单机 |
| E.4 | Elasticsearch / OpenSearch | 全文检索+BM25+聚合分析 | 直接接入 | 混合检索关键词侧 |
| E.5 | Meilisearch | 轻量全文搜索（中文友好） | 直接接入 | 中规模场景 |
| E.6 | Redis（+RediSearch） | 缓存/会话/限流/向量搜索 | 直接接入 | 通用基础设施 |
| E.7 | SQLite / PostgreSQL / MySQL | 业务数据存储 | 直接接入 | 资产模型落库 |
| E.8 | MinIO / S3 / COS / OSS | 对象存储（文件/附件/备份） | 直接接入 | 02-沙箱文件、16-G 附件 |
| E.9 | DuckDB | 分析型嵌入式数据库 | 直接接入 | 统计报表场景 |
| E.10 | TiDB / OceanBase | 分布式关系库 | 按需 | 超大规模才上 |

## F. 数据源与内容接入（12 项）

| # | 数据源 | 接入方式 | 接入策略 | 说明 |
|---|--------|----------|----------|------|
| F.1 | 本地文件（PDF/Word/PPT/Excel/图片/音视频） | 上传解析管线（Unstructured/PyMuPDF/PaddleOCR） | 直接接入 | 16-D.2 解析 |
| F.2 | 网页/URL | 爬取+正文抽取（Jina Reader/Trafilatura/Playwright） | 直接接入 | 联网知识采集 |
| F.3 | 数据库（MySQL/PG/Oracle/SQL Server） | 只读连接+SQL 工具 | 直接接入 | 企业数据问答 |
| F.4 | 开放 API（天气/股票/物流/地图） | HTTP 工具封装 | 直接接入 | 04-tools 示例工具 |
| F.5 | RSS/新闻源 | RSS 解析+定时抓取 | 直接接入 | 09 定时任务+资讯 Agent |
| F.6 | 网盘/云文档（腾讯文档/飞书文档/语雀/Notion） | 官方 API/连接器 | 直接接入 | 16-G.8 连接器 |
| F.7 | 邮件（IMAP/Exchange） | 邮件协议接入 | 直接接入 | 邮件 Agent |
| F.8 | 企业系统（ERP/CRM/工单） | API/中间件（MuleSoft 式） | 按需 | 16-N.4 老系统集成 |
| F.9 | IM 群消息（企微/钉钉/飞书/Slack） | 机器人事件订阅 | 直接接入 | G 类联动 |
| F.10 | 代码仓库（GitHub/GitLab/Gitee） | 官方 API/Webhook | 直接接入 | 开发者 Agent |
| F.11 | 传感器/物联网 | MQTT/HTTP 上报 | 按需 | 工业/校园场景 |
| F.12 | 音视频流（直播/会议） | 实时 ASR 接入 | 按需 | 会议纪要 Agent |

## G. 渠道与 IM 集成（12 项）

| # | 渠道 | 能力 | 接入策略 | 说明 |
|---|------|------|----------|------|
| G.1 | 企业微信 | 自建应用/群机器人/客户联系 | 直接接入 | 企业内部发布首选 |
| G.2 | 钉钉 | 机器人/工作台/酷应用 | 直接接入 | 企业内部发布 |
| G.3 | 飞书 | 机器人/多维表格/云文档 | 直接接入 | 知识+IM 一体化 |
| G.4 | Slack | App/命令/Slash 命令 | 直接接入 | 外企/技术团队 |
| G.5 | Telegram | Bot API | 直接接入 | 个人/社群 |
| G.6 | Discord | Bot/频道 | 直接接入 | 社群 |
| G.7 | Web 聊天窗（嵌入） | iframe/JS SDK | 直接接入 | 16-G.9 嵌入模式 |
| G.8 | 微信生态 | 公众号/小程序/客服消息 | 直接接入 | 16-H 发布分发 |
| G.9 | 邮件 | 收件→回复 | 直接接入 | 异步场景 |
| G.10 | 语音电话（IVR） | 电话语音交互 | 按需 | 呼叫中心场景 |
| G.11 | 短信 | 通知/验证码 | 直接接入 | 16-G.6 通知网关 |
| G.12 | 小程序/App SDK | 移动端 | 直接接入 | 16-H 分发渠道 |

## H. 可观测、评测与运营（12 项）

| # | 项目 | 能力 | 接入策略 | 说明 |
|---|------|------|----------|------|
| H.1 | Langfuse | trace/评测/成本/提示词管理，开源可私有化 | 直接接入 | 12-monitor 首选 |
| H.2 | LangSmith | LangChain 全家桶可观测+评测 | 直接接入 | 深度绑定 LangChain 时 |
| H.3 | Helicone | 轻量 LLM 网关可观测（缓存/限流/日志） | 直接接入 | 快速起步 |
| H.4 | OpenTelemetry | 标准可观测协议（trace/metric/log） | 直接接入 | 统一埋点标准 |
| H.5 | Prometheus + Grafana | 指标采集与看板 | 直接接入 | 系统级监控 |
| H.6 | Sentry / 前端监控 | 错误上报/性能监控 | 直接接入 | 前端崩溃追踪 |
| H.7 | Ragas / Promptfoo / DeepEval | LLM 应用评测框架 | 直接接入 | 11-eval 挂载 |
| H.8 | PostHog / Mixpanel | 产品分析（漏斗/留存/会话回放） | 直接接入 | 16-J 分析洞察 |
| H.9 | 用户反馈收集（NPS/问卷） | 反馈闭环 | 直接接入 | 15-ux 反馈域 |
| H.10 | 告警通知（企微/钉钉/邮件/短信） | 告警分发 | 直接接入 | 12-monitor 告警通道 |
| H.11 | 日志平台（ELK/Loki） | 日志聚合检索 | 直接接入 | K.4 日志脱敏后接入 |
| H.12 | 压测工具（k6/Locust） | 性能压测 | 直接接入 | 17-K.7 上线前压测 |

## I. 眼前一亮项目（灵感库 12 项）

| # | 项目 | 亮点 | 借鉴点 |
|---|------|------|--------|
| I.1 | CrewAI | 角色化多 Agent 协作（Role/Goal/Backstory） | 多 Agent 分工人设设计 |
| I.2 | MetaGPT | SOP 化多 Agent（产品→架构→代码流水线） | 流程化 Agent 团队编排 |
| I.3 | AutoGen（微软） | 可对话多 Agent 框架（GroupChat 机制） | 群聊式多 Agent 协作模式 |
| I.4 | OpenAI Swarm / Agents SDK | 轻量手写 Agent 范式（Handoffs） | 极简多 Agent 交接模式 |
| I.5 | AgentScope（阿里） | 多 Agent 应用开发与评测一体 | 分布式多 Agent 调试 |
| I.6 | awesome-llm-apps（58k★） | 入门级 AI Agent 应用合集 | 现成场景参考/教学 |
| I.7 | Modal / Replicate | 云函数跑 AI 任务（秒级冷启动） | 02-沙箱弹性执行 |
| I.8 | LangGraph Studio | 图式 Agent 可视化调试 | 07-workflow 调试 UI 对标 |
| I.9 | Copilot Studio（微软） | 企业 Copilot 定制/合规护栏 | 企业级护栏与发布体系 |
| I.10 | WorkBuddy | Craft/Plan/Ask 三自主模式、MCP Server、高危指令拦截 | 16 企业能力对标（已入 comparison-2026） |
| I.11 | ChatGPT Projects / Claude Projects | 项目级知识+指令打包 | 08-workflow 工作空间概念 |
| I.12 | OpenClaw（本项目运行环境） | 记忆文件（MEMORY/AGENTS/SOUL）、cron、多通道消息 | Agent 自身工程化范式 |

---

## 接入决策规则

1. **能力分层**：基础能力（模型/存储/搜索/监控）→ 必须用现成；平台能力（工作流/管理台/审计）→ 优先借鉴开源实现，深度定制才自研；差异化能力（Agent 编排细节/UX 细节）→ 自研。
2. **成本算法**：自研成本 ≈ 开发 × 1 + 维护 × 5 + 踩坑 × 3；现成方案不满足时，先量差距（17-J 灵魂三问）。
3. **接入顺序**：先接"无脑接入"类（D/E/F/G/H 直接接入项）→ 再评估"白标/借鉴"类（A 平台）→ 最后才决策自研。
4. **生态跟随**：MCP 协议是 2026 年事实标准，所有自研工具层必须兼容 MCP（B.1），避免封闭工具格式。
