# 深度规格 15：对话体验细节（UX Detail）

> 模板：docs/deep-spec/00-template.md
> 定位：**别人都有的基础功能，我们不但要有，还要细化到每个点**。对话界面不是"能聊就行"——气泡、联网搜索、附件上传、输入区、会话管理、任务卡，每一处交互都是产品的脸面。本规格把对话体验逐点写全：每个 UI 元素=功能说明+交互细节+后端接口。

## 1. 定位与总体架构

**业务价值**：用户每天面对的就是这个界面。聊天气泡的细节（流式、复制、重新生成）、联网搜索的引用（来源可点）、附件的处理（拖拽即传）——这些"基础功能"决定用户觉得"这产品是正经的"还是"玩具"。

**对话体验层架构**：

```
┌─ 会话工作区（Workspace，类 WorkBuddy/Projects）──────────────┐
│  ├─ 左侧能力库侧栏：Claw/专家/技能/探索/连接器/资料库/自动化      │
│  ├─ 会话列表：分组/搜索/固定/归档/成本显示                       │
│  └─ 主对话区：                                               │
│      ├─ 消息流（气泡：文本/代码/工具卡/引用/图片/语音）          │
│      ├─ 输入区（多行/上传/搜索开关/模式切换/语音/@提及/斜杠命令） │
│      └─ 任务卡（对话即任务：进度/日志/结果/审批）               │
└──────────────────────────────────────────────────────────────┘
```

**四个交互核心**：气泡（怎么展示）、输入（怎么发）、搜索（怎么查）、上传（怎么传）。外加会话管理（怎么组织）、任务卡（怎么追溯）。

## 2. 资产模型

### 2.1 消息（DB：`messages`）

| 字段 | 说明 |
|------|------|
| id / session_id / role | 消息标识（user/assistant/tool/system） |
| content | 文本内容（markdown 源） |
| content_type | text / image / audio / file / tool_call / thinking |
| status | streaming / completed / failed / stopped / regenerating |
| tokens_in / tokens_out / cost | 该条消息成本（CC9 会话成本显示的数据源） |
| parent_id | 分叉/重新生成时的父消息（fork 链路） |
| attachments | 附件引用 [{file_id, name, type, preview_url}] |
| citations | 联网搜索引用 [{source_title, url, snippet}] |
| tool_cards | 工具调用卡片 [{tool, args_summary, result_summary, status}] |
| error | 失败信息（脱敏） |
| created_at | 时间 |

### 2.2 会话（DB：`sessions`）

| 字段 | 说明 |
|------|------|
| id / title / agent_id | 会话标识/标题（可自动生成）/绑定 agent |
| workspace_id | 所属工作空间（G1 项目工作空间） |
| folder_id / tags | 分组/标签（会话分组搜索） |
| pinned / archived | 固定/归档 |
| mode | 自主程度模式：craft / plan / ask（W1） |
| model_alias | 会话级模型选择（覆盖 agent 默认） |
| web_search_enabled | 联网搜索开关（会话级） |
| total_cost / total_tokens | 累计成本（CC9） |
| fork_of | 分叉来源会话（CC2） |
| context_compact_log | 压缩记录（CC4 手动压缩历史） |

### 2.3 工作空间（DB：`workspaces`，G1/Projects + W7 任务卡）

| 字段 | 说明 |
|------|------|
| id / name / color | 工作空间标识/名称/颜色（类 Projects） |
| description | 项目说明（作为项目级指令上下文） |
| instructions | 项目指令（agents.md 项目宪法，C7） |
| members | 成员（团队空间，WorkBuddy 协同） |
| agent_refs | 关联 agent 列表 |

### 2.4 附件（DB：`attachments`）

| 字段 | 说明 |
|------|------|
| id / file_name / file_size / mime | 附件标识 |
| storage_path | 存储路径 |
| parse_status | pending / parsing / done / failed（解析为文本/OCR） |
| parsed_text / parsed_chunks | 解析结果（进上下文/RAG） |
| preview | 预览地址（图片/PDF/文档） |
| uploader / created_at / expires_at | 上传者/时间/保留期 |

## 3. 配置项全清单（怎么配置）

