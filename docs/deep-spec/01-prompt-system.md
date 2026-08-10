# 深度规格 01：提示词系统（Prompt System）

> 模板：docs/deep-spec/00-template.md
> 用户点名示例："提示词既要有管理界面（输入后能添加删除控制），也要保证对话时真正嵌入调用，还要有自动生成、导入模板等辅助功能。"

## 1. 定位与总体架构

**业务价值**：提示词是智能体的"人格+技能说明书"。全平台级提示词系统要管住三个问题：**资产化**（每个 prompt 是受管资产，可增删改查版本化）、**运行时化**（prompt 真正渲染进每次对话请求，不是纸上谈兵）、**生产化**（AI 生成、导入、测试、A/B、灰度、回滚一条龙）。

**数据流全景**：

```
┌─ 生产侧（管理台） ─────────────────────────────────────────────┐
│ 用户/管理员 → PromptEditor(前端) → /admin/prompts* (后端)        │
│   → prompts 存储（DB 表 + 文件 system_prompts/*.yaml + Git 版本）│
│   → AI 生成器(generate) / 导入器(import) / 模板市场 → 草稿 → 发布 │
└───────────────────────────────────────────────────────────────┘
                          ↓ 发布后进入运行时
┌─ 运行侧（对话链路） ────────────────────────────────────────────┐
│ 用户消息 → POST /chat → ChatService                                │
│   → PromptRenderer: 按 agent_type 装载 系统提示(含层级)            │
│   → 变量解析 {role}{domain}{date} + 区块预算 + 动态上下文注入       │
│   → 拼装 messages[] → LLMAdapter.complete(messages)                │
│   → 响应流式返回 → 会话历史持久化                                   │
└───────────────────────────────────────────────────────────────┘
```

**与相邻模块边界**：
- **提示词 vs 上下文管理（03）**：提示词=静态/半静态的指令资产（角色、规则、示例）；上下文=每轮动态组装的信息（历史、检索、记忆）。运行时提示词先渲染，上下文区块再注入。
- **提示词 vs 记忆（05）**：记忆是"学到的用户信息"，以资产形式注入上下文；提示词是"写死的规则"，以模板形式注入 system。

## 2. 资产模型（Prompt 数据模型全字段）

### 2.1 核心表结构（DB：`prompts`）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id | string(UUID) | ✅ | 自动 | 唯一 ID | 生成时分配 |
| name | string | ✅ | — | 资产名，全局唯一 | 1-64 字符，`^[a-z0-9_-]+$` |
| slug | string | ✅ | name | URL/引用标识 | agent.yaml 中引用的是 slug |
| type | enum | ✅ | system | 提示词类型 | `system`(系统指令) / `user`(用户指令模板) / `assistant`(assistant 示例) / `few_shot`(示例集) / `tool_desc`(工具描述覆盖) / `guardrail`(护栏) / `summary`(摘要指令) |
| role_profile | string | 否 | — | 角色设定文本 | 支持变量 `{role}` `{domain}` |
| instructions | string | ✅ | — | 指令正文 | 支持变量与区块语法（见 5.2） |
| variables | list<{name,type,desc,default,required}> | 否 | [] | 声明的模板变量 | type: string/number/bool/choice/list |
| blocks | list<{key,type,order,max_tokens,required}> | 否 | [] | 区块定义（分层指令用） | type: role/rules/tools/output/context |
| few_shot_examples | list<{input,output,label}> | 否 | [] | 示例集 | 每条约 2-5 条最佳 |
| output_schema | json | 否 | null | 强制输出结构 | JSON Schema；见 M1.6 |
| model_constraints | list | 否 | [] | 指定模型族/温度/top_p | 覆盖 agent.yaml 默认 |
| version | int | ✅ | 1 | 当前版本号 | 每次保存 +1 |
| status | enum | ✅ | draft | 状态 | `draft`草稿 / `review`待审 / `published`已发布 / `archived`已归档 / `disabled`停用 |
| published_version | int | 否 | null | 线上生效版本 | 指向 versions 表 |
| tags | list<string> | 否 | [] | 标签（分类检索） | 如 客服/金融/角色 |
| owner | string | ✅ | creator | 属主 | 权限矩阵依据 |
| created_at / updated_at / published_at | datetime | ✅ | now | 时间戳 | 自动维护 |

