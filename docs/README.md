# Agent-Builder-Skill 文档中心 / Docs

> **规格驱动 · 拒绝空壳** —— 本仓库的一切能力都以文档为第一公民：功能清单（做什么）→ 深度规格（怎么做）→ 验收测试（怎么证明）。所有文档三线对齐，任何一条缺位即为真实缺口。

| 资产 | 数量 | 状态 |
|------|------|------|
| 顶层规格 full-spec | P0-P10 全量 | ✅ |
| 深度规格 deep-spec | **37 份**（00 模板 + 01-36） | ✅ 全部完成 |
| 功能清单 feature-checklist | **1465+ 项**（M0-M34） | ✅ |
| 验收测试 acceptance-test | **430 条** | ✅ |
| 框架选型 framework-selection | 6 框架对比 | ✅ |
| 管理台设计 admin-console-design | 完整设计 | ✅ |
| 能力对比 comparison-2026 | 4 应用矩阵 | ✅ |

---

## 顶层文档 / Top-level Docs

| 文档 | 说明 |
|------|------|
| [full-spec.md](full-spec.md) | **P0-P10 页面级全量规格**：所有页面的功能、组件、交互、接口定义 |
| [feature-checklist.md](feature-checklist.md) | **M0-M34 功能清单（1465+ 项）**：十四大模块 → 三十五模块演进，每项标注深度规格挂载 + 验收引用 |
| [acceptance-test.md](acceptance-test.md) | **430 条验收测试**：步骤 + 预期结果，可逐条执行；全绿 = 功能完整性验收通过 |
| [framework-selection.md](framework-selection.md) | **六框架选型指南**：bare / LangGraph / OpenAI Agents / Claude SDK / ADK / AutoGen 决策矩阵 |
| [admin-console-design.md](admin-console-design.md) | **管理台设计**：资源化 + 4-Tab（配置-测试-运行-审计）+ 三输入通道 |
| [comparison-2026.md](comparison-2026.md) | **能力对比矩阵**：豆包/GPT 网页端/Codex/Claude Code/WorkBuddy 对照基准 |
| [analysis-report.md](analysis-report.md) | 代码分析报告 |

---

## 深度规格 / Deep Specs（37 份）

每份统一 **7 章模板**：① 定位与架构 ② 资产数据模型（全字段） ③ 配置项全清单 ④ 管理界面（增删改调+辅助功能） ⑤ 运行时嵌入链路（真实代码路径） ⑥ 安全与权限 ⑦ 前后端对齐矩阵 + 状态 + 验证方法。

### 核心运行时（01-14）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 00 | [00-template.md](deep-spec/00-template.md) | 统一 7 章模板 + 全模块索引 |
| 01 | [01-prompt-system.md](deep-spec/01-prompt-system.md) | 提示词系统：资产表/版本/生命周期/渲染管线/3 种嵌入模式 |
| 02 | [02-sandbox.md](deep-spec/02-sandbox.md) | 沙箱：6 种类型矩阵/三级开关/8 步执行链路/审批 HITL |
| 03 | [03-context.md](deep-spec/03-context.md) | 上下文工程：8 种区块/预算占比/压缩 4 策略/6 步组装 |
| 04 | [04-tools.md](deep-spec/04-tools.md) | 工具系统：注册表/参数解析/执行引擎/MCP 双端 |
| 05 | [05-memory.md](deep-spec/05-memory.md) | 记忆系统：缓冲/摘要/向量/RAG/长期记忆 |
| 06 | [06-models.md](deep-spec/06-models.md) | 模型管理：8 家适配器/统一接口/重试降级/流式 |
| 07 | [07-workflow.md](deep-spec/07-workflow.md) | 编排工作流：DAG/条件路由/重试/断点 |
| 08 | [08-voice.md](deep-spec/08-voice.md) | 语音能力：ASR/TTS/语音交互链路 |
| 09 | [09-schedule.md](deep-spec/09-schedule.md) | 定时任务：调度器/表达式/任务持久化 |
| 10 | [10-skill-plugin.md](deep-spec/10-skill-plugin.md) | 技能与插件：加载器/市场/依赖管理 |
| 11 | [11-eval.md](deep-spec/11-eval.md) | 评估体系：用例库/判分器/回归趋势 |
| 12 | [12-monitor.md](deep-spec/12-monitor.md) | 监控告警：指标/追踪/告警规则/看板 |
| 13 | [13-iam.md](deep-spec/13-iam.md) | 权限体系：用户/角色/RBAC/审计 |
| 14 | [14-agent-lifecycle.md](deep-spec/14-agent-lifecycle.md) | Agent 生命周期：发布/版本/下线/回滚 |

### 体验与企业级（15-17）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 15 | [15-ux-detail.md](deep-spec/15-ux-detail.md) | 对话体验穷举：14 交互域 800+ 细节点 |
| 16 | [16-enterprise-org.md](deep-spec/16-enterprise-org.md) | 企业级组织能力：13 子域 ≈130 项（租户/账号/认证/合规/成本/开放平台/国际化） |
| 17 | [17-ai-lessons.md](deep-spec/17-ai-lessons.md) | AI 教训与坑：14 域 ≈144 项（现象+根因+避免+检测） |

