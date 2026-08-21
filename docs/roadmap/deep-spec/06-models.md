# 深度规格 06：模型管理（Model Management / Multi-Provider Gateway）

> 模板：docs/deep-spec/00-template.md
> 调研依据：多模型 API 网关方案（标准化 OpenAI 兼容接口/统一密钥/用量统计/无缝切换）、诗云 API 网络自动择路、CatRouter 企业级路由、Taotoken 集中式密钥管理。
> 核心结论：**多厂商接入 + 统一接口 + 密钥集中管理 + 路由/fallback + 成本计量**是生产级模型层的必备五件套。

## 1. 定位与总体架构

**业务价值**：不把鸡蛋放一个篮子。模型层要管住：**接入**（任意厂商一行配置接入）、**统一**（上层只认一个接口，模型切换零代码改动）、**路由**（按任务/成本/质量选模型）、**韧性**（fallback/重试/降级）、**密钥安全**（集中加密管理+轮换）、**成本**（按模型/项目/用户计量）。

**架构位置**：

```
上层（Agent 运行时/上下文组装）只调用：
  LLMAdapter.complete(model_alias, messages, tools, params) → 流式/非流式
                       ↓
┌─ ModelGateway（模型网关）────────────────────────────────────┐
│ 1. 别名解析：model_alias → 模型配置（Provider+型号+参数）      │
│ 2. 路由决策：任务类型/成本预算/健康状态 → 选模型（可路由）      │
│ 3. 密钥选择：多 key 轮换（round-robin/权重/健康剔除）          │
│ 4. 调用：Provider 适配器（OpenAI 兼容/Anthropic/Google/…）    │
│ 5. 韧性：超时/重试/fallback 链/熔断                            │
│ 6. 计量：token/成本/延迟 → metrics + 账单                      │
│ 7. 网络：多通道择路（直连/代理/备用通道，链路波动自动切换）     │
└───────────────────────────────────────────────────────────────┘
```

**六框架适配器关系**：L4 的 6 个框架适配器（bare/langgraph/openai-agents/claude-sdk/adk/autogen）是"智能体运行时"；本模块的 Provider 适配器是"模型供应商接入层"——框架适配器内部调用 ModelGateway，两者解耦。

## 2. 资产模型（模型数据模型）

### 2.1 Provider（DB：`providers`）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id / name | — | ✅ | — | 供应商名（openai/anthropic/deepseek/…） | 唯一 |
| provider_type | enum | ✅ | openai_compat | 协议类型 | openai_compat / anthropic / google / azure / ollama / custom |
| base_url | string | ✅ | — | API 端点 | 支持多通道：可配主/备 URL |
| api_key_ref | secret | ✅ | — | 密钥引用（存密钥库，不存明文） | {SECRET:xxx} |
| enabled | bool | ✅ | true | 启用状态 | false=路由跳过 |
| health_check_url | string | 否 | — | 健康探测端点 | 周期性 HEAD 探测 |
| status | enum | ✅ | unknown | 健康状态 | healthy/degraded/down/unknown |
| extra_headers | json | 否 | {} | 附加请求头（组织 ID 等） | — |
| timeout / max_retries | int | ✅ | 60/2 | 超时与重试 | — |
| created_by / created_at | — | ✅ | — | 审计 | — |

### 2.2 模型（DB：`models`）——alias 层

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id / name | — | ✅ | — | 模型别名（上层只用这个） | 如 `main-chat` / `cheap-summary` / `embedding` |
| provider_id | FK | ✅ | — | 归属供应商 | — |
| upstream_model | string | ✅ | — | 上游真实模型名 | 如 gpt-4o / deepseek-chat |
| capability | enum | ✅ | chat | 能力类型 | chat / embedding / image / audio / vision |
| supports_streaming | bool | ✅ | true | 是否支持流式 | — |
| supports_tools | bool | ✅ | true | 是否支持函数调用 | false=降级无工具模式 |
| supports_vision | bool | 否 | false | 多模态 | — |
| context_window | int | ✅ | — | 上下文窗口 token | 路由与预算计算用（03） |
| max_output_tokens | int | ✅ | — | 最大输出 | — |
| cost_per_1k_input / cost_per_1k_output | float | ✅ | 0 | 计费单价（元） | 成本计量依据 |
| default_params | json | 否 | {temperature:0.7} | 默认采样参数 | 可被调用方覆盖 |
| routing | json | 否 | {} | 路由规则 | 见 3.2 |
| enabled | bool | ✅ | true | 启用 | — |
| notes | string | 否 | — | 备注（何时用这个模型） | — |