### 3.1 对话体验全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| UX_WEB_SEARCH_ENABLED | bool | true | 联网搜索总开关 | true/false | 热加载 |
| UX_WEB_SEARCH_AUTO | bool | true | 自动触发（问句/时效性检测） | true/false | 热加载 |
| UX_WEB_SEARCH_MAX_CITATIONS | int | 5 | 单条回复最大引用数 | 1-20 | 热加载 |
| UX_ATTACH_ENABLED | bool | true | 附件上传开关 | true/false | 热加载 |
| UX_ATTACH_MAX_SIZE_MB | int | 50 | 单附件大小上限 | 1-1024 | 热加载 |
| UX_ATTACH_MAX_COUNT | int | 10 | 单次最多附件数 | 1-50 | 热加载 |
| UX_ATTACH_ALLOWED_TYPES | list | [图片, pdf, docx, xlsx, pptx, txt, md, csv, 音频] | 允许类型 | — | 热加载 |
| UX_ATTACH_RETENTION_DAYS | int | 30 | 附件保留期 | 1-365 | 热加载 |
| UX_MODE_DEFAULT | enum | craft | 默认自主程度 | craft/plan/ask | 热加载 |
| UX_MODE_ALLOW_SWITCH | bool | true | 允许用户在对话中切换模式 | true/false | 热加载 |
| UX_STREAM_ENABLED | bool | true | 流式输出 | true/false | 热加载 |
| UX_THINKING_DISPLAY | enum | auto | 思考过程展示 | auto(自动)/always/never | 热加载 |
| UX_SESSION_TITLE_AUTO | bool | true | 自动生成会话标题 | true/false | 热加载 |
| UX_COST_DISPLAY | bool | true | 会话成本显示 | true/false | 热加载 |
| UX_FORK_ENABLED | bool | true | 会话分叉 | true/false | 热加载 |
| UX_BTW_ENABLED | bool | true | 侧边问题（不污染主线） | true/false | 热加载 |

### 3.2 前端展示配置（每会话可调）

| 项 | 选项 | 说明 |
|----|------|------|
| 回复风格 | 简洁/标准/详细 | 影响输出长度引导 |
| 代码显示 | 亮/暗主题、字号 | 代码块渲染 |
| 引用显示 | 角标/底部列表/悬浮预览 | 搜索引用呈现方式 |
| 打字机速度 | 快/中/慢/即时 | 流式渲染 |

## 4. 管理界面与前端组件（逐点细节）

### 4.1 消息气泡（MessageBubble）——逐点细节

| 细节点 | 交互说明 | 接口/实现 |
|--------|----------|-----------|
| Markdown 渲染 | 标题/列表/表格/引用/链接/行内代码/数学公式 | 前端渲染（marked+highlight.js+KaTeX） |
| 代码块 | 高亮+语言标签+复制按钮+展开/全屏 | 前端组件 |
| 流式打字 | 增量渲染，光标跟随，可停止 | SSE / WS 对接 AgentRuntime.stream |
| 思考过程 | 可折叠"思考"块（类 o1），默认折叠 | thinking 消息类型 |
| 工具调用卡 | 工具名/参数摘要/结果摘要/耗时/状态（成功/失败），点击展开详情 | tool_cards 字段 |
| 引用角标 | 搜索来源编号 [1][2]，悬浮预览摘要，点击跳转 | citations 字段 |
| 消息操作条 | 复制/重新生成/编辑（改后重发）/点赞/点踩/分享 | POST /api/chat/{id}/regenerate、/feedback |
| 停止生成 | 流式中显示停止按钮，点击即止 | abort 通道 |
| 失败态 | 红色错误卡片+重试按钮（失败原因脱敏） | error 字段 |
| 图片/语音渲染 | 图片内联预览、语音可播放 | content_type |
| 自动滚动 | 新内容到达自动滚底；用户上翻暂停 | 前端逻辑 |
| 虚拟滚动 | 长会话不卡顿（万条消息） | 前端逻辑 |
| 骨架屏 | 首条消息加载中占位 | 前端逻辑 |
| 时间分隔 | 会话内按天分隔线 | 前端逻辑 |

### 4.2 输入区（Composer）——逐点细节

| 细节点 | 交互说明 |
|--------|----------|
| 多行输入 | Enter 发送 / Shift+Enter 换行 / 自动高度扩展 |
| 附件按钮 | 打开上传（见 4.4） |
| 搜索开关 | 本消息是否联网搜索（灯泡/地球图标，自动模式下可手动关） |
| 模式切换 | Craft/Plan/Ask 三态选择器（W1），切换后立即生效 |
| 模型选择 | 会话级模型下拉（Auto/自定义，W11） |
| 语音按钮 | 按住说话/点击录音，转文字进输入框（08 联动） |
| @ 提及 | @agent / @工具 / @文件，插入引用 |
| 斜杠命令 | /help /clear /cost /export /fork 等（CC2/CC9） |
| 发送中状态 | 发送中禁用+转圈 |
| 草稿保存 | 未发送内容自动存草稿（刷新不丢） |
| 快捷键 | Ctrl+Enter 发送、Ctrl+K 搜索会话、Ctrl+N 新会话 |

### 4.3 联网搜索（WebSearch）——逐点细节

