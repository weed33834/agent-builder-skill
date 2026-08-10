# 深度规格 04：工具系统（Tool System）

> 模板：docs/deep-spec/00-template.md
> 用户点名示例："各种提示职工上下文工" —— 工具是智能体的"手"，工具系统决定智能体能做什么、以及做得安不安全。

## 1. 定位与总体架构

**业务价值**：智能体的能力边界由工具决定。工具系统要管住：**注册与发现**（工具从哪来）、**描述与 Schema**（模型怎么知道怎么用）、**执行与隔离**（怎么安全地跑）、**治理**（谁能用、用什么、怎么审计）、**外部接入**（MCP/API 连接器）。

**工具来源全景**：

```
工具来源
├─ 内置工具（代码内置）：get_time / calculator / file_ops / shell / execute_code …
├─ 业务工具（@tool 装饰器注册）：query_db / send_email / create_order …
├─ MCP 服务器工具（外部接入）：通过 MCP 协议发现（HTTP/stdio），如 GitHub MCP、数据库 MCP
├─ 插件工具（插件系统导出，见 10-skill-plugin）
└─ 模型内置工具（厂商自带）：OpenAI web_search / anthropic computer_use（代理模式）
```

**核心架构**：

```
ToolRegistry（全局工具中心）
├─ register(tool)          — 注册（装饰器/显式）
├─ get_schema(name)        — 给模型看的 JSON Schema
├─ execute(name, args)     — 执行（含沙箱/权限/审计管线）
├─ list(filter)            — 发现与查询
├─ enable/disable(name)    — 启停控制
├─ bind_to_agent(agent_id) — agent 工具白名单绑定
└─ mcp_connectors         — MCP 连接管理（HTTP/stdio）

执行管线（execute 内部）：
权限校验 → 沙箱策略(02) → 超时/重试 → 执行 → 输出截断 → 审计 → 结果回喂模型
```

## 2. 资产模型（工具数据模型）

### 2.1 工具定义（DB：`tools` / 代码内 @tool）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| name | string | ✅ | — | 工具名（模型调用用） | 1-64 字符，`^[a-z0-9_]+$`，全局唯一 |
| description | string | ✅ | — | 工具说明（模型理解用途） | 应写明"何时用/参数含义/返回内容"，2-3 句最佳 |
| schema | json | ✅ | 自动 | 参数 JSON Schema | 由函数签名自动生成（pydantic），可手写覆盖 |
| category | enum | ✅ | business | 分类 | builtin/business/mcp/plugin/llm_builtin |
| source | string | 否 | — | 来源 | `code:module.path` / `mcp:server_name` / `plugin:name` |
| enabled | bool | ✅ | true | 是否启用 | false=从模型视野中消失，执行直接拒绝 |
| visibility | enum | ✅ | private | 可见性 | private(仅指定 agent) / team / public |
| allowed_agents | list<string> | 否 | [] | 可使用它的 agent 白名单 | visibility=private 时必填 |
| sandboxed | bool | ✅ | false | 是否需沙箱执行 | true → 走 SandboxManager（02） |
| sandbox_policy | json | 否 | {} | 沙箱策略覆盖 | {type, network, timeout, ...} |
| requires_approval | enum | 否 | never | 是否需要人工审批 | never/on_sensitive/always |
| sensitive_actions | list | 否 | [] | 敏感动作声明 | 如 write_file/send_email/delete/payment |
| timeout | int | 否 | 30 | 执行超时（秒） | 1-600 |
| max_output_chars | int | 否 | 8000 | 输出截断 | 100-100000 |
| retry_policy | json | 否 | {max:2, backoff:1.0} | 失败重试 | max 0-5 |
| rate_limit | json | 否 | {} | 限流 | {rpm, burst} 按 agent 维度 |
| cost_code | string | 否 | — | 计费/成本归集编码 | 对账用 |
| stats | json | 否 | {} | 运行统计 | 调用次数/失败率/平均耗时（可观测性写入） |
| created_at / updated_at | datetime | ✅ | now | 时间戳 | — |

### 2.2 工具版本（可选，DB：`tool_versions`）

| 字段 | 说明 |
|------|------|
| id / tool_id / version | 版本号（修改 schema 或实现时 +1） |
| schema_snapshot | 该版本 schema |
| change_note | 变更说明 |
| created_by / created_at | 审计 |

