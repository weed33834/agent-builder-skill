# 深度规格 13：权限与身份（IAM）

> 模板：docs/deep-spec/00-template.md
> 定位：智能体有真实权限了（能写库/发邮件/调用外部系统），就必须回答"谁能用、能用谁的、能做什么、有据可查"。IAM 管住：身份（用户/agent/API 凭证）、角色权限（RBAC）、资源授权（数据级/操作级）、审批（敏感操作）、审计（全量留痕）。

## 1. 定位与总体架构

**业务价值**：三问——**谁**（身份）能对**什么**（资源）做**什么**（操作）。没有 IAM，多用户系统就是裸奔；没有审计，出事无法追责。

**核心模型（RBAC + 资源级授权）**：

```
主体（Principal）：用户 / Agent / API Client
   │ 绑定
   ▼
角色（Role）：admin / developer / operator / viewer / agent-runner…
   │ 授予
   ▼
权限（Permission）：{action: create/read/update/delete/execute/approve, resource: agents/models/prompts/tools/…, scope: all/own/team/{id}}
   │ 约束
   ▼
资源（Resource）：agent 实例 / 知识库 / 会话 / 密钥 / 工作流…
```

**敏感操作审批（四眼原则）**：

```
Agent 请求敏感操作（发邮件/删数据/转账/外发文件）
  → IAM 判定：该操作在 agent 权限外 or 标记敏感
  → 阻断执行 → 生成审批单（HITL 联动 07）
  → 审批人批准/拒绝（管理台/对话卡片）
  → 批准 → 放行执行（带审计） / 拒绝 → 告知 agent
```

## 2. 资产模型（IAM 数据模型）

### 2.1 用户（DB：`users`）

| 字段 | 说明 |
|------|------|
| id / username | 标识 |
| email / phone | 联系方式（唯一） |
| password_hash | 密码哈希（argon2/bcrypt，不存明文） |
| mfa_enabled / mfa_secret | 双因素 |
| status | active/disabled/locked |
| roles | 角色列表（可多角色） |
| departments / tags | 组织属性（按部门授权的依据） |
| last_login_at / created_at | 审计 |
| oauth_providers | 第三方登录绑定（微信/飞书/钉钉） |

### 2.2 角色（DB：`roles`）

| 字段 | 说明 |
|------|------|
| id / name | 角色名（admin/developer/operator/viewer/agent-runner） |
| description | 说明 |
| permissions | 权限集合（见 2.3 格式） |
| is_system | 系统内置（不可删）/自定义 |
| parent_role | 继承（子角色自动拥有父角色权限） |

### 2.3 权限（权限项格式）

```json
{
  "action": "update",
  "resource": "prompts",
  "scope": "own"        // all=全部 / own=自己的 / team=本团队 / specific:xxx
}
```

内置角色默认权限矩阵：

| 角色 | 权限 |
|------|------|
| admin | 全部（含 IAM/密钥/系统设置/审批） |
| developer | 自己创建的 agent/prompt/workflow 全操作；他人资源只读；可跑评测 |
| operator | 运行类（启停/重试/任务/告警确认）+ 只读查看 |
| viewer | 全部只读 |
| agent-runner | 仅供 agent 运行时使用（调用自己绑定的工具/检索授权知识库） |

### 2.4 API 凭证（DB：`api_keys`）

| 字段 | 说明 |
|------|------|
| id / name | 凭证名（用途标注） |
| key_hash | 凭证哈希（只存哈希，前端只显示一次明文） |
| owner_type / owner_id | 归属（user/agent/client） |
| scopes | 授权范围（如只允许调 chat API） |
| expires_at | 过期时间（自动失效） |
| rate_limit | 调用限额（每分钟/每天） |
| last_used_at / status | 使用与状态（active/revoked） |
| created_by | 审计 |

### 2.5 审批单（DB：`approvals`）

