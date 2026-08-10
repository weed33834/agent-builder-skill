# 深度规格 14：Agent 生命周期（Agent Lifecycle）

> 模板：docs/deep-spec/00-template.md
> 定位：Agent 不是写死的一份 YAML，它是一个**有状态的生命体**：创建→配置→测试→发布→运行→升级→下线。生命周期管理管住每个阶段该做什么、谁能做、状态怎么流转、资产怎么沉淀。

## 1. 定位与总体架构

**业务价值**：一个 agent 从草稿到生产要经过"开发-测试-发布-运维"全流程；多 agent 场景还需要克隆、版本、回滚、复用。生命周期管住：**状态机**（每个阶段清晰）、**环境隔离**（草稿不碰线上）、**版本**（改可追溯）、**复制**（新 agent 站在肩膀上）、**下线**（优雅退役）。

**生命周期状态机**：

```
draft（草稿）──→ testing（测试中）──→ published（已发布）──→ archived（已归档）
    │                 │                    │  ▲
    │                 │                    ▼  │
    └──→ deprecated（废弃）←─── disabled（停用）┘
                    （不可再发布，保留数据）
```

| 状态 | 含义 | 谁能进入 | 能做什么 |
|------|------|----------|----------|
| draft | 草稿：配置中，不可被对话使用 | 创建者/开发者 | 编辑全部配置、模拟测试 |
| testing | 测试中：可被测试会话引用 | 创建者 | 编辑+真实对话测试（隔离环境） |
| published | 已发布：可被线上路由/用户使用 | 管理员发布 | 配置锁定（改需走新版） |
| disabled | 停用：暂停服务，数据保留 | 管理员 | 不可路由，可重新启用 |
| deprecated | 废弃：不可再启用 | 管理员 | 只读查看 |
| archived | 归档：数据迁移到冷存储 | 管理员 | 只读+导出 |

**环境隔离（三环境）**：

```
dev（草稿区）：个人可见，自由改
test（测试区）：团队可见，跑评测（11）
prod（生产区）：线上流量，只能发布后的版本
```

**版本策略（资产化 + 不可变发布）**：

```
每次"编辑并保存" = 新版本（version+1，含全量配置快照）
  ├─ 草稿版本：随便改
  ├─ 发布 = 把指定草稿版本冻结为生产版本（不可变）
  ├─ 线上运行 = 生产版本（不被编辑影响）
  ├─ 回滚 = 切到上一个生产版本（秒级）
  └─ 对比 = 任意两版本 diff
```

## 2. 资产模型（Agent 数据模型）

### 2.1 Agent 定义（DB：`agents`）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id / name | — | ✅ | — | agent 名（唯一） |
| display_name / description | — | ✅ | — | 展示名/用途描述 |
| avatar | string | 否 | — | 头像 |
| status | enum | ✅ | draft | 生命周期状态（见上） |
| version | int | ✅ | 1 | 当前生产版本号 |
| environment | enum | ✅ | dev | 当前环境 |
| created_by / owner | — | ✅ | — | 创建者/归属（scope 授权依据） |
| template_ref | string | 否 | — | 来自哪个模板/克隆源 |
| config_snapshot | json | ✅ | {} | 当前版本全量配置快照 |
| config_history | json | ✅ | [] | 版本历史 [{version, snapshot, created_at, by, note}] |
| stats | json | 否 | {} | 运行统计（调用量/成本/评分） |
| tags / category | — | 否 | — | 分类标签 |
| published_at / last_modified | — | — | — | 时间 |

**config_snapshot 内容（Agent 全量配置 = 各模块装配）**：

```yaml
agent:
  name: customer-support
  base:
    description: 客服智能体
    model: {alias: main-chat, fallback: [fallback-fast], params: {temperature: 0.3}}
  prompt: {system_prompt_ref: prompt:cs-main-v3, few_shot_refs: [...]}
  context: {max_tokens: 8000, memory: true, rag: {kbs: [product-docs]}}
  tools: {allowed: [order-query, refund-check], deny: []}
  memory: {extract: true, min_importance: 5}
  orchestration: {role: worker, supervisor: null}
  voice: {enabled: false}
  skills: {allow: [refund-policy]}
  iam: {permissions: {...}, require_approval: [...]}
  budgets: {daily_cost: 50, daily_calls: 500}
```

### 2.2 模板（DB：`agent_templates`，M0.1-M0.20 的资产化）

| 字段 | 说明 |
|------|------|
| id / name | 模板名（客服/翻译/写作/研究/数据分析/安全审计…） |
| category | 分类（20+ 预置模板） |
| base_config | 模板配置骨架（prompt 占位/工具建议/模型建议） |
| usage_count / rating | 使用次数/评分 |
| is_system | 系统内置/用户自定义 |
| created_by | 审计 |

### 2.3 Agent 实例（运行态）

