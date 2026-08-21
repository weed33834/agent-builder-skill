# 16. 企业级 / 组织级通用能力（Enterprise & Org Common Capabilities）

> **定位**：前 15 份规格覆盖"单个 Agent 平台的功能深度"；本份补齐**组织级横向能力**——一个平台从"单人玩具"升级为"企业级/高校级系统"所必需的通用功能。
> **覆盖范围**：不绑定任何业务领域（不写金融/医疗/教育业务细节），只列所有组织化场景（企业/高校/政务/科研机构）都会用到的通用能力。
> **对标基准**：Dify 企业版 / Coze / LangSmith / Azure AI Foundry / Copilot Studio / OneAPI / MuleSoft / Retool / 词元无限 等企业级平台 + 等保 2.0 / ISO 27001 / SOC2 / 个保法 通用要求。
> **用法**：与 feature-checklist 的 M14 板块对应，逐项 ✅/🔶/⬜ 对比。每项=是什么+怎么做+管理增删改调+前端页面+后端接口+状态。

## 子域总览（12 个子域，约 130 项）

| 子域 | 内容 | 功能项 | 与既有规格的关系 |
|------|------|--------|----------------|
| A | 组织与租户模型 | 9 | 新增大纲（多租户/部门树/空间隔离） |
| B | 用户与账号生命周期 | 11 | 新增（13-iam 讲权限，本域讲账号） |
| C | 身份认证接入 | 10 | 13-iam 已提 SSO/MFA 概念，本域展开配置项与流程 |
| D | 知识库与 RAG 资产 | 14 | 05-memory 含知识层，本域展开知识库资产全生命周期 |
| E | 审计与合规治理 | 11 | 13-iam 有审计事件，本域展开留存/报表/保留/导出 |
| F | 成本治理与配额 | 9 | 06-models 有成本统计，本域展开预算/分摊/超限策略 |
| G | 开放平台与生态集成 | 12 | M7 API 层有基础，本域展开开放生态/渠道/嵌入 |
| H | 发布审核与分发 | 9 | 14-lifecycle 管 Agent 状态，本域展开应用审核流/灰度/市场 |
| I | 团队协作与共享 | 10 | 15-ux N 域有协作点，本域展开资源池/评论/审批流/交接 |
| J | 数据分析与业务洞察 | 8 | 12-monitor 管技术指标，本域管业务指标/报表 |
| K | 系统运维与平台管理 | 13 | M9 有基础设施，本域展开平台管理面/备份/维护/升级 |
| L | 安全增强与私有化 | 9 | M11 有 OWASP，本域展开平台级安全机制/私有化 |
| M | 国际化与本地化 | 5 | 新增（通用细节） |
| **合计** | | **≈130** | |

---

## A. 组织与租户模型

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| A.1 | 组织（租户）创建 | 平台按组织隔离数据与资源 | org 表（id/name/domain/plan/status）+ 注册即建租户 | 组织列表/创建向导 | OrgAdminPage | POST /orgs | ⬜ |
| A.2 | 多租户隔离 | 数据/会话/配置按 tenant_id 全链路隔离 | 所有表带 tenant_id + 中间件自动注入 + 跨租户查询禁止 | 租户隔离状态查看 | TenantIsolationView | — | ⬜ |
| A.3 | 部门树 | 组织架构多级树（集团→公司→部门→组） | dept 表（parent_id 邻接表/物化路径）+ 拖拽调整 | 部门树管理（增删改/移动/成员） | DeptTreeAdmin | /depts CRUD + /depts/move | ⬜ |
| A.4 | 空间/项目隔离 | 部门或项目级资源空间（Agent/知识库/会话独立） | workspace 表（type=dept|project|personal）+ 资源归属 workspace_id | 空间列表/成员/配额 | WorkspacePanel(已有) | /workspaces CRUD | 🔶 前端有壳，后端⬜ |
| A.5 | 平台与组织两级管理员 | 平台管理员管全平台，组织管理员管本组织 | role=platform_admin|org_admin|member，作用域字段 | 管理员任命/交接 | AdminAssignDialog | /orgs/:id/admins | ⬜ |
| A.6 | 组织档案与品牌 | 组织名/logo/主题色/域名 | org 配置项 + 前端主题变量注入 | 组织设置页 | OrgSettingsPage | PUT /orgs/:id | ⬜ |
| A.7 | 邀请码/链接注册 | 组织成员通过邀请加入 | invite 表（token/org/expire/limit/role）+ 邮件/链接 | 邀请管理（生成/撤销/查看已用） | InviteManagePage | POST /invites + /invites/:t/redeem | ⬜ |
| A.8 | 域名白名单 | 限制登录邮箱域名（高校/企业专属） | allowed_domains 配置 + 登录校验拦截 | 域名白名单配置 | DomainAllowlistEdit | PUT /orgs/:id/domains | ⬜ |
| A.9 | 组织级审计视角 | 平台管理员可查看所有组织摘要，组织管理员看本组织 | 两级审计范围过滤（tenant_id + role 判定） | 组织摘要卡片 | OrgSummaryCards | GET /orgs/summary | ⬜ |