### 2.2 版本表（DB：`prompt_versions`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 版本 ID |
| prompt_id | FK | 所属资产 |
| version | int | 递增版本号 |
| content_snapshot | json | 该版本完整内容快照（含 variables/blocks/examples） |
| change_note | string | 变更说明（保存时必填，用于 diff 对照） |
| created_by | string | 提交人 |
| created_at | datetime | 提交时间 |
| diff_prev | string | 与上一版的 unified diff 文本（服务端生成） |

### 2.3 生命周期

```
草稿(draft) ──发布──▶ published ──停用──▶ disabled
   │ ▲                  │                    │
   │ 编辑(新版本)         │ 归档                │
   ▼ │                  ▼                    ▼
review ──审批──▶      archived ◀───────────────┘
```
- 发布动作：`published_version = 新版本号`，写入 `prompt_versions`，运行时立即热加载（见 5.4）。
- 回滚：将 published_version 指回旧版本号，可一键执行。

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（config.py / .env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| PROMPT_STORE_DRIVER | enum | file+db | 存储驱动 | `file`(YAML 文件) / `db`(数据库) / `file+db`(双写,文件为源) | 重启 |
| PROMPT_FILE_ROOT | path | templates/backend/.../system_prompts | 文件存储根目录 | 绝对/相对路径 | 重启 |
| PROMPT_GIT_VERSIONING | bool | true | 是否启用 Git 版本管理 | true/false | 热加载 |
| PROMPT_AUTO_GENERATE_ENABLED | bool | true | 是否开放 AI 生成功能 | true/false | 热加载 |
| PROMPT_AI_GENERATE_MODEL | string | 默认主模型 | 生成用模型（可独立指定便宜模型） | 模型别名 | 热加载 |
| PROMPT_AI_GENERATE_TEMPERATURE | float | 0.7 | 生成温度 | 0-2 | 热加载 |
| PROMPT_MAX_LENGTH | int | 12000 | 单 prompt 最大字符数 | 1000-100000 | 保存时校验 |
| PROMPT_TOKEN_BUDGET | int | 3000 | 系统提示 token 总预算 | 100-32000 | 渲染时生效 |
| PROMPT_DEFAULT_STATUS | enum | draft | 新建默认状态 | draft/review | 创建时 |
| PROMPT_REQUIRE_REVIEW | bool | false | 是否要求审批后发布 | true/false | 发布时 |
| PROMPT_VARIABLE_STRICT | bool | true | 未声明变量是否报错 | true(报错)/false(留空) | 渲染时 |
| PROMPT_MISSING_VAR_POLICY | enum | warn | 缺变量处理 | `warn`(告警+留空) / `raise`(抛错) / `ignore` | 渲染时 |
| PROMPT_EXPORT_FORMATS | list | yaml,json,md | 导出支持格式 | yaml/json/md/txt | 导出时 |

### 3.2 按 agent 配置（agent.yaml 内）

```yaml
prompt:
  system: "templates/customer_service_system"   # 引用 prompt 资产 slug
  overrides:                                    # 局部覆盖（不修改资产本身）
    temperature: 0.5
    few_shot: ["examples/v1", "examples/v2"]
  inject_at: system_start                      # 注入位置：system_start/system_end
  priority: 100                                 # 多 prompt 冲突时优先级
```

### 3.3 校验规则

- 保存时：名称唯一、长度 ≤ PROMPT_MAX_LENGTH、变量声明完整（未声明但模板中出现 → 提示补声明）、区块 max_tokens 总和 ≤ 预算。
- 发布时：PROMPT_REQUIRE_REVIEW=true 时未审批禁止发布；已发布版本不可直接编辑（编辑=新建版本）。

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 列表页（PromptList 组件）