### 2.3 密钥（DB：`model_keys`）——多 key 轮换

| 字段 | 类型 | 说明 |
|------|------|------|
| id / provider_id | — | 归属 |
| key_ref | secret | 密钥库引用 |
| label | string | 用途标签（如"主账号/备用/团队A"） |
| weight | int | 轮换权重（默认 1） |
| status | enum | active / disabled / rate_limited(限流中暂停) / exhausted(配额用尽) |
| rate_limit_until | datetime | 限流自动恢复时间 |
| last_used_at / usage | — | 用量统计 |
| created_by / created_at | — | 审计 |

### 2.4 路由规则（DB：`model_routes`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id / name | — | 规则名（如"主对话走旗舰，摘要走便宜"） |
| match | json | 匹配条件：task_type / capability / cost_budget / agent_id / priority |
| candidates | list | 按顺序的候选模型别名列表 |
| fallback_mode | enum | sequential（逐个试）/ weighted（按权重） |
| enabled | bool | 启用 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| MODEL_GATEWAY_ENABLED | bool | true | 网关总开关 | true/false | 热加载 |
| MODEL_DEFAULT_ALIAS | string | main-chat | 默认模型别名 | 已注册别名 | 热加载 |
| MODEL_FALLBACK_ENABLED | bool | true | fallback 链开关 | true/false | 热加载 |
| MODEL_FALLBACK_MAX_HOPS | int | 3 | 最大 fallback 跳数 | 1-5 | 热加载 |
| MODEL_CIRCUIT_BREAKER | bool | true | 熔断开关 | true/false | 热加载 |
| MODEL_CIRCUIT_THRESHOLD | int | 5 | 连续失败 N 次熔断 | 2-20 | 热加载 |
| MODEL_CIRCUIT_RESET_SECONDS | int | 60 | 熔断恢复时间 | 10-600 | 热加载 |
| MODEL_KEY_ROTATION | enum | round_robin | 多 key 策略 | round_robin / weighted / least_used / sticky | 热加载 |
| MODEL_KEY_AUTO_RECOVER | bool | true | 限流 key 自动恢复 | true/false | 热加载 |
| MODEL_REQUEST_TIMEOUT | int | 60 | 单请求超时 | 5-600 | 热加载 |
| MODEL_STREAM_TIMEOUT | int | 300 | 流式总超时 | 30-1800 | 热加载 |
| MODEL_NETWORK_CHANNELS | json | {} | 多网络通道 | {primary: url, backup: url} | 重启 |
| MODEL_NETWORK_FAILOVER | bool | true | 通道自动切换 | true/false | 热加载 |
| MODEL_COST_TRACKING | bool | true | 成本计量 | true/false | 热加载 |
| MODEL_USAGE_RETENTION_DAYS | int | 90 | 用量明细保留 | 1-3650 | 热加载 |
| MODEL_LOG_LEVEL | enum | info | 网关日志 | debug/info/warn | 热加载 |
| MODEL_PROXY_MODE | enum | auto | 直连/代理 | auto/direct/proxy | 热加载 |

### 3.2 路由规则示例（管理界面表单同构）

```yaml
routes:
  - name: chat-default
    match: {task_type: chat}
    candidates: [main-chat, fallback-fast, fallback-cheap]  # 顺序即 fallback 链
    enabled: true
  - name: summary-econ
    match: {task_type: summary, cost_budget: low}
    candidates: [cheap-summary]
    enabled: true
  - name: embedding-only
    match: {capability: embedding}
    candidates: [embedding]
    enabled: true
```