| 字段 | 说明 |
|------|------|
| id / type | 单号 + 类型（敏感操作/发布审批/权限申请/音色克隆…） |
| requester_type / requester_id | 申请人（user/agent） |
| action / resource | 申请的操作与资源 |
| context | 上下文（哪次请求/哪个工作流/原因） |
| status | pending/approved/rejected/cancelled |
| approver / approved_at | 审批人/时间 |
| policy | 触发策略（always/超出权限/标记敏感/金额阈值） |
| payload | 放行后执行的参数快照 |

### 2.6 审计日志（DB：`audit_logs`）

| 字段 | 说明 |
|------|------|
| id / trace_id | 日志标识（关联 12 trace） |
| actor_type / actor_id | 操作者（user/agent/api/system） |
| action | 操作（login/update/delete/execute/approve/…） |
| resource_type / resource_id | 资源 |
| before / after | 变更前后快照（diff 能力） |
| ip / user_agent | 来源 |
| result | success/denied(权限不足)/failed |
| reason | 拒绝原因 |
| created_at | 时间 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| IAM_ENABLED | bool | true | IAM 总开关（false=开发模式放行） | true/false | 热加载 |
| IAM_DEFAULT_ROLE | string | viewer | 新用户默认角色 | 角色名 | 热加载 |
| IAM_TOKEN_TTL_MINUTES | int | 120 | JWT 有效期 | 5-1440 | 热加载 |
| IAM_REFRESH_TTL_DAYS | int | 14 | 刷新令牌有效期 | 1-90 | 热加载 |
| IAM_MFA_REQUIRED | bool | false | 强制双因素 | true/false | 热加载 |
| IAM_LOGIN_MAX_ATTEMPTS | int | 5 | 登录失败锁定阈值 | 3-20 | 热加载 |
| IAM_LOCK_MINUTES | int | 15 | 锁定时长 | 5-1440 | 热加载 |
| IAM_PASSWORD_MIN_LENGTH | int | 8 | 密码长度 | 8-64 | 热加载 |
| IAM_APPROVAL_REQUIRED | enum | sensitive | 审批触发范围 | sensitive(仅敏感)/all/off | 热加载 |
| IAM_APPROVAL_TIMEOUT | int | 3600 | 审批单超时（超时拒绝） | 600-86400 | 热加载 |
| IAM_APPROVAL_TIMEOUT_ACTION | enum | reject | 超时处理 | reject/proceed | 热加载 |
| IAM_AUDIT_ENABLED | bool | true | 审计总开关 | true/false | 热加载 |
| IAM_AUDIT_RETENTION_DAYS | int | 365 | 审计保留（合规） | 30-3650 | 热加载 |
| IAM_API_KEY_LIFETIME_DAYS | int | 90 | API 凭证默认有效期 | 1-3650 | 热加载 |

### 3.2 敏感操作清单（可配置，DB：`sensitive_actions`）