### 2.3 MCP 连接（DB：`mcp_servers`）——外部工具接入

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | UUID | ✅ | — | 连接 ID |
| name | string | ✅ | — | 连接名（唯一） |
| transport | enum | ✅ | http | http / stdio |
| endpoint | string | 条件 | — | HTTP 端点（http 必填） |
| command / args / env | string/list | 条件 | — | stdio 启动命令（stdio 必填） |
| auth_type | enum | 否 | none | none / bearer / basic / oauth2 |
| auth_config | json | 否 | {} | 认证配置（密钥走密钥库） |
| headers | json | 否 | {} | 自定义请求头 |
| timeout | int | 否 | 30 | 请求超时 |
| enabled | bool | ✅ | true | 连接启停 |
| tool_prefix | string | 否 | "" | 发现工具名前缀（防命名冲突，如 `github_`） |
| health_status | enum | 否 | unknown | 健康状态（探测结果） |
| last_health_check | datetime | 否 | — | 上次探测时间 |
| created_by / created_at | — | ✅ | — | 审计 |

### 2.4 生命周期

```
注册（代码/MCP发现/插件导出）→ 待审（可选）→ 启用 → 绑定到 agent → 运行 → 停用/下线
  每次 schema 或实现变更 → 新版本（模型侧立即感知）
```

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| TOOL_REGISTRY_AUTO_DISCOVER | bool | true | 启动时自动扫描 @tool 装饰器 | true/false | 重启 |
| TOOL_REGISTRY_SCAN_PATHS | list | [app/l5_tools/builtin] | 扫描目录 | 路径列表 | 重启 |
| TOOL_MCP_ENABLED | bool | true | MCP 客户端总开关 | true/false | 热加载 |
| TOOL_MCP_AUTO_CONNECT | list | [] | 启动时自动连接的 MCP 服务器 | 服务器名列表 | 重启 |
| TOOL_MCP_MAX_SERVERS | int | 20 | 并发 MCP 连接上限 | 1-200 | 热加载 |
| TOOL_DEFAULT_TIMEOUT | int | 30 | 默认执行超时 | 1-600 | 热加载 |
| TOOL_DEFAULT_MAX_OUTPUT | int | 8000 | 默认输出截断 | 100-100000 | 热加载 |
| TOOL_OUTPUT_TRUNCATE_TAIL | bool | true | 截断保留尾部（而非头部） | true/false | 执行时 |
| TOOL_ERROR_RETURN_POLICY | enum | sanitize | 错误回喂格式 | sanitize(脱敏+摘要) / raw(原始) / short(一行) | 执行时 |
| TOOL_AUDIT_ENABLED | bool | true | 工具调用审计 | true/false | 热加载 |
| TOOL_AUDIT_RETENTION_DAYS | int | 90 | 审计保留天数 | 1-3650 | 热加载 |
| TOOL_UNREGISTERED_POLICY | enum | deny | 未注册工具调用处理 | deny / log | 执行时 |
| TOOL_LLM_BUILTIN_MODE | enum | proxy | 厂商内置工具处理 | proxy(代理给厂商) / disable / map(映射到本地实现) | 重启 |

### 3.2 按 agent 配置（agent.yaml）

```yaml
tools:
  allowed: [get_time, calculator, query_db]   # 白名单（不填=全部可用）
  denied: [delete_file]                        # 黑名单（优先于白名单）
  mcp:
    servers: [github, internal-db]             # 该 agent 可用的 MCP 连接
  auto_add: true                               # 新注册工具是否自动加入该 agent（默认 false）
  policy:
    requires_approval: [send_email, payment]   # 这些工具需人工审批
    sandboxed: [execute_code, shell]           # 强制沙箱
```

### 3.3 MCP 服务器配置示例（管理界面表单同构）