### 平台扩展（18-21）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 18 | [18-ecosystem-connect.md](deep-spec/18-ecosystem-connect.md) | 可接入生态大全：9 类 ≈100 项（Dify/Coze/MCP/browser-use/模型服务/向量检索/渠道 IM/可观测/眼前一亮项目） |
| 19 | [19-ux-layout-design.md](deep-spec/19-ux-layout-design.md) | 布局与设计规范：7 域 ≈74 项（信息架构/导航/设计系统/响应式/10 个关键页面布局） |
| 20 | [20-foundation-capabilities.md](deep-spec/20-foundation-capabilities.md) | 底层基础能力：7 域 ≈66 项（SSE-WS 流式/结构化输出/关键词提取/混合检索/并发韧性/多模态） |
| 21 | [21-docs-support.md](deep-spec/21-docs-support.md) | 文档与辅助体系：7 域 ≈56 项（三段式错误码/前端报错指令/使用/开发者/运维文档/文档工程） |

### 治理与增长（22-26）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 22 | [22-data-governance.md](deep-spec/22-data-governance.md) | 数据治理与资产：目录/元数据/血缘/质量/分类分级/生命周期 |
| 23 | [23-cost-billing.md](deep-spec/23-cost-billing.md) | 成本计费与配额：看板下钻/价格表/预算/账单分摊/比价器 |
| 24 | [24-test-quality.md](deep-spec/24-test-quality.md) | 测试与质量：LLM 测试金字塔/判分器/混沌/攻击用例/CI 门禁 |
| 25 | [25-performance-engineering.md](deep-spec/25-performance-engineering.md) | 性能工程：TTFT/TPOT/吞吐/压测/前缀缓存/自动伸缩 |
| 26 | [26-user-growth.md](deep-spec/26-user-growth.md) | 用户研究与增长：埋点/留存/漏斗/A-B 实验/分群/Aha |

### 安全与架构前沿（27-31）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 27 | [27-ai-security.md](deep-spec/27-ai-security.md) | AI 安全攻防与红队：OWASP LLM Top10/五道纵深/注入双引擎/越狱库/护栏/演练台 |
| 28 | [28-multimodal.md](deep-spec/28-multimodal.md) | 多模态能力：资产库/OCR-ASR-抽帧/CLIP 联合嵌入/跨模态检索/生成工作台 |
| 29 | [29-interoperability.md](deep-spec/29-interoperability.md) | Agent 互操作：MCP+A2A 分层/A2A 四对象/信任分级/GB-Z 185-2026 |
| 30 | [30-data-pipeline.md](deep-spec/30-data-pipeline.md) | 数据管道：ETL-ELT/CDC/Kafka 批流一体/可视化 DAG/质量中心 |
| 31 | [31-disaster-recovery.md](deep-spec/31-disaster-recovery.md) | 容灾与业务连续性：RTO-RPO/3-2-1 备份/多活/DR 计划/切换演练/故障注入 |

### 触达与协同（32-36）

| # | 规格 | 一句话定位 |
|---|------|-----------|
| 32 | [32-rag-search.md](deep-spec/32-rag-search.md) | RAG 检索增强：查询改写/分块策略/索引三形态/多路召回+RRF 融合/cross-encoder 重排/引用溯源/检索评测/检索调试台/形态选型（Naive→Advanced→Modular/LongRAG/Self-RAG/GraphRAG） |
| 33 | [33-multi-end-sync.md](deep-spec/33-multi-end-sync.md) | 多端与端云协同：四层架构/状态同步而非广播/雪花 ID 游标/离线队列/断点续传/冲突三策略/跨端会话迁移/端·设备管理 |
| 34 | [34-real-time-collab.md](deep-spec/34-real-time-collab.md) | 实时协作：Presence/操作日志/Lamport 排序/冲突检测四策略/区域锁定/快照回滚/审查流/Agent 协作 op 流 |
| 35 | [35-offline-resilience.md](deep-spec/35-offline-resilience.md) | 弱网与离线韧性：重试退避/熔断/LLM 降级路由/缓存兜底/离线队列/断点续传/对账补偿/弱网模拟实验室 |
| 36 | [36-push-engagement.md](deep-spec/36-push-engagement.md) | 推送与触达：渠道矩阵/优先级分级/模板中心/免打扰/频率治理/深链回跳/回执归因/触达漏斗 |

---

## 阅读路线 / Reading Path

- **新人入门**：README → SKILL.md → docs/full-spec.md → deep-spec/01 → 04 → 05 → 06
- **做管理台**：admin-console-design.md → deep-spec 各模块「④ 管理界面」章 → 前端 admin/ 组件
- **做验收**：acceptance-test.md（430 条）→ 按模块抽测 → 修复缺口后重跑
- **做企业落地**：16 → 22 → 23 → 24 → 25 → 27 → 29 → 30 → 31
- **避坑**：17-ai-lessons.md（14 域 144 项红线清单）

## 同步规则 / Sync Rules

本仓库维护**三线同步**：`README（项目门面）` ↔ `docs/（文档体系）` ↔ `平台元数据（仓库描述/Topics）`。任何新规格落地必须同时更新：
1. 本索引 docs/README.md
2. 顶层文档 feature-checklist / acceptance-test / full-spec
3. 平台仓库描述与 Topics（gitcode / gitee / github 三平台）