```yaml
sensitive_actions:
  - {action: execute, resource: tool:send-email}
  - {action: execute, resource: tool:delete-file}
  - {action: delete, resource: "*"}                  # 任何删除
  - {action: update, resource: system-settings}
  - {action: execute, resource: workflow:payment-*}
  - {action: transfer, resource: fund}               # 资金类
  - {action: export, resource: user-data}            # 数据导出
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 用户管理（UserPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 用户列表 | 用户名/角色/状态/最后登录 | GET /admin/users |
| 新建/编辑用户 | 基本信息/角色分配/状态 | POST/PUT /admin/users |
| 禁用/解锁 | 禁用（拒绝登录）/解锁（清除锁定） | POST /admin/users/{id}/disable、/unlock |
| 重置密码 | 管理员重置（生成临时密码） | POST /admin/users/{id}/reset-password |
| 绑定第三方 | 微信/飞书/钉钉 OAuth 绑定管理 | POST /admin/users/{id}/oauth |
| 登录日志 | 该用户登录历史/失败记录 | GET /admin/users/{id}/logins |

### 4.2 角色与权限（RolePanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 角色列表 | 系统角色+自定义角色/权限数/成员数 | GET /admin/roles |
| 新建/编辑角色 | 权限点勾选（action×resource×scope 矩阵）+ 继承 | POST/PUT /admin/roles |
| 删除角色 | 被引用时 409 | DELETE /admin/roles/{id} |
| 权限矩阵预览 | 以表格展示"谁能干什么"（可导出） | GET /admin/roles/matrix |
| 权限校验工具 | 输入"用户+操作+资源" → 判定允许/拒绝+原因（**验证权限逻辑**） | POST /admin/roles/check |

### 4.3 审批中心（ApprovalCenter）

| 能力 | 说明 | 接口 |
|------|------|------|
| 待办审批 | 列表：申请人/操作/资源/原因/时间 | GET /admin/approvals?status=pending |
| 审批处理 | 批准（可备注）/拒绝（必须填原因） | POST /admin/approvals/{id}/approve、/reject |
| 历史审批 | 已处理记录/我提交的 | GET /admin/approvals?status=approved |
| 审批规则 | 敏感操作清单管理（增删敏感动作） | GET/POST/DELETE /admin/sensitive-actions |
| 批量处理 | 同类型多单批量批准/拒绝 | POST /admin/approvals/batch |

### 4.4 API 凭证（ApiKeyPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 凭证列表 | 名称/归属/范围/有效期/状态 | GET /admin/api-keys |
| 新建凭证 | 选归属+范围+限额+有效期 → 创建后**只显示一次明文** | POST /admin/api-keys |
| 吊销 | 立即失效 | POST /admin/api-keys/{id}/revoke |
| 用量查看 | 该凭证调用量/限额使用 | GET /admin/api-keys/{id}/usage |

### 4.5 审计查询（AuditPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 审计列表 | 时间/操作者/操作/资源/结果/来源 IP | GET /admin/audit |
| 筛选 | 操作者/操作类型/资源/时间段/结果（denied 重点看） | ?actor=&action=&result=denied&since= |
| 详情 | before/after diff（变更了什么一清二楚） | GET /admin/audit/{id} |
| 权限拒绝分析 | 被拒操作分布（谁在尝试什么） | GET /admin/audit/denied-stats |
| 导出 | 审计导出（合规审计用，CSV） | GET /admin/audit/export |

### 4.6 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 登录页/找回密码 | 登录/双因素验证/忘记密码 | 🔶 auth.py 已有 JWT |
| SSO/OAuth | 微信/飞书/钉钉扫码登录 | 🔶 待补 |
| 会话管理 | 查看在线会话/强制下线 | 🔶 待补 |
| 团队/部门 | 部门维度授权（team scope） | 🔶 待补 |
| 操作模拟 | 模拟某角色视角预览界面权限（权限验证） | ⬜ |

## 5. 运行时嵌入（真正被调用）

### 5.1 认证链路

```
登录：POST /auth/login（用户名密码 / OAuth 回调）
  ├─ 校验 + 失败计数（5 次锁定 15min）
  ├─ 通过 → 签发 JWT（含 user_id/roles，TTL 120min）
  └─ 刷新令牌（14 天，轮换）
后续请求：Authorization: Bearer <JWT>
  ├─ 中间件验签 + 过期检查
  ├─ MFA 开启用户需二次验证（TOTP）
  └─ 注入当前主体（user/agent）
```

### 5.2 授权判定链路（每个管理/业务操作都过）

```
请求到达 → AuthZMiddleware
  ├─ 1. 取主体角色集合（user 角色 + agent 归属角色）
  ├─ 2. 解析请求 = {action, resource, scope}
  ├─ 3. 权限匹配：
  │     ├─ admin → 放行
  │     ├─ 角色权限包含 {action, resource} → 检查 scope：
  │     │     own → 资源 owner == 当前用户？
  │     │     team → 资源 owner 的部门 == 当前用户部门？
  │     │     all → 放行
  │     └─ 不匹配 → 404 敏感资源/403 拒绝（记录审计 denied）
  ├─ 4. 敏感操作检查：命中 sensitive_actions → 转审批流程（阻断等待）
  ├─ 5. 记录审计（before/after 快照）
  └─ 放行