| 细节点 | 说明 | 接口 |
|--------|------|------|
| 自动触发 | 检测问句/时效性词（"最新/今天/多少"）自动开启 | 前端+后端判定 |
| 手动触发 | 输入区开关/斜杠命令 /search | — |
| 搜索过程可视化 | 流式显示"🔍 正在搜索：关键词… 找到 N 个来源" | 事件流 |
| 来源引用 | 正文 [1][2] 角标 → 底部来源列表（标题+URL+摘要）→ 点击新窗口打开 | citations |
| 无结果声明 | 明确"未找到相关结果，以下为基于已有知识的回答" | 后端返回 |
| 搜索质量 | 多来源交叉、优先权威站点、去重 | online-search 后端 |
| 引用可点击跳转 | 每条引用真实可点（不是装饰） | 前端 |

### 4.4 附件上传（Attachment）——逐点细节

| 细节点 | 说明 | 接口 |
|--------|------|------|
| 拖拽/粘贴/选择 | 拖文件到输入区、Ctrl+V 粘贴图片、点击选择 | POST /api/attachments（分片） |
| 上传进度 | 进度条/百分比，失败重试 | 前端 |
| 类型限制 | 白名单校验+超限提示（前端先拦，后端再验） | 配置 3.1 |
| 大小限制 | 超 MB 提示（前端+后端双重） | 配置 3.1 |
| 多附件 | 一次多个，列表预览（缩略图），可删除 | — |
| 解析管道 | pdf/word/excel/ppt → 文本；图片 → OCR/多模态描述；音频 → 转写（08） | 后端任务 |
| 解析状态 | 上传后显示"解析中…/完成/失败"，失败可重新解析 | GET /api/attachments/{id} |
| 引用附件 | 对话中 @文件名 引用，附件内容注入上下文 | — |
| 保留期 | 过期自动清理（配置 3.1） | 定时任务（09 联动） |
| 安全扫描 | 病毒/敏感内容扫描后入库 | 13-iam 联动 |

### 4.5 会话管理（SessionManager）——逐点细节

| 能力 | 说明 | 接口 |
|------|------|------|
| 会话列表 | 按时间/分组展示，标题自动生成 | GET /api/sessions |
| 分组/文件夹 | 自定义分组、拖拽归组 | PUT /api/sessions/{id}/folder |
| 搜索 | 会话内/跨会话关键词搜索（含消息内容） | GET /api/sessions?q= |
| 重命名/固定/归档 | 手动改名/置顶/归档隐藏 | PUT /api/sessions/{id} |
| 导出 | 导出为 Markdown/PDF/JSON | GET /api/sessions/{id}/export |
| 分享 | 生成只读分享链接（可设过期） | POST /api/sessions/{id}/share |
| 成本显示 | 列表每条会话显示累计 token/费用 | sessions.total_cost |
| 分叉 fork | 右键会话"分叉"→ 复制一份独立演进（CC2） | POST /api/sessions/{id}/fork |
| 侧边问题 btw | 临时小窗提问，不进主上下文（CC3） | POST /api/sessions/{id}/btw |
| 压缩记录 | 手动压缩入口+历史（CC4） | POST /api/sessions/{id}/compact |

### 4.6 工作空间与任务卡（Workspace & TaskCard，G1/W7）

| 能力 | 说明 | 接口 |
|------|------|------|
| 工作空间 | 项目容器：会话+附件+项目指令集中（类 Projects），颜色标识 | /api/workspaces CRUD |
| 项目指令 | 每空间可配 instructions（agents.md 项目宪法，C7），自动注入上下文 | PUT /api/workspaces/{id} |
| 任务卡 | 对话即任务：顶部任务卡显示状态（规划中/执行中/等待审批/完成/失败）+ 进度 + 步骤日志 + 最终结果 | 任务事件流 |
| 任务追溯 | 点开任务卡看完整执行链路（规划→工具调用→产出，跳 12 trace） | GET /api/tasks/{id} |
| 远端审批 | 任务等待审批时生成审批卡片，手机 H5/桌面均可批（C6） | 13-iam 联动 |
| 远程指挥 | 桌面端运行中的任务可从手机/网页查看、接管（W9/CC7） | WS 通道 |

### 4.7 能力库侧栏（SkillSidebar，W2）

| 入口 | 说明 |
|------|------|
| Claw/专家 | 专家市场：领域专家卡片（数据分析/文案/客服…），选中即用（W3） |
| 技能 | 已装技能列表，点选即启用（10 联动） |
| 探索 | 技能市场入口（W4，10-skill-plugin 联动） |
| 连接器 | 已连接外部应用（腾讯文档/邮箱/钉钉…），授权状态（W5） |
| 资料库 | 私有知识库入口，选择注入检索（05 联动） |
| 自动化 | 定时任务/触发器入口（09 联动） |

## 5. 运行时嵌入（真实调用链路）

### 5.1 发送消息全链路（含搜索+附件+模式）