## B. 用户与账号生命周期

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| B.1 | 用户注册/登录 | 邮箱+密码 / 验证码 / 第三方 | auth 模块（已有）+ 注册流程（验证邮件/人机验证） | 登录注册页配置 | LoginPage(已有) | /auth/*(已有) | ✅ 基础已有 |
| B.2 | 邀请入职 | 管理员批量邀请，设置角色/部门/到期 | invite 批量 + 到期时间（临时账号） | 批量邀请表单（CSV 粘贴） | BulkInviteDialog | POST /invites/batch | ⬜ |
| B.3 | 批量导入用户 | CSV/Excel 批量建号（高校：学生名单导入） | 导入解析（姓名/邮箱/部门/角色/学工号）+ 失败行报告 | 导入向导（模板下载/预览/冲突策略） | UserImportWizard | POST /users/import + GET /users/import/template | ⬜ |
| B.4 | 用户资料管理 | 头像/昵称/时区/语言/签名 | users 表扩展字段 + 资料页 | 个人资料编辑 | ProfilePage | PUT /users/me | 🔶 部分 |
| B.5 | 账号启停 | 停用后禁止登录、会话失效 | status=active|disabled + 登录拦截 + token 失效 | 用户列表启停开关 | UserListPage 行操作 | PUT /users/:id/status | ⬜ |
| B.6 | 离职交接 | 离职账号资源一键转移给接任者 | transfer 任务：会话/Agent/知识库归属迁移 + 审计记录 | 交接向导（选接任者/范围预览） | HandoverWizard | POST /users/:id/handover | ⬜ |
| B.7 | 账号注销与数据删除 | 用户自助注销 + 级联删除/匿名化 | 注销流程（确认/验证/7 天冷静期/删除任务） | 注销入口与状态 | AccountDeletionPage | POST /users/me/delete | ⬜ |
| B.8 | 用户列表与搜索 | 按姓名/部门/角色/状态筛选 | 列表 + 多条件查询 + 分页 | 用户管理页 | UserAdminPage | GET /users?dept=&role=&status= | ⬜ |
| B.9 | 角色分配 | 给用户分配角色（管理员/普通/受限） | role 字段 + 角色变更审计 | 用户行内改角色 | RoleSelectInline | PUT /users/:id/role | ⬜ |
| B.10 | 登录设备管理 | 查看已登录设备/强制下线 | session 表（device/ip/ua/last_active）+ 吊销 | 我的设备页 | DeviceManagePage | GET /users/me/sessions + DELETE /sessions/:id | ⬜ |
| B.11 | 访客/试用账号 | 限时访客（高校演示/企业试用），功能受限 | guest 类型 + 到期自动停用 + 数据隔离 | 访客账号创建 | GuestAccountDialog | POST /users/guest | ⬜ |

## C. 身份认证接入（与 13-iam 授权互补）

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| C.1 | SSO / SAML 2.0 | 企业 IdP 单点登录（Okta/AAD/飞书/钉钉） | saml_idp 配置（metadata/证书/映射）+ 断言校验 | SSO 配置页（上传 metadata/属性映射/测试） | SSOConfigPage | PUT /auth/saml + POST /auth/saml/test | ⬜ |
| C.2 | OIDC / OAuth2 接入 | 支持 Google/GitHub/企业微信等 OIDC | oidc_provider 表（issuer/client/secret/scopes）+ 回调 | OIDC 配置页（多 provider 列表） | OIDCConfigPage | PUT /auth/oidc | ⬜ |
| C.3 | MFA 双因子 | TOTP / 短信 / 企业微信扫码 | mfa 表 + 强制策略（按角色）+ 验证中间件 | MFA 策略配置 + 用户自助绑定 | MFASetupPage | POST /auth/mfa/enroll + /verify | ⬜ |
| C.4 | 密码策略 | 复杂度/最短长度/有效期/防重用 | 全局策略配置 + 修改时校验 | 密码策略设置 | PasswordPolicyEdit | PUT /settings/password-policy | ⬜ |
| C.5 | 会话空闲超时 | 无操作自动登出（可配置时长） | token 滑动过期 + 前端空闲检测 | 超时策略配置 | SessionPolicyEdit | PUT /settings/session | ⬜ |
| C.6 | 登录风控 | 异常登录检测（异地/IP 变化/暴力破解锁定） | 登录日志分析 + 锁定策略（次数/时长/验证码） | 风控规则配置 + 锁定记录 | LoginRiskPage | GET /auth/risk-events | ⬜ |
| C.7 | 账号找回 | 忘记密码自助重置（邮件/管理员重置） | 重置 token + 过期 + 审计 | 找回流程页面 | ForgotPasswordPage | POST /auth/forgot + /reset | ⬜ |
| C.8 | 登录审计 | 记录每次登录（时间/IP/设备/结果） | login_log 表 + 查询界面 | 登录日志页（筛选/导出） | LoginLogPage | GET /auth/logs | ⬜ |
| C.9 | 认证提供商优先级 | 本地 vs SSO 顺序/互斥/降级（IdP 挂了切本地） | provider 策略 + 健康探测 + 降级开关 | 认证策略配置 | AuthStrategyEdit | PUT /settings/auth | ⬜ |
| C.10 | API 令牌鉴权 | 服务账号用 API key 调接口（到期/作用域/IP 绑定） | api_key 表（hash 存储/scope/expire） | 令牌管理页 | ApiKeyPage | /api-keys CRUD | 🔶 13-iam 有概念，独立页⬜ |

## D. 知识库与 RAG 资产（知识资产全生命周期）

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| D.1 | 知识库 CRUD | 多知识库（名称/描述/可见范围/embedding 模型） | kb 表 + 创建向导（选解析/分块/向量配置） | 知识库列表/创建/设置 | KnowledgeBasePage | /kb CRUD | ⬜ |
| D.2 | 文档入库 | 多格式上传：PDF/Word/PPT/Excel/HTML/MD/TXT/扫描件 | 解析器管线（文本抽取→OCR→清洗） | 拖拽上传 + 进度 + 批量 | DocUploadArea | POST /kb/:id/documents | ⬜ |
| D.3 | 解析与分块 | chunk 策略（大小/重叠/分隔符/父子块/表格保留） | 解析配置 + 分块预览 + 手动调整 | 分块策略配置 + 分块预览面板 | ChunkConfigPanel | GET /kb/:id/documents/:did/chunks | ⬜ |
| D.4 | 向量化与索引 | embedding 模型选择/批量向量化/重索引/增量 | 索引任务队列 + 状态（pending/embedding/indexed/failed） | 索引任务列表（重试/重建） | IndexJobPage | POST /kb/:id/reindex + GET /kb/:id/jobs | ⬜ |
| D.5 | 检索配置 | topK/相似度阈值/混合检索/重排序/召回增强 | retriever 配置（BM25+向量混合、rerank 模型） | 检索配置面板 + 试检索台 | RetrieverConfig + RetrieverTest | PUT /kb/:id/retriever + POST /kb/:id/test | ⬜ |
| D.6 | 引用溯源 | 答案标注来源文档/段落/高亮定位/原文预览 | 检索返回 chunk 元数据 → 前端引用角标 + 定位 | 引用交互（点击跳原文/展开上下文） | CitationBubble(15-ux A 域已有) | GET /kb/:id/chunks/:cid/source | 🔶 前端引用已有，溯源链路⬜ |
| D.7 | 知识库权限 | 库级可见性（公开/私有/按部门/按角色）+ 文档级权限 | kb_acl 表 + 检索时过滤 | 权限配置页（成员/部门/角色） | KbAclPanel | PUT /kb/:id/acl | ⬜ |
| D.8 | 知识质量评估 | 命中率/无效文档识别/低相关 chunk 告警 | 检索日志分析（query→hit 评分）+ 无效文档标记 | 质量看板（库级指标/文档级列表） | KbQualityDashboard | GET /kb/:id/quality | ⬜ |
| D.9 | 人工修正 | 修改/删除错误 chunk、添加人工答案 | chunk 编辑 + "人工覆盖答案" 机制 | chunk 编辑器 + 覆盖管理 | ChunkEditor + OverridePanel | PUT /kb/:id/chunks/:cid | ⬜ |
| D.10 | 知识更新 | 定时同步（文件源/数据库/网页）+ 增量 + 版本 | 同步任务（cron/间隔）+ 变更 diff | 同步任务配置 + 变更记录 | SyncTaskConfig + ChangeLogView | POST /kb/:id/sync-jobs | ⬜ |
| D.11 | 术语表与同义词 | 领域术语统一（翻译/检索改写） | glossary 表 + 检索时 query 扩展 | 术语表管理（导入/导出） | GlossaryPage | /glossary CRUD | ⬜ |
| D.12 | 知识库测试台 | 直接试检索/试问答，调参对比 | 检索测试 + A/B 参数对比 | 测试台（query 输入/参数/结果对比） | KbTestBench | POST /kb/:id/bench | ⬜ |
| D.13 | 多知识库聚合问答 | 一次提问跨多库检索（带库来源标注） | 多库检索 + 结果合并 + 库名标注 | 关联库配置 | KbLinkingPanel | PUT /kb/:id/links | ⬜ |
| D.14 | 知识库统计 | 文档数/chunk 数/占用空间/近 30 天命中 | 聚合统计 + 趋势图 | 库首页统计卡片 | KbStatsCards | GET /kb/:id/stats | ⬜ |

## E. 审计与合规治理

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| E.1 | 全量审计日志 | who/what/when/from_ip/before/after/result 全记录 | audit_log 表 + 业务点埋点（13-iam 已有基础） | 审计日志查询页（多条件/时间范围） | AuditLogPage | GET /audit-logs | 🔶 事件已有，查询页⬜ |
| E.2 | 审计日志导出 | CSV/JSON 导出 + 大数量分批 | 异步导出任务 + 下载链接 | 导出按钮 + 任务中心 | ExportButton + TaskCenter | POST /audit-logs/export | ⬜ |
| E.3 | 审计不可篡改 | 日志哈希链/只追加/管理员不可删 | 每日哈希链 + 存储权限收紧 | 完整性校验显示 | IntegrityStatusView | GET /audit-logs/integrity | ⬜ |
| E.4 | 数据保留策略 | 各数据类保留期（日志/会话/附件/临时文件） | retention 策略表 + 定时清理任务 + 到期删除 | 保留策略配置页 | RetentionPolicyEdit | PUT /settings/retention | ⬜ |
| E.5 | 用户数据导出权 | 用户一键导出个人数据（会话/资料/附件） | 导出任务（打包 ZIP）+ 7 天内下载 | 数据导出页 | DataExportPage | POST /users/me/export | ⬜ |
| E.6 | 敏感数据检测脱敏 | PII/密钥/证件号识别，输入输出双向脱敏 | 脱敏引擎（正则+模型）+ 字段级配置 | 脱敏规则配置 + 命中统计 | MaskingConfigPage | PUT /settings/masking | ⬜ |
| E.7 | 内容审核熔断 | 敏感词/违规输出 5 秒内熔断 + 审计报告（Dify 企业版） | 审核服务（词库+模型审核）+ 熔断开关 | 审核规则配置 + 熔断记录 | ContentGuardPage | PUT /settings/content-guard | ⬜ |
| E.8 | DLP 数据防泄漏 | 外发检测（复制/下载/分享越权）+ 水印 | 外发策略 + 水印注入（用户名/IP）+ 拦截 | DLP 策略配置 | DlpPolicyEdit | PUT /settings/dlp | ⬜ |
| E.9 | 合规报表 | 等保 2.0/ISO27001/SOC2/个保法 报表模板 | 报表生成任务（审计数据聚合）+ 导出 PDF | 报表中心（模板/周期/导出） | ComplianceReportPage | POST /reports/compliance | ⬜ |
| E.10 | 模型决策留痕 | 推理过程/工具调用/引用来源可追溯 | trace 关联（12-monitor 已有）+ 导出单条决策链 | 单条会话"决策链"视图 | TraceChainView | GET /traces/:id | 🔶 monitor 有 trace，业务视图⬜ |
| E.11 | 隐私政策与同意 | 注册同意/政策版本管理/同意记录 | consent 表 + 政策版本发布 | 政策管理页 + 同意弹窗 | PolicyAdminPage + ConsentModal | /policies CRUD | ⬜ |

## F. 成本治理与配额

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| F.1 | 预算设置 | 按组织/部门/项目/应用设月度预算 | budget 表（scope/amount/period）+ 超额阈值 | 预算配置页（多级） | BudgetConfigPage | /budgets CRUD | ⬜ |
| F.2 | 用量配额 | token/调用次数/并发/存储/附件 配额 | quota 表 + 用量计数中间件 | 配额配置（按角色/用户/应用） | QuotaConfigPage | PUT /settings/quotas | 🔶 06-models 有限流，配额体系⬜ |
| F.3 | 超限策略 | 超限动作：告警→限速→降级→熔断→停用 | 阶梯策略 + 自动执行 + 通知 | 超限策略配置 | OverlimitPolicyEdit | PUT /settings/overlimit | ⬜ |
| F.4 | 成本分摊报表 | 按部门/项目/用户/模型维度分摊 | 用量聚合（trace 计价）+ 多维报表 | 成本报表页（维度切换/导出） | CostReportPage | GET /reports/cost?dim= | ⬜ |
| F.5 | 成本优化建议 | 模型降级建议/缓存命中/无效调用识别 | 分析引擎（模型成本对比/重复调用检测） | 优化建议列表（一键应用） | CostOptSuggestions | GET /reports/cost/optimizations | ⬜ |
| F.6 | 内部结算 | 部门间成本结算（按项目分摊到团队） | 分摊规则 + 结算周期 | 结算规则配置 | SettleRuleEdit | PUT /settings/settlement | ⬜ |
| F.7 | 对外计费 | 开放平台按调用量/并发订阅计费 | 订阅套餐表 + 计费任务 + 账单 | 套餐管理 + 账单中心 | PlanManagePage + BillingPage | /plans CRUD + /bills | ⬜ |
| F.8 | 免费/试用额度 | 新用户/访客额度 + 到期提醒 | 额度账户 + 消耗扣减 + 提醒 | 额度规则配置 | AllowanceConfig | PUT /settings/allowance | ⬜ |
| F.9 | 成本实时看板 | 今日/本月消耗、环比、Top 消耗应用 | 实时聚合（指标缓存）+ 图表 | 成本总览看板 | CostDashboard | GET /reports/cost/overview | ⬜ |

## G. 开放平台与生态集成

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| G.1 | 开放 API 网关 | 统一入口 + 鉴权 + 限流 + 签名校验 | API 网关（已有 M7 基础）+ 开放文档 | 开发者中心页 | DevCenterPage | /openapi/* | 🔶 M7 有 API，开放面⬜ |
| G.2 | API Key 管理 | 创建/吊销/到期/作用域/IP 绑定/用量 | api_key 表（hash + scope + limits） | 密钥管理页 | OpenApiKeyPage | /openapi/keys CRUD | 🔶 C.10 服务端令牌，对外密钥⬜ |
| G.3 | Webhook 事件订阅 | 会话完成/审批/告警/用量超限等事件推送 | event 总线（已有 10-skill-plugin 事件总线）+ 订阅表 + 重试 | Webhook 订阅管理（事件/URL/密钥/测试） | WebhookPage | /webhooks CRUD + POST /webhooks/test | ⬜ |
| G.4 | 官方 SDK | Python/TypeScript/Java/Go | SDK 仓库 + 自动生成（OpenAPI） | SDK 下载页（版本/示例） | SdkDownloadPage | — | ⬜ |
| G.5 | CLI 工具 | 命令行管理 Agent/会话/知识库 | CLI 包（认证/子命令/输出格式） | 文档页 | CliDocPage | — | ⬜ |
| G.6 | 企业 IM 渠道 | 企微/钉钉/飞书/Slack/Teams 机器人 + 消息卡片 | 渠道适配器（接收消息→触发 Agent→回卡片） | 渠道接入向导（扫码/配置/测试） | ImChannelWizard | /channels/im CRUD + /channels/im/test | ⬜ |
| G.7 | 消息通知网关 | 邮件/短信/IM 统一通知渠道 | notify 网关（渠道注册 + 模板 + 重试） | 通知渠道配置 + 模板管理 | NotifyChannelPage | /notify/channels + /notify/templates | ⬜ |
| G.8 | 外部系统连接器 | 数据库/CRM/ERP/工单系统只读连接 | 连接器注册（凭据加密存储/健康检查） | 连接器管理页 | ConnectorPage | /connectors CRUD | 🔶 04-tools 有工具注册，系统连接器⬜ |
| G.9 | 嵌入模式 | iframe 嵌入 / JS SDK / 对话浮窗 | 嵌入代码生成 + 白名单域名 + 免登 token | 嵌入配置页（复制代码/域名管理） | EmbedPage | GET /embed/config | ⬜ |
| G.10 | OpenAPI 文档 | Swagger/OpenAPI 自动生成 + 在线调试 | 文档生成器 + try-it 面板 | 文档站 | ApiDocPage | GET /openapi.json | ⬜ |
| G.11 | 事件订阅日志 | 推送记录/失败重试/重放 | webhook_delivery 表 + 重试队列 | 推送日志页（重试/重放） | WebhookLogPage | GET /webhooks/:id/deliveries | ⬜ |
| G.12 | 第三方登录渠道 | 微信/Google/GitHub 快捷登录（个人场景） | oauth provider 注册 + 绑定/解绑 | 绑定管理（账号安全页） | OAuthBindPanel | /auth/oauth/link | ⬜ |

## H. 发布审核与分发

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| H.1 | 发布审核流 | Agent 草稿→提交审核→审批→发布 | 发布单（版本快照 + 变更说明 + 审核人） | 发布管理页（提交/审核/驳回） | ReleaseManagePage | /releases CRUD + /releases/:id/review | ⬜ |
| H.2 | 灰度发布 | 按比例/按用户组/按部门灰度 | 灰度规则 + 分流中间件 + 回滚开关 | 灰度配置面板（比例滑块/分组） | CanaryConfigPanel | PUT /releases/:id/canary | ⬜ |
| H.3 | 版本回滚 | 一键回退到历史版本 | 版本表（14-lifecycle 已有不可变版本）+ 回滚任务 | 回滚操作（确认/审计） | RollbackButton | POST /releases/:id/rollback | 🔶 14 有版本，回滚流程⬜ |
| H.4 | 应用市场 | 内部应用/模板市场（发布/搜索/安装/评分） | market 表（上架审核/分类/评分） | 市场页（卡片/搜索/分类/安装） | AppMarketPage | /market CRUD + /market/install | ⬜ |
| H.5 | 渠道分发 | 分享链接/二维码/嵌入/IM 机器人发布 | 分发渠道注册 + 链接生成 + 访问统计 | 分发管理页（渠道/二维码/统计） | DistributePage | POST /apps/:id/distribute | ⬜ |
| H.6 | 使用统计（应用级） | 安装数/活跃/留存/会话量/满意度 | 应用事件埋点聚合 | 应用详情统计页 | AppStatsPage | GET /apps/:id/stats | ⬜ |
| H.7 | 下架管理 | 停用通知/宽限期/数据保留 | 下架流程（通知→宽限→停用） | 下架操作面板 | DelistDialog | POST /apps/:id/delist | ⬜ |
| H.8 | 审核任务分派 | 按角色/队列分派审核任务 + 超时提醒 | 审核任务表 + 分派规则 + 提醒 cron | 审核工作台（待审列表） | ReviewWorkbench | GET /reviews/queue | ⬜ |
| H.9 | 发布日历与计划 | 定时发布/排期（避开维护窗口） | 发布计划表 + 定时执行 | 发布计划页（日历视图） | ReleaseCalendar | POST /releases/scheduled | ⬜ |

## I. 团队协作与共享

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| I.1 | 团队资源池 | Agent/知识库/提示词/技能按团队共享 | 资源 team 归属 + 继承权限（13-iam own/team/all） | 团队空间页 | TeamWorkspacePage | /teams CRUD + /teams/:id/resources | 🔶 13-iam 有模型，页面⬜ |
| I.2 | 资源分享 | 单个资源分享给成员/链接分享（过期/密码） | share 表（scope/expire/password/权限） | 分享对话框 | ShareDialog | POST /resources/:type/:id/share | ⬜ |
| I.3 | 评论与批注 | 在会话/Agent 配置/文档上评论、@人 | comment 表 + @ 通知 | 评论侧栏/行内批注 | CommentPanel | /comments CRUD | ⬜ |
| I.4 | 协作编辑 | 多人同时编辑 Agent 配置（冲突解决/锁定） | 乐观锁 + 版本冲突提示 + 强制覆盖 | 编辑冲突提示 | ConflictDialog | PUT 带 version 校验 | ⬜ |
| I.5 | 审批流引擎 | 发布/权限申请/敏感操作审批（自定义流程） | 审批流定义（节点/审批人/超时）+ 实例执行 | 审批流配置器（可视化） | ApprovalFlowBuilder | /approval-flows CRUD + /approval-instances | 🔶 13-iam 四眼审批，通用流引擎⬜ |
| I.6 | 团队动态 | 成员最近操作/贡献/动态流 | 活动事件流（按团队过滤） | 团队动态页 | TeamActivityFeed | GET /teams/:id/activities | ⬜ |
| I.7 | 收藏与分组 | 个人收藏资源 + 自定义分组 | favorite 表 + 分组表 | 收藏夹侧栏 | FavoriteSidebar | /favorites CRUD | ⬜ |
| I.8 | 协作会话 | 多人加入同一会话（角色区分：主持/参与/围观） | 会话成员表 + 消息广播（15-ux N 多人协作） | 会话成员面板 | SessionMemberPanel | POST /sessions/:id/members | 🔶 15 有概念，实现⬜ |
| I.9 | 权限申请 | 用户申请资源访问权 → 管理员审批 | 申请单（资源/理由/期限）+ 审批流 | 申请中心 | AccessRequestPage | POST /access-requests | ⬜ |
| I.10 | 交接与继承 | 资源所有者变更/继承（离职/调岗） | 继承规则 + 批量转移（B.6 用户级） | 资源继承设置 | InheritConfigPanel | PUT /teams/:id/inherit | ⬜ |

## J. 数据分析与业务洞察

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| J.1 | 平台总览 | DAU/MAU/会话数/消息数/活跃 Agent 数 | 事件埋点聚合（天级/小时级） | 总览大屏 | OverviewDashboard | GET /analytics/overview | ⬜ |
| J.2 | 功能使用排行 | 各模块/工具/技能使用排行 | 事件明细聚合 | 排行页（周期切换） | UsageRankingPage | GET /analytics/ranking | ⬜ |
| J.3 | 用户行为分析 | 活跃度/留存/流失/转化漏斗 | 行为事件（登录/会话/创建资源/分享） | 行为分析页 | BehaviorPage | GET /analytics/behavior | ⬜ |
| J.4 | 质量指标 | 回答采纳率/赞踩率/重发率/转人工率 | 反馈事件聚合（15-ux I 反馈域） | 质量看板 | QualityDashboard | GET /analytics/quality | ⬜ |
| J.5 | 报表订阅 | 定时邮件/IM 推送报表 | 报表任务（cron + 渠道 + 模板） | 订阅管理页 | ReportSubPage | /reports/subscriptions CRUD | ⬜ |
| J.6 | 报表导出 | 原始数据/汇总 CSV、图表导出 | 导出任务（E.2 复用） | 导出按钮 | ExportButton | POST /analytics/export | ⬜ |
| J.7 | 自助分析查询 | 管理员的灵活查询（维度/指标/过滤） | 查询 DSL + 聚合引擎 | 分析工作台 | AnalyticsWorkbench | POST /analytics/query | ⬜ |
| J.8 | 异常洞察 | 用量突增/突降/质量滑坡自动发现 | 基线检测（环比/周同比）+ 告警 | 异常事件列表 | AnomalyListPage | GET /analytics/anomalies | ⬜ |

## K. 系统运维与平台管理

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| K.1 | 系统设置 | 平台名/logo/时区/默认语言/公告栏 | settings 表（键值）+ 前端注入 | 系统设置页 | SystemSettingsPage | GET/PUT /settings | ⬜ |
| K.2 | 维护模式 | 全局维护（公告/只读/全停）+ 恢复 | 维护开关 + 前端拦截 + 状态页 | 维护开关面板 | MaintenancePanel | PUT /settings/maintenance | ⬜ |
| K.3 | 公告系统 | 平台公告（登录弹窗/顶部条/重要级别） | announcement 表 + 已读记录 | 公告管理（发布/下线/置顶） | AnnouncementPage | /announcements CRUD | ⬜ |
| K.4 | 备份与恢复 | 自动备份（DB+文件）/保留策略/一键恢复/演练 | 备份任务（cron + 存储 + 校验）+ 恢复流程 | 备份管理页（列表/策略/恢复） | BackupPage | /backups CRUD + POST /backups/:id/restore | ⬜ |
| K.5 | 数据迁移 | 导入导出（组织/用户/知识库/Agent）/跨环境 | 迁移包（schema 版本 + 数据）+ 校验 | 迁移向导 | MigrationWizard | /migrations CRUD | ⬜ |
| K.6 | 服务状态页 | 各服务健康度（模型网关/向量库/队列/渠道） | 健康探活聚合（12-monitor 已有）+ 状态页 | 状态页（公开/内嵌） | StatusPage | GET /status | 🔶 monitor 有探活，状态页⬜ |
| K.7 | 版本与变更日志 | 版本号/changelog/升级提醒 | version 表 + 更新检测 + 变更日志 | 关于页/更新日志 | ChangelogPage | GET /versions | ⬜ |
| K.8 | 资源限制 | 存储配额/上传大小/并发数/文件类型 | 全局+组织级限制 + 超限拦截 | 限制配置页 | LimitConfigPage | PUT /settings/limits | ⬜ |
| K.9 | 任务中心 | 异步任务统一视图（导入/导出/重索引/备份） | 任务表（类型/状态/进度/失败重试） | 任务中心页 | TaskCenterPage | GET /tasks + POST /tasks/:id/retry | ⬜ |
| K.10 | 操作日志（管理员） | 管理员操作全记录 + 查询 | audit_log 管理视角（E.1 复用） | 管理操作日志页 | AdminLogPage | GET /audit-logs?scope=admin | 🔶 事件有，页面⬜ |
| K.11 | 多环境管理 | 开发/测试/生产环境切换与同步 | 环境表 + 发布通道（14-lifecycle 三环境） | 环境管理页 | EnvManagePage | /environments CRUD | 🔶 14 有概念，管理页⬜ |
| K.12 | 水平扩展支持 | 多实例部署/会话亲和/分布式锁/队列 | 无状态化 + Redis 共享 + 队列（12-monitor） | 部署文档页 | DeployDocPage | — | ⬜ |
| K.13 | 帮助与工单 | 帮助中心/FAQ/工单提交与跟踪 | help 文档 + 工单表（分类/优先级/状态） | 帮助中心 + 工单页 | HelpCenterPage + TicketPage | /tickets CRUD | ⬜ |

## L. 安全增强与私有化

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| L.1 | 传输与存储加密 | TLS 全链路 + 数据库/对象存储静态加密 | TLS 配置 + 存储加密 + 密钥轮换策略 | 安全配置页 | SecurityConfigPage | PUT /settings/security | ⬜ |
| L.2 | 密钥管理 | 模型密钥/渠道凭据加密存储 + KMS 集成 | 加密存储（AES-GCM/KMS）+ 明文仅一次性展示 | 凭据管理页（掩码/轮换） | CredentialPage | /credentials CRUD | 🔶 13-iam 有密钥概念，管理页⬜ |
| L.3 | 私有化部署 | 离线安装包/内网部署/无外网依赖 | 部署包（镜像 + 离线依赖）+ 安装向导 | 部署文档 | DeployGuidePage | — | ⬜ |
| L.4 | 数据驻留 | 数据区域选择（合规要求） | 区域配置 + 存储路由 | 区域设置页 | RegionConfigPage | PUT /settings/region | ⬜ |
| L.5 | 供应链安全 | 依赖扫描/镜像签名/模型文件校验 | SBOM + 扫描任务 + 校验和 | 安全合规面板 | SupplyChainPanel | GET /security/sbom | ⬜ |
| L.6 | 防滥用机制 | IP 黑名单/频率限制/行为风控 | 限流（已有 06）+ 黑名单表 + 风控规则 | 风控配置页 | AbuseControlPage | PUT /settings/abuse | ⬜ |
| L.7 | 安全评分 | 平台安全基线自检（弱配置扫描） | 检查项清单 + 自动扫描 + 评分 | 安全评分页 | SecurityScorePage | GET /security/score | ⬜ |
| L.8 | 应急响应 | 一键冻结（停 Agent/吊销令牌/封锁账号） | 应急开关 + 级联动作 + 审计 | 应急操作面板（双确认） | EmergencyPanel | POST /security/emergency | ⬜ |
| L.9 | 水印与防截屏 | 页面水印（用户名/IP 动态水印） | 前端水印注入 + 会话绑定 | 水印策略配置 | WatermarkConfig | PUT /settings/watermark | ⬜ |

## M. 国际化与本地化

| # | 功能项 | 说明 | 怎么做 | 管理界面 | 前端 | 后端 | 状态 |
|---|--------|------|--------|---------|------|------|------|
| M.1 | UI 多语言 | 界面 i18n（中/英/日/西…）+ 语言切换 | i18n 资源 + 语言包管理 | 语言包管理页 | I18nAdminPage | /i18n CRUD | ⬜ |
| M.2 | 时区与日期格式 | 用户级时区/日期/时间格式 | 用户偏好（B.4）+ 格式化工具 | 偏好设置项 | PrefDateTime | PUT /users/me/prefs | ⬜ |
| M.3 | 数字与货币格式 | 千分位/货币/单位本地化 | 格式化库（Intl） | 偏好设置项 | PrefFormat | PUT /users/me/prefs | ⬜ |
| M.4 | 多语言内容审核 | 各语言敏感词库/审核模型 | 审核规则按语言路由 | 审核规则（多语言） | ContentGuardPage(扩展) | PUT /settings/content-guard/lang | ⬜ |
| M.5 | 区域合规差异 | 数据驻留/保留期按地区模板 | 合规模板（欧盟/中国/美国）+ 一键应用 | 合规模板库 | ComplianceTemplatePage | GET /compliance/templates | ⬜ |

---

## 状态与缺口速览

- 全新实现（⬜）：约 100 项，绝大多数需要"新后端接口 + 新前端页面"，建议按子域分批落地：先 A/B/C（组织身份）→ D（知识库）→ E/F（治理）→ G/H（开放）→ I/K（协作运维）→ J/M（分析本地化）→ L（安全）。
- 可复用既有资产（🔶）：workspace 面板（A.4）、API 服务层（G.1）、13-iam 权限模型（C.10/I.1）、monitor trace（E.10/K.6）、14-lifecycle 版本（H.3）、事件总线（G.3/I.5）。
- 验证方法：每子域抽 2-3 条进 acceptance-test（见第 16 部分），重点验证"管理界面操作 → 后端接口真实生效 → 运行时链路可见"闭环。

> 对接关系：本份 ↔ feature-checklist M14 板块 ↔ full-spec 新增引用 ↔ acceptance-test 第 16 部分（16 企业级通用，约 30 条）。