```

### 5.3 Agent 权限（agent-runner 角色）

```
Agent 运行时的权限模型（agent.yaml permissions）：
  ├─ tools: [order-query, refund-approve]     # 可用工具白名单
  ├─ knowledge_bases: [product-docs]          # 可检索知识库
  ├─ actions: [execute:tool:send-email]       # 可自动执行的敏感操作（预授权）
  ├─ require_approval: [execute:tool:refund]  # 必须审批的操作
  └─ budgets: {daily_cost: 50, daily_calls: 200}
工具调用 → ToolRegistry 前置 IAM 检查（04 联动）→ 未授权/需审批 → 拦截
```

### 5.4 审计链路（全量留痕）

```
任何关键操作 → audit 中间件：
  ├─ 记录 before/after（编辑类）
  ├─ 结果（success/denied/failed + 原因）
  ├─ trace_id 关联（一键跳转 12 排查）
  └─ 异步落库（不阻塞主流程）
```

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| IAM 服务不可用 | 拒绝新登录（fail-closed，安全优先）；已有 JWT 在有效期内可用 |
| 审批中心不可用 | 敏感操作一律拒绝（安全优先），恢复后补审 |
| 审计落库失败 | 本地缓冲队列重试（审计不能丢） |
| 密码哈希算法缺失 | 启动自检失败，拒绝启动（不静默降级） |

## 6. 安全与权限（自举）

| 维度 | 策略 |
|------|------|
| 密码 | 只存哈希（argon2）；传输 HTTPS；登录限速 |
| 凭证 | API key 只显示一次明文；只存哈希；过期自动失效；吊销即时 |
| 角色 | 最小权限默认（viewer）；admin 操作需 MFA（可选强制） |
| 审批 | 四眼原则：审批人不能是申请人（单角色除外）；超时自动拒绝 |
| 审计 | 防篡改：审计日志追加写（不可覆盖）；admin 删审计被审计 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 登录/刷新 | /auth/login、/auth/refresh | 登录页（已有） | ✅ | — |
| 用户 CRUD | /admin/users* | 新组件 UserPanel.tsx | 🔶 | 前端组件 |
| 角色权限 | /admin/roles*、/matrix、/check | 新组件 RolePanel.tsx | 🔶 | 权限点矩阵 |
| 审批中心 | /admin/approvals*、/sensitive-actions | 新组件 ApprovalCenter.tsx | 🔶 | 审批流 |
| API 凭证 | /admin/api-keys* | ApiKeyPanel | 🔶 | 一次性明文展示 |
| 审计查询 | /admin/audit* | 新组件 AuditPanel.tsx | 🔶 | before/after diff |
| 会话管理 | /admin/sessions | UserPanel | ⬜ | — |
| OAuth | /auth/oauth/* | 登录页 | ⬜ | 渠道配置 |
| 权限矩阵导出 | GET /admin/roles/export | RolePanel | ⬜ | — |
| MFA | /auth/mfa/* | 登录页 | ⬜ | TOTP |

**验证方法**：
1. 新建用户（viewer 角色）→ 登录 → 尝试删 prompt → 403 + 审计记录 denied（RBAC 生效）。
2. 给开发者角色授权 own scope → 该用户可改自己的 agent、改不了别人的（scope 生效）。
3. 配置"发邮件"为敏感操作 → agent 触发发邮件 → 出现审批单 → 批准后放行、拒绝后阻断（审批生效）。
4. 吊销一个 API key → 用它调接口 → 401（吊销即时生效）。
5. 审计查询筛选"权限被拒" → 看到刚才 403 的记录 + 操作者/资源/原因（审计生效）。