```
用户输入（含附件/@引用/模式选择/搜索开关）
  → 1. 前端组装 payload：{text, attachments, mode, web_search, model_alias}
  → 2. 上传附件（未传完的）→ 等待解析完成（解析中可先发文本）
  → 3. POST /api/chat（SSE 建立）
  → 4. 后端：模式解析
        ├─ ask → 直接回答（不调工具/不改状态）
        ├─ craft → 直接执行（工具自主调用）
        └─ plan → 先出方案卡片 → 用户确认 → 执行
  → 5. web_search=true → 联网搜索 → 结果注入（带 citations）
  → 6. 附件解析文本注入上下文
  → 7. AgentRuntime 执行（工具调用→tool_cards 事件流推送）
  → 8. 前端流式渲染：思考块→工具卡→正文（打字机）→引用角标
  → 9. 完成：消息落库（含 tokens/cost）→ 会话成本更新 → 任务卡标"完成"
```

### 5.2 停止/重新生成/编辑链路

```
停止：前端发 abort → SSE 中断 → 半截消息标记 status=stopped
重新生成：POST regenerate → 新消息 parent_id=原消息 → 重跑（保留原消息对比）
编辑：改文本 → 重发 → 原消息标记 edited，新链路 parent_id 指向（类 fork 语义）
```

### 5.3 会话分叉链路（CC2）

```
右键分叉 → POST /api/sessions/{id}/fork
  → 复制消息链（fork_of=原会话）→ 新会话独立
  → 后续修改互不影响（对比方案的典型用法）
```

### 5.4 侧边问题链路（CC3）

```
btw 输入框 → POST /api/sessions/{id}/btw
  → 独立小上下文（只带当前消息摘要）→ 回答展示在侧边小窗
  → 不写入主消息流（不污染主线 token）
```

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| 联网搜索不可用 | 关闭自动触发，回复注明"搜索服务暂不可用，基于已有知识回答" |
| 附件解析失败 | 提示重新解析；无法解析的文件仍可发送（原样给模型） |
| 流式断开 | 重连续传（last_event_id）；失败则整条重试 |
| 语音服务不可用 | 输入区语音按钮置灰，文字输入不受影响 |
| 任务卡事件丢失 | 前端轮询补拉任务状态（GET /api/tasks/{id}） |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 附件 | 类型/大小白名单（前后端双重校验）；病毒扫描；保留期强制清理 |
| 分享 | 只读链接+过期+可吊销；不含敏感消息（可配置过滤） |
| 引用 | 搜索结果仅取正文摘要（不整页抓取）；外链跳转加安全提示 |
| 成本显示 | 管理员可关（UX_COST_DISPLAY）；成本数据脱敏粒度到会话 |
| 侧边问题 | btw 上下文不落主库（临时性）；权限同主会话 |
| 工作空间 | 成员制（团队空间）；私有空间仅 owner |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 消息流式渲染 | /api/chat（SSE） | chat/ChatView.tsx（已有） | 🔶 | 打字机/思考折叠/工具卡 |
| 消息操作（复制/重发/编辑/反馈） | /api/chat/{id}/regenerate、/feedback | MessageBubble | 🔶 | 编辑重发链路 |
| 联网搜索+引用 | /api/search（online-search 后端） | WebSearchIndicator | 🔶 | 引用角标渲染 |
| 附件上传/解析 | /api/attachments | AttachmentUploader | 🔶 | 解析管道 |
| 会话分组/搜索/导出/分享 | /api/sessions* | SessionManager | 🔶 | 分组/分享 |
| 会话成本显示 | sessions.total_cost | SessionManager | 🔶 | 埋点聚合 |
| 分叉/侧边问题/压缩 | /api/sessions/{id}/fork|btw|compact | 前端入口 | ⬜ | 新功能 |
| 工作空间 | /api/workspaces* | WorkspacePanel | ⬜ | 新功能 |
| 任务卡 | /api/tasks* | TaskCard | ⬜ | 任务事件流 |
| 远端审批/远程指挥 | WS + 审批接口 | MobileApproveCard | ⬜ | 移动 H5 |
| 能力库侧栏 | /api/experts、/api/connectors | SkillSidebar | ⬜ | 专家/连接器市场 |

**验证方法**：
1. 发一条带代码的复杂消息 → 流式渲染、代码高亮、可复制、思考块可折叠（气泡细节通）。
2. 问"今天上海天气" → 自动触发搜索 → 回复带 [1][2] 引用 → 点击可跳转（搜索通）。
3. 拖入 PDF+图片 → 解析完成 → 引用该附件提问 → 回答引用了解析内容（上传通）。
4. 长对话中发 btw 问题 → 侧边小窗回答 → 主消息流不增加该条（侧边问题通）。
5. 会话右键分叉 → 两条独立演进互不影响（分叉通）。
6. 发起 Plan 模式任务 → 出方案卡 → 确认后执行 → 任务卡显示进度与结果（模式+任务卡通）。