| 字段 | 说明 |
|------|------|
| agent_id + version | 当前生效版本 |
| sessions | 活跃会话数 |
| status_health | 运行健康（错误率/延迟，联动 12） |
| runtime_info | 当前绑定适配器（06 框架）/检查点状态 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| LIFECYCLE_ENABLED | bool | true | 生命周期总开关 | true/false | 热加载 |
| LIFECYCLE_PUBLISH_REQUIRE_EVAL | bool | true | 发布前必须过评测（11 联动） | true/false | 热加载 |
| LIFECYCLE_PUBLISH_REQUIRE_APPROVAL | bool | false | 发布需审批（13 联动） | true/false | 热加载 |
| LIFECYCLE_MAX_VERSIONS | int | 50 | 保留版本数（超限压缩旧版） | 10-500 | 热加载 |
| LIFECYCLE_VERSION_RETENTION_DAYS | int | 365 | 版本保留 | 30-3650 | 热加载 |
| LIFECYCLE_AUTO_ARCHIVE_DAYS | int | 180 | 停用 N 天后自动归档 | 30-3650 | 热加载 |
| LIFECYCLE_DRAFT_AUTO_EXPIRE_DAYS | int | 90 | 草稿长期未动自动清理提示 | 30-730 | 热加载 |
| LIFECYCLE_MAX_AGENTS_PER_USER | int | 50 | 每用户 agent 数上限 | 5-1000 | 热加载 |
| LIFECYCLE_CLONE_MAX | int | 5 | 单 agent 克隆数上限 | 1-100 | 热加载 |

### 3.2 按 agent 配置——即 config_snapshot（2.1），全部可界面编辑。

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 Agent 工作台（AgentStudio）——核心

| 能力 | 说明 | 接口 |
|------|------|------|
| 我的 agent 列表 | 卡片墙：头像/名称/状态灯/版本/今日调用 | GET /admin/agents |
| 创建 agent | 空创建 / 从模板创建（20+ 模板向导）/ 克隆已有 | POST /admin/agents |
| 向导流程 | ①选模板→②填描述→③配模型→④选工具→⑤配记忆/技能→⑥测试→⑦发布 | 分步 API |
| 配置编辑器 | 全量配置表单（2.1 全部字段）+ YAML 高级编辑模式 | GET/PUT /admin/agents/{id}/config |
| 模拟测试 | 草稿阶段直接对话测试（dev 环境） | POST /admin/agents/{id}/simulate |
| 发布 | 草稿/测试版 → 冻结为生产版（先过评测门禁） | POST /admin/agents/{id}/publish |
| 回滚 | 切回历史生产版本 | POST /admin/agents/{id}/rollback |
| 版本列表 | 全部版本 + diff（两版本配置对比） | GET /admin/agents/{id}/versions |
| 克隆 | 一键复制（新 agent 继承配置，改名字/改差异） | POST /admin/agents/{id}/clone |
| 停用/启用 | 暂停服务/恢复 | POST /admin/agents/{id}/disable、/enable |
| 废弃/归档 | 退役流程（数据保留/导出） | POST /admin/agents/{id}/deprecate、/archive |
| 删除 | 物理删除（需二次确认+审计） | DELETE /admin/agents/{id} |

### 4.2 运行管理（AgentOps）

| 能力 | 说明 | 接口 |
|------|------|------|
| 运行状态 | 各 agent 健康灯/错误率/延迟/队列 | GET /admin/agents/status |
| 运行统计 | 调用量/成本/满意度趋势 | GET /admin/agents/{id}/stats |
| 会话查看 | 该 agent 的会话列表/详情（转写回看） | GET /admin/agents/{id}/sessions |
| 评测入口 | 跳转对该 agent 跑评测（11 联动） | POST /admin/agents/{id}/eval |
| 日志跳转 | trace_id 跳转 12 排查 | — |

### 4.3 模板管理（TemplatePanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 模板库 | 20+ 预置模板（分类浏览） | GET /admin/templates |
| 模板详情 | 配置骨架预览/说明/使用次数 | GET /admin/templates/{id} |
| 自定义模板 | 把已有 agent 保存为模板 / 新建模板 | POST /admin/templates |
| 编辑/删除模板 | 维护 | PUT/DELETE /admin/templates/{id} |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 导出/导入 agent | 配置 JSON/YAML 迁移（跨环境/跨平台） | 🔶 待补 |
| 批量操作 | 多 agent 批量停用/归档/导出 | 🔶 待补 |
| 变更日历 | agent 发布/回滚时间线 | 🔶 待补 |
| AI 生成 agent | 自然语言描述需求 → 生成完整配置（向导第 0 步） | 🔶 待补 |
| 依赖图 | 哪些工作流/入口路由引用了该 agent（影响分析） | 🔶 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 路由解析链路（线上请求怎么找到 agent）