```json
{
  "name": "github",
  "transport": "http",
  "endpoint": "https://api.githubcopilot.com/mcp/",
  "auth_type": "bearer",
  "auth_config": {"token_ref": "{SECRET:GITHUB_MCP_TOKEN}"},
  "timeout": 30,
  "tool_prefix": "github_"
}
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 工具列表页（ToolManager）

| 能力 | 说明 | 接口 |
|------|------|------|
| 工具列表 | 名称/分类/来源/启用状态/绑定 agent 数/调用统计 | GET /admin/tools |
| 筛选搜索 | 分类/来源/启停/关键字 | ?category=&source=&enabled=&q= |
| 启停控制 | 一键停用（模型立即看不到，执行拒绝） | POST /admin/tools/{name}/toggle |
| 批量操作 | 批量启停/批量绑定 | POST /admin/tools/batch（待补） |
| 运行统计 | 调用次数/成功率/平均耗时/错误分布 | GET /admin/tools/{name}/stats |
| 审计查看 | 谁在什么时候调用了什么工具、参数、结果 | GET /admin/tools/{name}/audit |

### 4.2 工具详情/编辑器（ToolDetail）

| 能力 | 说明 |
|------|------|
| 基本信息 | name/description/category/source/启用状态（描述可编辑——优化模型理解） |
| Schema 查看 | 参数 JSON Schema 树形展示 + 手动编辑覆盖（验证合法性） |
| 权限配置 | visibility/allowed_agents/requires_approval/sensitive_actions |
| 执行策略 | 沙箱开关+策略/sandboxed 类型/超时/输出上限/重试/限流 |
| 绑定管理 | 绑定/解绑 agent 列表 |
| 试跑台 | 输入参数 JSON → 立即执行 → 显示结果/耗时/违规（**验证工具真实可用**） |
| 调用历史 | 最近 N 次调用明细（输入/输出/状态/耗时） |
| 版本历史 | schema/实现变更记录 |

### 4.3 MCP 连接管理（MCPManager）

| 能力 | 说明 | 接口 |
|------|------|------|
| 连接列表 | 名称/传输/端点/健康状态/工具数 | GET /admin/tools/mcp/servers |
| 新建连接 | 表单：传输类型/端点或命令/认证/超时/前缀 | POST /admin/tools/mcp/connect |
| 连接向导 | 三步向导：①选传输 ②填端点/认证 ③测试连接+发现工具预览 | 前端分步表单 |
| 测试连接 | 真实握手 + 列出发现的工具 | POST /admin/tools/mcp/{id}/test |
| 启停 | 断连（已发现工具从模型视野消失） | POST /admin/tools/mcp/{id}/toggle、/disconnect |
| 工具管理 | 从发现列表中勾选启用哪些工具/改前缀/改描述 | POST /admin/tools/mcp/{id}/tools |
| 健康探测 | 定时探测 + 状态灯 + 失败告警 | 后台任务 + GET 状态 |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| AI 生成工具描述 | 输入函数签名/业务说明 → 生成高质量 description + schema 注释 | 🔶 待补 |
| 工具模板库 | 预置常用工具模板（数据库查询/HTTP 请求/邮件/文件操作），一键复制生成 | 🔶 待补 |
| MCP 市场 | 浏览公共 MCP 服务器（GitHub/Slack/Notion 等）→ 一键添加连接 | ⬜ 待补 |
| 导入导出 | 工具配置/绑定关系导出 YAML 迁移 | 🔶 待补 |
| 工具调用可视化 | 对话页展示工具调用卡片流（调用→参数→结果折叠） | ✅ 已有 ToolCall 组件 |

## 5. 运行时嵌入（真正被调用）

### 5.1 工具调用循环（模型侧视角）

```
1. 每轮请求：ToolRegistry.get_schemas(agent.allowed_tools)
   → 过滤 enabled 且绑定该 agent 的工具 → 生成 tools=[{name, description, parameters}]
   → 传入 LLMAdapter.complete(..., tools=...)
2. 模型返回 tool_calls[{name, arguments}]
3. 循环执行（M3.7 并行）：
   for each call → ToolRegistry.execute(name, args)
4. 执行结果 tool_result 回喂 → 模型继续推理或给出最终答案
```

### 5.2 execute 内部管线（代码路径）

```
ToolRegistry.execute(name, args)
  ├─ 1. 存在性校验：未注册 → TOOL_UNREGISTERED_POLICY（deny 报错）
  ├─ 2. 启用校验：enabled=false → 拒绝
  ├─ 3. 权限校验：agent 白名单/黑名单/visibility → 拒绝并审计
  ├─ 4. Schema 校验：args 按 JSON Schema 校验（pydantic），非法 → 返回校验错误（模型可自行修正重试）
  ├─ 5. 审批检查：requires_approval 命中 → HITL 挂起（同 02 沙箱审批）
  ├─ 6. 沙箱分发：sandboxed=true → SandboxManager.execute()（02 完整链路）
  │      否则 → 本地执行（进程内）
  ├─ 7. 执行控制：超时器 + 输出截断（保留尾部策略）+ 重试策略（可重试错误）
  ├─ 8. 错误处理：异常 → 按 TOOL_ERROR_RETURN_POLICY 格式化回喂（脱敏，不泄露堆栈/密钥）
  ├─ 9. 审计：写 audit（谁/何时/工具/参数摘要/结果摘要/违规）——参数自动脱敏（password/token 字段打码）
  ├─ 10. 统计：耗时/成败 → metrics（M13）
  └─ 返回 ToolResult{content, status, error?, metadata}