### 3.3 按 agent 配置（agent.yaml）

```yaml
model:
  alias: main-chat                 # 覆盖全局默认
  fallback: [fallback-fast]        # 追加 fallback
  params: {temperature: 0.3}       # 采样参数覆盖
  cost_budget: medium              # 路由成本档位
  no_vision: true                  # 本 agent 禁用视觉模型
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 Provider 管理（ProviderCards）

| 能力 | 说明 | 接口 |
|------|------|------|
| Provider 卡片墙 | 每厂商一张卡：名称/协议/健康状态灯/密钥数/本月成本/模型数 | GET /admin/models/providers |
| 新增/编辑 Provider | 协议类型/base_url/密钥引用/健康探测/附加头 | POST/PUT /admin/models/providers |
| 健康探测 | 手动触发 + 显示结果 | POST /admin/models/providers/{id}/health |
| 启停 | 停用后路由自动跳过 | POST /admin/models/providers/{id}/toggle |
| 密钥管理 | 该 Provider 的多 key 列表（标签/权重/状态/用量）+ 增删/启停/重置限流 | GET/POST/DELETE /admin/models/providers/{id}/keys |

### 4.2 模型管理（ModelList）

| 能力 | 说明 | 接口 |
|------|------|------|
| 模型列表 | 别名/上游型号/能力/窗口/成本单价/启用状态 | GET /admin/models |
| 新增模型 | 选 Provider + 上游型号 + 能力 + 窗口 + 成本 + 默认参数 | POST /admin/models |
| 测试模型 | **内置测试台**：输入提示词 → 试跑 → 显示响应/延迟/token/成本（**验证可用性**） | POST /admin/models/{id}/test |
| 参数编辑 | 默认温度/top_p/max_output | PUT /admin/models/{id} |
| 路由配置 | 每条路由规则的 match/candidates/fallback 模式 | GET/PUT /admin/models/routes |
| 删除模型 | 被路由引用时提示确认 | DELETE /admin/models/{id} |

### 4.3 用量与成本（UsagePanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 用量总览 | 按模型/Provider/项目/用户维度的 token 与成本 | GET /admin/models/usage |
| 成本趋势 | 日/周/月曲线 | GET /admin/models/usage/trend |
| 调用明细 | 单次调用：时间/模型/agent/用户/token/成本/延迟 | GET /admin/models/usage?filter= |
| 预算告警 | 项目预算阈值 → 告警（联动 12-monitor） | POST /admin/models/budgets |
| 异常调用 | 超长输出/超高成本调用标记（防滥用） | GET /admin/models/usage/anomalies |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 模型推荐 | 输入任务类型/预算 → 推荐模型组合（LLM 生成建议） | 🔶 待补 |
| 模型市场 | 内置常见模型目录（OpenAI/Anthropic/DeepSeek/GLM/Qwen/Kimi），一键添加 | 🔶 待补 |
| 批量导入 | 从现有项目配置（.env 风格）批量导入 Provider | 🔶 待补 |
| 配置导出 | 全部模型配置导出 YAML 迁移 | 🔶 待补 |
| 成本预测 | 基于近期用量预测下月成本 | ⬜ 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 请求路由链路

```
上层调用 LLMAdapter.complete(alias, ...)  →  ModelGateway.complete()
  ├─ 1. 别名解析：models 表查 alias → 配置（Provider/上游/能力/窗口/成本）
  ├─ 2. 路由匹配：routes 表按 match 条件选候选链
  │     无匹配 → 全局默认 alias
  ├─ 3. 熔断检查：候选 provider 是否在熔断/降级列表（健康表）
  ├─ 4. 密钥选择：该 provider 的 active keys → 按轮换策略选 key
  │     命中限流（429）→ 标记 rate_limited → 换下一个 key
  ├─ 5. 调用：按 provider_type 分发到对应适配器
  │     openai_compat → OpenAI 兼容协议（多数国产模型）
  │     anthropic / google / azure / ollama → 各自 SDK 适配
  ├─ 6. 网络通道：主通道失败 → 自动切备用通道（诗云/自建多路）
  ├─ 7. 响应处理：流式逐块透传 / 非流式完整返回
  ├─ 8. 韧性：超时 → 重试（幂等请求）→ fallback 下一个候选 → 全失败报错
  ├─ 9. 计量：usage {prompt_tokens, completion_tokens, cost, latency} → 用量表
  └─ 10. 健康反馈：失败 → 失败计数 → 达阈值熔断（后续请求跳过该 provider）