| 能力 | 说明 | 对应实现 |
|------|------|----------|
| 列表 | 名称/类型/版本/状态/更新时间/属主 | frontend/src/l9_ui/admin/PromptEditor.tsx（列表+编辑一体化） |
| 筛选 | 按类型/状态/标签/属主/关键字 | GET /admin/prompts?type=&status=&tag=&q= |
| 排序 | 更新时间/名称 | 服务端排序参数 |
| 分页 | page/size | GET /admin/prompts?page=&size= |
| 批量操作 | 批量发布/停用/归档/删除 | POST /admin/prompts/batch（待补） |
| 统计 | 各类型数量/使用中数量 | GET /admin/prompts/stats |

### 4.2 编辑器（PromptEditor 主体）

| 能力 | 说明 |
|------|------|
| 元信息表单 | 名称/slug/类型/标签/属主/状态 |
| 正文编辑 | 等宽字体 + 语法高亮 + 行号 + 自动保存（防抖 1s） |
| 变量面板 | 自动扫描 `{var}` 并列出；手动声明（名称/类型/默认值/必填/说明）；点击插入 |
| 区块编辑器 | blocks 可视化排序（拖拽）、每块预算条、必填开关 |
| 示例管理 | few-shot 增删改，input/output 双栏 |
| 实时 Token 计数 | 按 tiktoken 预估，预算条显示占比，超限红色告警 |
| 校验反馈 | 保存前校验错误逐条展示（名称重复/变量缺失/超长） |
| 保存 | 自动生成新版本（version+1）+ change_note 必填 |

### 4.3 辅助功能（用户点名的"自动生成 + 导入模板"等）

| 功能 | 详情 | 后端接口 | 状态 |
|------|------|----------|------|
| AI 生成（7 动作） | ①从需求描述生成 ②优化（重写更清晰）③改写语气 ④多语言翻译 ⑤审查（找漏洞/矛盾/注入风险）⑥生成 few-shot 示例 ⑦逐行解释 | POST /admin/prompts/generate {action, prompt_id?, requirement?, target_lang?} | ✅ |
| 生成前配置 | 选模型/温度/风格（正式/亲切/简洁）/输出语言 | 同上 body 参数 | ✅ |
| 生成结果处理 | 生成结果以**草稿新版本**呈现，不直接覆盖；用户可"应用/放弃/再生成" | 前端状态管理 | ✅ |
| 外部导入（5 通道） | ①文件上传（.yaml/.json/.md/.txt）②URL 抓取 ③模板市场一键导入 ④Git 仓库同步（prompts 目录）⑤跨平台复制粘贴（自动识别格式） | POST /admin/prompts/import {channel, source} | ✅ |
| 导入冲突处理 | slug 已存在 → 提示"覆盖/新建副本/跳过" | 前端交互 + 409 响应 | 🔶 |
| 模板市场 | 分类浏览（角色/行业/任务）× 搜索 × 一键导入 × 点赞数/使用量 | GET /admin/prompts/market, POST /admin/prompts/market/{id}/import | ⬜ |
| 版本管理 | 时间线列表（版本/时间/作者/变更说明）+ 任意两版 diff 高亮 + 一键回滚 + 查看历史内容 | GET /admin/prompts/{id}/versions, GET /admin/prompts/{id}/versions/{v}/diff, POST /admin/prompts/{id}/versions/{v}/rollback | 🔶(后端逻辑有，接口待补) |
| A/B 测试 | 选择两个版本 + 流量比例（如 50/50）→ 运行期按比例分流 → 测试台看效果对比 | POST /admin/prompts/{id}/abtest（待补） | ⬜ |
| 测试台 | 输入测试文本 → 选择 1-4 个模型 → 选择版本 → 试跑 → 输出对比 + token 用量 + 延迟 | POST /chat（复用，带 prompt_version 参数） | ✅ |
| 复制/导出 | 复制 JSON / 导出文件（yaml/json/md） | GET /admin/prompts/{id}/export?format= | ✅ |
| 引用关系图 | 显示哪些 agent.yaml/工作流引用了本 prompt（防误删） | GET /admin/prompts/{id}/references | ⬜ |