```

### 5.3 MCP 工具调用（外部工具）

```
模型调用 mcp 工具（name 带前缀，如 github_create_issue）
  → ToolRegistry 发现 source=mcp:github
  → McpClient.call(server_id, tool_name, args)     # app/l5_tools/mcp_client.py
       ├─ HTTP transport: POST {endpoint}/call_tool（带认证头）
       │   ├─ MCP stateless 模式（2026-07 规范）：无状态会话，直接 call
       │   └─ 传统模式：session 管理 + initialize 握手
       ├─ stdio transport: 子进程 stdin/stdout JSON-RPC
       ├─ 超时/重试/错误规范化
       └─ 结果按 MCP content 格式解析 → 统一 ToolResult
```

### 5.4 与各模块协作

| 协作对象 | 交互 |
|----------|------|
| 沙箱（02） | sandboxed 工具走 SandboxManager；浏览器工具走容器化 Playwright |
| 上下文（03） | tool_defs 区块注入 schema；工具结果经 CONTEXT_TOOL_RESULT_BUDGET 截断 |
| 提示词（01） | tool_desc 类型 prompt 可覆盖工具描述（模型理解优先于自动描述） |
| 权限（13） | 工具级 RBAC：谁能调用哪些工具（agent/user 维度） |
| 评估（11） | 工具调用成功率/正确性作为评估维度 |
| 可观测（13） | 每次调用 span：输入/输出/耗时/状态 |

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| MCP 服务器不可达 | 标记 unhealthy + 告警；该工具对模型隐藏（或返回明确错误） |
| 工具抛异常 | 按策略格式化回喂，模型可修正参数重试（限次数） |
| 输出超限 | 截断保留尾部 + 提示"输出已截断" |
| 审批超时 | 默认拒绝 + 通知发起人 |
| 沙箱不可用 | 同 02 降级链 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 最小权限 | 工具默认 private；agent 白名单显式绑定；denied 黑名单兜底 |
| 敏感操作 | 声明 sensitive_actions → 默认 requires_approval 或强制审计 |
| 参数脱敏 | 审计与日志中对 password/token/secret 字段自动打码；工具输出同样脱敏（如 API key 回显） |
| MCP 信任 | 连接需测试通过才可启用；发现工具默认不自动启用（需人工勾选）；工具名加前缀防冲突 |
| 注入防护 | 工具描述/参数中夹带注入指令 → 提示词侧隔离标记（03-5.5）；外部工具输出同样按外部数据对待 |
| 审计 | 全量调用审计 + 保留期可配；敏感工具调用触发实时告警 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 工具列表/筛选 | GET /admin/tools | admin/ToolManager.tsx（或 ToolsPanel） | ✅ | — |
| 启停 | POST /admin/tools/{name}/toggle | 同上 | ✅ | — |
| MCP 连接 CRUD/测试 | /admin/tools/mcp/*（connect/disconnect/test/servers） | MCPManager 组件 | ✅ 已有接口 | — |
| 工具详情/编辑器 | GET /admin/tools/{name} + PUT | ToolDetail 组件 | 🔶 待补前端 | 权限/策略/描述编辑 |
| 试跑台 | POST /admin/tools/{name}/test | ToolDetail | 🔶 待补 | 复用 execute 管线 |
| 审计查看 | GET /admin/tools/{name}/audit | 新组件 ToolAudit.tsx | ⬜ | 查询接口+前端 |
| 运行统计 | GET /admin/tools/{name}/stats | ToolDetail | ⬜ | 聚合 |
| AI 生成描述 | POST /admin/tools/generate-desc | ToolDetail | ⬜ | 复用 prompts generate |
| 模板库/市场 | GET /admin/tools/market | 新组件 ToolMarket.tsx | ⬜ | 数据+前端 |
| 绑定管理 | POST /admin/tools/{name}/bind | ToolDetail | 🔶 | 与 agents 接口联动 |

**验证方法**：
1. 管理台停用一个工具 → 对话中让 agent 调用 → 应返回"工具已禁用"（启停生效，模型视野同时移除）。
2. 试跑台输入参数执行 `calculator` → 返回正确结果（执行链路通）。
3. 添加 MCP 连接（HTTP）→ 测试连接 → 发现工具列表 → 启用一个 → 对话中调用成功（MCP 全链路）。
4. 触发敏感工具（如 send_email）→ 应出现审批卡片 → 拒绝后不执行（审批生效）。
5. 审计页查看刚才的调用记录 → 参数中 token 字段应打码（脱敏生效）。