```
用户消息 → 入口路由（08 对话层）
  ├─ 1. 解析目标 agent（用户手动指定 / 路由规则 / 默认）
  ├─ 2. 读取 agent 配置：仅 published 版本生效
  │     ├─ draft/testing → 拒绝线上调用（仅测试通道可）
  │     ├─ disabled → 返回"该助手已停用"（可配兜底 agent）
  │     └─ published → 加载 config_snapshot
  ├─ 3. 装配运行时：prompt(01)+模型(06)+工具(04)+记忆(05)+编排(07)+技能(10)
  ├─ 4. 执行对话 → 指标统计（成本/延迟写入 agent.stats）
  └─ 5. 失败 → 12 监控 + 状态灯变红
```

### 5.2 发布链路（带门禁）

```
开发者点发布
  ├─ 1. 校验：配置完整（模型可达/工具存在/描述非空）
  ├─ 2. 门禁（LIFECYCLE_PUBLISH_REQUIRE_EVAL=true）：
  │     跑关键评测集（11）→ 未达标 → 阻断并展示报告
  ├─ 3. 审批（可选，LIFECYCLE_PUBLISH_REQUIRE_APPROVAL）：
  │     生成审批单（13）→ 待管理员批准
  ├─ 4. 发布：config_snapshot 冻结为新生产版本（version+1）
  ├─ 5. 生效：路由层立即切换（新请求用新版，进行中会话不受影响）
  └─ 6. 审计：发布人/版本/时间/门禁结果
```

### 5.3 回滚链路

```
管理员点回滚
  ├─ 选目标版本（历史生产版本）
  ├─ 当前生产版本降级为历史（可再切回）
  ├─ 路由层原子切换（秒级，无需重启）
  └─ 审计 + 通知（回滚原因必填）
```

### 5.4 克隆链路

```
克隆 agent X
  ├─ 复制 config_snapshot（改名/改描述必填，防混淆）
  ├─ 新 agent 状态 = draft（own scope 归当前用户）
  ├─ 关联 template_ref = "clone of X@v{N}"
  └─ 与原 agent 完全独立（后续改谁都不影响谁）
```

### 5.5 下线链路（优雅退役）

```
停用 → 现有会话自然结束（新请求拒绝）→ 数据保留
  → 观察期（默认 180 天）
  → 归档（配置/会话/统计导出 + 冷存储）
  → 可随时恢复（归档前）
```

### 5.6 失败降级

| 场景 | 降级 |
|------|------|
| 发布门禁服务不可用 | 阻断发布（fail-closed） |
| 配置加载失败 | 拒绝该 agent 调用 + 告警（不用坏配置服务） |
| 回滚失败 | 保持当前版本 + 告警（不出现"半回滚"状态） |
| 草稿版本损坏 | 保留最近可用版本 + 提示 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：发布/停用/废弃/归档/回滚；开发者：自己 agent 全操作（own scope）；查看者：只读 |
| 环境隔离 | dev 配置不污染 prod；测试通道与线上通道分离 |
| 版本不可变 | 发布后版本冻结；回滚也是切版本（不覆盖） |
| 审计 | 创建/发布/回滚/克隆/停用/归档全审计（谁在何时对哪个 agent 做了什么） |
| 防滥用 | 每用户 agent 上限/克隆上限/草稿过期提醒 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| Agent CRUD | /admin/agents（GET/POST/PUT/DELETE） | admin/AgentsPanel.tsx（已有基础） | ✅ | — |
| 配置编辑 | GET/PUT /admin/agents/{id}/config | AgentsPanel 配置表单 | 🔶 | 全字段表单 |
| 模拟测试 | POST /admin/agents/{id}/simulate | AgentsPanel | 🔶 | 测试通道 |
| 发布/回滚 | POST /admin/agents/{id}/publish、/rollback | AgentsPanel | 🔶 | 门禁+版本冻结 |
| 版本列表/diff | GET /admin/agents/{id}/versions | 新组件 VersionHistory.tsx | 🔶 | diff 渲染 |
| 克隆 | POST /admin/agents/{id}/clone | AgentsPanel | 🔶 | — |
| 停用/启用/废弃/归档 | POST .../disable|enable|deprecate|archive | AgentsPanel | 🔶 | 状态机 |
| 模板库 | /admin/templates* | 新组件 TemplatePanel.tsx | 🔶 | M0 模板表落地 |
| 运行统计/会话 | /admin/agents/{id}/stats、/sessions | AgentsPanel | 🔶 | 统计聚合 |
| AI 生成 agent | POST /admin/agents/generate | AgentStudio 向导 | ⬜ | LLM 生成配置 |

**验证方法**：
1. 从模板创建客服 agent → 模拟测试对话 → 正常回复（创建+测试通）。
2. 修改配置 → 版本列表出现 v2 → 发布 → 线上会话用 v2（版本+发布通）。
3. 回滚到 v1 → 新请求立即用 v1（回滚通）。
4. 克隆该 agent → 改名 → 两个 agent 独立运行互不影响（克隆通）。
5. 停用 → 对话入口返回"已停用" → 启用 → 恢复（状态机通）。