### 4.4 操作-接口-组件对照总表

| 操作 | 前端组件 | 后端接口 | 状态 |
|------|----------|----------|------|
| 列表查询 | PromptEditor.tsx | GET /admin/prompts | ✅ |
| 创建 | PromptEditor.tsx | POST /admin/prompts | ✅ |
| 详情 | PromptEditor.tsx | GET /admin/prompts/{id} | ✅ |
| 更新（新版本） | PromptEditor.tsx | PUT /admin/prompts/{id} | ✅ |
| 删除 | PromptEditor.tsx | DELETE /admin/prompts/{id} | ✅ |
| 发布/停用/归档 | PromptEditor.tsx | POST /admin/prompts/{id}/publish 等 | 🔶 |
| AI 生成 | PromptEditor.tsx | POST /admin/prompts/generate | ✅ |
| 导入 | PromptEditor.tsx | POST /admin/prompts/import | ✅ |
| 导出 | PromptEditor.tsx | GET /admin/prompts/{id}/export | ✅ |
| 版本列表/diff/回滚 | PromptEditor.tsx | 见 4.3 | 🔶 |
| 测试台 | PromptEditor.tsx | POST /chat | ✅ |

## 5. 运行时嵌入（真正被调用）

### 5.1 调用链（代码路径可验证）

```
POST /chat (app/l8_api/routes/chat.py)
  └─ ChatService.handle_message(session_id, user_msg)
       └─ prompt_engine.load_for_agent(agent_config)         # app/l4_agent/prompt_engine.py
            ├─ 读 agent.yaml → prompt.system = slug
            ├─ 从 prompts 存储装载资产（db 优先，file 为源）
            ├─ 校验 status == published；否则用 published_version 或报错
            └─ 返回 PromptSpec{role_profile, instructions, blocks, few_shot, output_schema}
       └─ prompt_engine.render(spec, context)                # 渲染管线
            ├─ 1. 变量解析：{role}/{domain}/{date}/{user_name}...
            ├─ 2. 区块拼装：按 blocks.order 排列，逐块应用 max_tokens 预算
            ├─ 3. 动态上下文注入点：{{context:memory}} {{context:rag}} 占位符
            ├─ 4. Token 计量：超预算 → 低优先级区块摘要（见 03-context）
            └─ 返回渲染后的 system_prompt 字符串
       └─ messages = [SystemMessage(system_prompt)] + history + user_msg
       └─ LLMAdapter.complete(messages, tools, temperature, stream=True)
       └─ 响应流式返回前端；消息追加进会话历史（app/l5_memory/）
```

### 5.2 渲染语法（模板语言）

| 语法 | 含义 | 示例 |
|------|------|------|
| `{var}` | 变量替换 | `你是{role}，擅长{domain}` |
| `{{context:rag}}` | 运行时注入检索结果（最大 N token） | `参考资料：\n{{context:rag}}` |
| `{{context:memory}}` | 注入用户长期记忆 | `用户偏好：{{context:memory}}` |
| `{{context:tools}}` | 注入工具使用说明（自动） | 由工具注册中心生成 |
| `[[block:rules]]` | 区块锚点 | `[[block:rules]]\n1. 只回答事实...` |
| `{% if %}` | 条件区块（如仅当启用搜索时注入） | 见模板引擎 |

### 5.3 三种嵌入模式（何时用哪种）

| 模式 | 机制 | 适用 | 实现 |
|------|------|------|------|
| 系统级嵌入 | 渲染进 system message | 角色/规则/全局指令 | 每次请求必执行（5.1 管线） |
| 会话级嵌入 | 会话建立时写入首条消息 | 会话专属指令（GPT 自定义指令同款） | sessions 表存 custom_instructions，渲染时并入 |
| 消息级嵌入 | 单条消息前注入 | 临时指令/翻译要求 | ChatService 检测 `{{指令}}` 前缀 → 追加 user 前缀消息 |