```

### 5.2 流式支持（前端打字机效果）

- ModelGateway.stream()：SSE 事件逐块透传（delta/usage/error/end）。
- 中途失败：已输出内容保留 + 后续内容走 fallback 模型补齐（降级提示可选）。
- 前端 Streaming UI 对接 AgentRuntime.stream（M8 待办已列）。

### 5.3 降级矩阵

| 场景 | 降级 |
|------|------|
| 主模型 429/5xx | 自动换同 provider 其他 key → 换 fallback 模型 |
| fallback 全失败 | 返回明确错误 + 建议（检查 Provider 状态页） |
| 模型不支持 tools | 自动降级无工具模式（提示"该模型不支持工具调用"） |
| 视觉请求被拒 | 若配置 no_vision，先文字化图片描述再发 |
| 流式中断 | 重试一次；失败则转非流式重试 |
| 密钥配额耗尽 | exhausted 标记 + 告警；跳过该 key |

### 5.4 成本计量公式

```
成本 = (prompt_tokens/1000 × cost_per_1k_input) + (completion_tokens/1000 × cost_per_1k_output)
```
- 按调用明细落库 → 聚合到 agent/项目/用户维度。
- 预算告警：月度累计 ≥ 阈值 80%/100% 两级告警（联动 12-monitor）。

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 密钥安全 | 明文不落库（密钥库加密存储）；API 响应/日志/审计全链路打码；管理界面只显示掩码（sk-****abcd） |
| 角色 | 管理员：Provider/密钥/路由全量；开发者：模型查看+测试（不可改密钥）；用户：不可见 |
| 审计 | Provider/密钥/路由变更审计；密钥轮换记录 |
| 防滥用 | 调用频率限制（代理维度）+ 异常用量告警（单次成本超阈值） |
| 数据出口 | 出网域名白名单（仅允许已配置的模型端点） |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 模型列表/详情 | GET /admin/models | admin/ModelsPanel.tsx（已有） | ✅ | — |
| 模型新增/编辑/测试/删除 | POST/PUT/DELETE /admin/models(/id)、/test | ModelsPanel | ✅ | — |
| Provider 管理 | /admin/models/providers* | 新组件 ProvidersPanel.tsx | 🔶 待补 | 后端+前端 |
| 密钥管理 | /admin/models/providers/{id}/keys* | ProvidersPanel | 🔶 待补 | 多 key 轮换后端 |
| 路由配置 | GET/PUT /admin/models/routes | ModelsPanel 子页 | 🔶 待补 | 路由表 |
| 用量/成本 | /admin/models/usage* | 新组件 UsagePanel.tsx | 🔶 待补 | 计量落库+前端图表 |
| 预算告警 | POST /admin/models/budgets | UsagePanel | ⬜ | 联动 12-monitor |
| 模型市场 | GET /admin/models/market | ModelsPanel | ⬜ | 目录数据 |
| 成本预测 | GET /admin/models/usage/forecast | UsagePanel | ⬜ | 统计 |

**验证方法**：
1. 管理台新增 Provider（deepseek）+ 模型别名 `main-chat` → 测试台试跑 → 返回正确响应（接入生效）。
2. 故意停用主模型 → 对话请求 → 自动落到 fallback 模型并正常回答（fallback 生效）。
3. 配置两个 key → 触发 5 次调用 → 用量页显示 key 轮换分布（轮换生效）。
4. 用量页查看单次调用成本 → 与公式手算一致（计量生效）。
5. 连续 5 次失败 → Provider 状态变熔断 → 后续请求跳过它（熔断生效）。