### 5.4 热加载与缓存

- 发布 prompt 后：缓存键 `prompt:{slug}:{published_version}`，发布动作主动失效缓存，**下一请求即生效**（无需重启）。
- 回滚同理：`published_version` 变更 → 缓存失效。
- 性能：渲染管线单次 <5ms（无 LLM 调用），token 计量用 tiktoken 缓存 encoding。

### 5.5 失败降级

| 失败场景 | 降级策略 |
|----------|----------|
| prompt 资产缺失 | 用内置兜底系统提示（"你是通用 AI 助手"）+ 告警日志 |
| 变量缺失（strict=false） | 替换为空串 + 注入系统提示告警 |
| 渲染超预算 | 按优先级丢弃低优先区块（output < tools < rules < role） |
| 存储不可用 | 读 file 源（file+db 双写模式） |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色矩阵 | owner/管理员：全量 CRUD+发布；编辑：创建/编辑/测试（不可删除/发布）；访客：只读+测试 |
| 审计 | 所有写操作（创建/编辑/发布/回滚/删除/导入/导出）写 audit_log：谁/何时/对哪个资产/什么变更/新版本号 |
| 敏感信息 | 提示词内容含密钥时加密存储（字段级加密）；导出文件默认脱敏（`{{SECRET}}` 打码） |
| 注入防护 | AI 生成结果审查（M11）；导入的 prompt 扫描注入模式（`ignore previous instructions` 等） |
| 删除保护 | 被 agent.yaml/工作流引用的 prompt 禁止删除（返回 409 + 引用列表） |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 列表/筛选/分页 | GET /admin/prompts | PromptEditor.tsx | ✅ | — |
| 创建/详情/更新/删除 | POST/GET/PUT/DELETE /admin/prompts(/id) | PromptEditor.tsx | ✅ | — |
| AI 生成 7 动作 | POST /admin/prompts/generate | PromptEditor.tsx | ✅ | — |
| 导入 5 通道 | POST /admin/prompts/import | PromptEditor.tsx | ✅ | — |
| 导出 | GET /admin/prompts/{id}/export | PromptEditor.tsx | ✅ | — |
| 测试台 | POST /chat | PromptEditor.tsx | ✅ | — |
| 版本列表 | GET /admin/prompts/{id}/versions | PromptEditor.tsx | 🔶 | admin.py 补路由 |
| 版本 diff | GET .../versions/{v}/diff | PromptEditor.tsx | 🔶 | 同上 |
| 回滚 | POST .../versions/{v}/rollback | PromptEditor.tsx | 🔶 | 同上 |
| 发布/停用/归档 | POST .../{id}/publish|disable|archive | PromptEditor.tsx | 🔶 | 同上 |
| 模板市场 | GET/POST /admin/prompts/market... | 新组件 PromptMarket.tsx | ⬜ | 后端+前端新建 |
| A/B 测试 | POST .../{id}/abtest | PromptEditor.tsx | ⬜ | 后端分流逻辑 |
| 引用关系图 | GET .../{id}/references | PromptEditor.tsx | ⬜ | 后端聚合查询 |
| 批量操作 | POST /admin/prompts/batch | PromptEditor.tsx | ⬜ | 后端+前端 |

**验证方法**：
1. 管理台创建一个含 `{role}` 变量的 prompt → 发布 → 打开对话页验证角色生效（说明：渲染管线工作）。
2. 修改 prompt 保存（新版本）→ 发布 → 下一条对话立即用新版本（说明：热加载生效）。
3. 删除被引用的 prompt → 应收到 409 + 引用列表（说明：删除保护）。
4. 测试台选两个模型跑同一 prompt → 输出并列对比（说明：测试能力）。
