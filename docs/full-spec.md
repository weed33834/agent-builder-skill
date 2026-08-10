# Universal Agent Builder — 全功能规格书（可验证版 / Full Feature Specification）

> **本文件是"验证用规格书"**：对照豆包网页版、ChatGPT、Claude、以及各类 Agent 平台/项目，
> 逐项核对本平台**是否做全**。每一项都写清：
> **是什么（功能定义）→ 怎么做（实现方式）→ 管理界面（增/删/改/调）→ 前端页面 → 后端接口 → 状态（✅ 已实现 / 🔶 部分 / ⬜ 缺失）**
>
> 判定原则（用户明确要求）：
> 1. **描述为主，程序次之**——每项必须"说清楚是什么、怎么操作"，能拿去对照验证。
> 2. **每个层次、每个页面都要有管理功能**：能添加、能删除、能修改、能调整。
> 3. **后端有功能，前端必须有界面，不隐藏**：后端每个接口在前端都要能找到对应操作入口。

---

## 〇、验证方法（怎么用这份文档）

1. **打开对照物**：豆包网页版（doubao.com）、ChatGPT（chatgpt.com）、Claude（claude.ai）、
   或任意 Agent 项目（Dify / Coze / FastGPT / LangGraph Studio / AutoGen Studio…）。
2. **逐页逐项核对**：对照物里有什么页面/按钮/功能 → 在本规格书"页面级功能规格"找对应项 → 打勾。
3. **对照物有、本表没有的** → 那就是缺口，记入"缺口清单"。
4. **本表有、代码没实现的** → 状态标 🔶/⬜，按"怎么做"列补。

---

## 一、对照基准：豆包 / ChatGPT 网页端功能全集（2026-08 检索）

> 来源：online-search 检索豆包/ChatGPT 官方功能资料（2026-08-10）。

### 1.1 豆包网页端（doubao.com / doubao.com/chat）

| # | 豆包功能 | 说明 | 本规格对应 |
|---|---------|------|-----------|
| D1 | 智能问答 | 多领域问答，实时交互 | M3.1 / P0 对话页 |
| D2 | 内容生成与辅助创作 | 写作、续写、润色 | M0.6 / M2 |
| D3 | 图像生成/编辑 | 文生图、本地图片擦除/重绘 | M12.17 / P0 附件 |
| D4 | 联网搜索与网页摘要 | 搜索辅助、浏览摘要 | M4.6 / M12 |
| D5 | 对话管理与分享 | 对话分组、分享、多会话 | P1 会话管理 |
| D6 | 多模态交互 | 截图提问、图片理解 | M1.14 / P0 |
| D7 | 文档处理 | Word/Excel/PPT 在线编辑、翻译保格式 | M0.5 / M5.10 |
| D8 | AI 阅读 | 阅读模式、信息提取 | M0.11 RAG |
| D9 | 语音能力 | 语音播放、实时语音通话、多音色 | M12.16 / P0 语音 |
| D10 | 对话角色/智能体 | 选择角色、自训练智能体 | M0 模板 / P2 Agent 管理 |
| D11 | 定时任务 | 定时执行、智能托管 | M12.7 |
| D12 | AI 编程 | 代码理解/生成 | M0.3 |
| D13 | AI PPT | 一键生成 PPT | M0.5 / M4.12 |
| D14 | 浏览器助手 | 网页总结、截图、翻译 | M12.10 / M4.8 |
| D15 | 收藏夹 | 收藏网页/内容统一管理 | P1 会话收藏 |
| D16 | 视频生成 | 文生视频 | M12.17 扩展 |

### 1.2 ChatGPT 网页端（chatgpt.com）

| # | ChatGPT 功能 | 说明 | 本规格对应 |
|---|-------------|------|-----------|
| G1 | 对话聊天 | 多模型（GPT-4o/5/o 系列） | P0 / M1.7 路由 |
| G2 | Projects（项目） | 按主题分组聊天+文件+指令 | P1 分组 / P3 资产 |
| G3 | Canvas（画布） | 写作/编程协作工作区 | P6 画布（待补） |
| G4 | Search（联网搜索） | 实时搜索+引用 | M4.6 / M12.21 |
| G5 | Memory（记忆） | 跨会话记住偏好，可开关/管理 | M5 / P5 记忆管理 |
| G6 | 自定义 GPTs | 创建/配置/发布自定义助手 | P2 Agent 管理 |
| G7 | 高级语音模式 | 实时语音、打断、情绪感知 | M12.16 / P0 语音 |
| G8 | 文件上传/分析 | 上传文档、数据分析、图表 | M5.10 / M4.12 |
| G9 | 代码解释器 | 沙箱执行代码 | M4.5 / M4.11 |
| G10 | 自定义指令 | 全局/项目级指令 | M2.1 / P10 设置 |
| G11 | 分享与导出 | 分享链接、数据导出 | M8.15 / P1 |
| G12 | 多会话/历史搜索 | 会话列表+搜索历史 | P1 / M8.5 |
| G13 | 团队/工作区 | 组织协作、权限 | M7.15 / P10 IAM |

### 1.3 其他 Agent 项目内部功能（对照参考）

| # | 项目/平台 | 内部功能（管理面） | 本规格对应 |
|---|----------|-------------------|-----------|
| O1 | Dify | 应用编排（聊天流/工作流/Agent）+ 知识库 + 工具 + 变量 + 日志 | P2/P4/P5/P6/P8 |
| O2 | Coze | 智能体创建（人设/技能/知识/记忆/插件/工作流）+ 商店发布 | P2/P4/P5/P6/P7 |
| O3 | LangGraph Studio | 图可视化 + 节点调试 + 状态检查 + checkpoint 管理 | P2 Graph / P8 |
| O4 | AutoGen Studio | Agent 团队构建 + 会话运行 + 结果查看 | P2 / P7 |
| O5 | LangSmith/Langfuse | Trace 查看 + 数据集 + 评测 + 看板 | P8 / P9 |
| O6 | Claude Console | Agent Skills + 工具 + 评估 + 用量 | P3/P4/P8/P9 |

---

## 二、页面级功能规格（可逐页对照验证）

> 组织方式：以"用户能看到的页面"为单位。每个页面列出全部功能项，
> 每项写：**是什么 → 怎么做 → 管理（增/删/改/调）→ 前端组件 → 后端接口 → 状态**。
> 前端组件路径基于 `templates/frontend/src/l9_ui/`，后端接口基于 `templates/backend/app/l8_api/routes/`。

### P0 对话页（对照豆包/GPT 主界面）

> **对话体验全集**：本页仅列基础功能；所有可能出现的交互细节（气泡操作/输入区/附件/搜索/会话/任务/画布等 14 域 800+ 点）见 `docs/deep-spec/15-ux-detail.md`（v2 全量版，可直接当开发清单），验收项见 acceptance-test.md 第 15 部分（20 条）。
> **企业级/组织级通用能力**：平台从单人工具升级为组织级系统所需的全部横向能力（多租户/组织架构/账号生命周期/SSO-MFA/知识库 RAG 资产/审计合规/成本治理/开放平台/发布审核分发/团队协作/分析洞察/系统运维/安全私有化/国际化 13 子域 ≈130 项）见 `docs/deep-spec/16-enterprise-org.md`，验收项见 acceptance-test.md 第 16 部分（30 条）。

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P0.1 | 消息流 | 用户↔AI 对话消息展示 | 消息列表渲染，用户/助手气泡区分 | 调：可清空会话；删：删除会话（P1） | chat/ChatWindow.tsx + MessageBubble.tsx | POST /chat | ✅ |
| P0.2 | 流式输出 | 逐字/逐块渲染回复 | SSE 增量 → 前端追加渲染 | 调：开关流式 | ChatWindow.tsx（streamChat） | POST /chat (stream) | ✅ |
| P0.3 | Markdown/代码渲染 | 富文本 + 代码高亮 | react-markdown + 语法高亮 | 调：渲染主题 | MessageBubble.tsx | — | ✅ |
| P0.4 | 工具调用可视化 | 展示 agent 思考/调工具过程 | 卡片式 tool_call/tool_result | 调：展开/折叠 | chat/ToolCall.tsx | POST /chat（事件流） | ✅ |
| P0.5 | 输入框 | 多行输入/发送 | 回车发送，Shift+Enter 换行 | 调：输入法/自动增高 | chat/ChatInput.tsx | — | ✅ |
| P0.6 | 附件上传 | 上传图片/文档 | 文件选择 → 上传 → 解析入库 | 增：加附件；删：移除附件 | ChatInput.tsx（待补全） | POST /sessions/{id}/files（待补） | 🔶 |
| P0.7 | 语音输入/输出 | 语音对话 | Web Speech / Whisper ASR + TTS 播放 | 调：音色/语速/开关 | chat/VoiceInput.tsx | POST /voice/transcribe、GET /voice/speak、GET /voice/engines | ✅ |
| P0.8 | 会话切换 | 多会话切换 | 侧边栏会话列表 → 加载消息 | 增/删/改：P1 会话管理 | layout/Sidebar.tsx | GET/POST/DELETE /sessions | ✅ |
| P0.9 | 停止生成 | 中断当前回复 | AbortController 中止流 | 调：停止按钮 | ChatWindow.tsx | — | ✅ |
| P0.10 | 重新生成 | 重新生成上一条 | 重发最后一条消息 | 调：重试按钮 | ChatWindow.tsx | POST /chat | ✅ |
| P0.11 | 会话分享/导出 | 分享链接/导出 MD | 生成分享 token / 导出文本 | 增：创建分享；删：撤销 | 待补 | 待补 | 🔶 |
| P0.12 | 模型切换 | 对话中换模型 | 顶部模型选择器 | 调：切换即生效（热加载） | layout/Header.tsx | PUT /config | ✅ |
| P0.13 | 联网搜索开关 | 是否启用搜索工具 | 输入框旁开关 | 调：开/关 | ChatInput.tsx（待补） | POST /chat（带工具） | 🔶 |

### P1 会话管理页（对照豆包/GPT 左侧栏）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P1.1 | 会话列表 | 全部会话展示 | 列表：标题/时间/预览 | 查：列表 | layout/Sidebar.tsx | GET /sessions | ✅ |
| P1.2 | 新建会话 | 创建新对话 | 按钮 → POST | 增：新建 | Sidebar.tsx | POST /sessions | ✅ |
| P1.3 | 删除会话 | 删除对话 | 右键/悬停删除 → DELETE | 删：删除 | Sidebar.tsx | DELETE /sessions/{id} | ✅ |
| P1.4 | 会话重命名 | 修改标题 | 双击编辑 / LLM 自动生成标题 | 改：重命名 | Sidebar.tsx | POST /sessions（update） | 🔶 |
| P1.5 | 会话历史加载 | 查看旧对话 | 点击 → GET messages | 查：历史 | ChatWindow.tsx | GET /sessions/{id}/messages | ✅ |
| P1.6 | 会话分组/项目 | 按主题分组（GPT Projects） | 分组文件夹，可建可移 | 增/删/改：分组管理 | 待补 | 待补 | ⬜ |
| P1.7 | 会话搜索 | 搜索历史会话 | 标题/内容关键词搜索 | 查：搜索 | 待补 | 待补 | ⬜ |
| P1.8 | 会话收藏 | 收藏重要会话（豆包收藏夹） | 收藏/取消收藏 | 增/删：收藏 | 待补 | 待补 | ⬜ |
| P1.9 | 会话导出 | 导出对话为 MD/PDF | 导出按钮 → 下载 | 增：导出 | 待补 | 待补 | ⬜ |

### P2 Agent 管理页（对照 GPTs / 豆包自训练智能体 / Coze 智能体）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P2.1 | Agent 列表 | 全部智能体模板 | 列表：名称/类型/状态 | 查：列表 | admin/AgentGraph.tsx | GET /admin/agents | ✅ |
| P2.2 | 创建 Agent | 新建智能体 | 表单：名称/类型/系统提示/工具/模型 | 增：创建 | AgentGraph.tsx | POST /admin/agents | ✅ |
| P2.3 | 删除 Agent | 删除智能体 | 删除按钮 → DELETE | 删：删除 | AgentGraph.tsx | DELETE /admin/agents/{id} | ✅ |
| P2.4 | 修改 Agent 配置 | 编辑智能体参数 | 表单修改 → 保存 | 改：编辑 | AgentGraph.tsx | POST /admin/agents | ✅ |
| P2.5 | 系统提示配置 | 配置人设/规则 | 链接到 Prompt 资产，编辑器 | 改：编辑 | AgentGraph.tsx | 关联 P3 | ✅ |
| P2.6 | 工具集配置 | 勾选启用工具 | 工具多选框，链接工具资产 | 调：启停 | AgentGraph.tsx | 关联 P4 | ✅ |
| P2.7 | 模型配置 | 选模型/温度/步数 | 下拉选择 + 参数 | 调：调整 | AgentGraph.tsx | 关联 P4 | ✅ |
| P2.8 | 框架选择 | 选运行框架 | 下拉：langgraph/openai-agents/... | 调：切换框架 | AgentGraph.tsx | POST /admin/agents | ✅ |
| P2.9 | 记忆策略配置 | 选记忆模式 | buffer/summary/rag | 调：切换 | AgentGraph.tsx | 关联 P5 | ✅ |
| P2.10 | Graph 可视化 | 看到 agent 拓扑 | SVG 节点-边图 | 调：拖拽连线 | AgentGraph.tsx | POST /admin/agents/graph | ✅ |
| P2.11 | 对话试跑 | 测试 Agent | 内置测试对话面板 | 调：试跑 | AgentGraph.tsx | POST /chat | ✅ |
| P2.12 | AI 生成 Agent | 描述→配置 | "帮我做个写周报的"→yaml | 增：AI 生成草稿 | 待补 | POST /admin/agents/generate（待补） | ⬜ |
| P2.13 | 导入 Agent | 导入 yaml/平台迁移 | 文件导入/平台转换 | 增：导入 | 待补 | POST /admin/agents/import（待补） | ⬜ |
| P2.14 | Agent 发布/灰度 | 发布版本/流量切换 | 发布按钮 → 新版本 | 调：发布 | 待补 | 待补 | ⬜ |
| P2.15 | Agent 模板库 | 从模板创建 | 模板市场浏览/一键复制 | 增：模板创建 | 待补 | 待补 | ⬜ |

### P3 提示词管理页（对照 GPT 自定义指令 / Coze 人设 / Claude Skills）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P3.1 | 提示词列表 | 全部 prompt 资产 | 列表：名称/版本/状态 | 查：列表 | admin/PromptEditor.tsx | GET /admin/prompts | ✅ |
| P3.2 | 创建提示词 | 新建 prompt | 编辑器：名称/类型/内容 | 增：创建 | PromptEditor.tsx | POST /admin/prompts | ✅ |
| P3.3 | 删除提示词 | 删除 prompt | 删除按钮 → DELETE | 删：删除 | PromptEditor.tsx | DELETE /admin/prompts/{id} | ✅ |
| P3.4 | 编辑提示词 | 修改 prompt 内容 | 语法高亮编辑器 + 变量扫描 | 改：编辑 | PromptEditor.tsx | PUT /admin/prompts/{id} | ✅ |
| P3.5 | 变量管理 | 模板变量 {role}{domain} | 自动扫描变量 + 手动声明 | 增/删/改：变量面板 | PromptEditor.tsx | — | ✅ |
| P3.6 | Token 计数 | 长度预算 | 实时 token 统计 + 区块预算条 | 调：预算 | PromptEditor.tsx | — | 🔶 |
| P3.7 | AI 生成 7 动作 | 生成/优化/改写/多语言/审查/few-shot/解释 | 调 AI 接口 → 新版本草稿 | 增：AI 生成 | PromptEditor.tsx | POST /admin/prompts/generate | ✅ |
| P3.8 | 外部导入 5 通道 | 文件/URL/模板市场/Git同步/跨平台 | 统一 Importer | 增：导入 | PromptEditor.tsx | POST /admin/prompts/import | ✅ |
| P3.9 | 版本历史 | 版本列表/diff/回滚 | 每次保存=新版本，可对比回滚 | 改/调：版本操作 | PromptEditor.tsx | 待补（基于文件 git） | 🔶 |
| P3.10 | A/B 测试 | 两个版本按流量分流 | 版本选择器 + 流量比例 | 调：分流比例 | PromptEditor.tsx | 待补 | ⬜ |
| P3.11 | 测试台 | 试跑 prompt | 输入 → 多模型对比 → 指标 | 调：试跑 | PromptEditor.tsx | POST /chat（复用） | ✅ |
| P3.12 | 提示词模板市场 | 内置模板库 | 分类浏览 + 导入 | 增：市场导入 | 待补 | 待补 | ⬜ |

### P4 模型管理页（对照 GPT 模型选择 / 各平台模型设置）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P4.1 | 模型列表 | 已配置模型 | 列表：Provider/模型/状态 | 查：列表 | admin/ModelConfig.tsx | GET /admin/models | ✅ |
| P4.2 | 添加模型 | 新增模型 | 表单：provider/base_url/key/模型名 | 增：添加 | ModelConfig.tsx | POST /admin/models | ✅ |
| P4.3 | 删除模型 | 删除模型 | 删除按钮 → DELETE | 删：删除 | ModelConfig.tsx | 待补（后端缺 DELETE） | 🔶 |
| P4.4 | 修改模型 | 编辑模型参数 | 表单修改 → 保存 | 改：编辑 | ModelConfig.tsx | PUT /admin/models/{id} | ✅ |
| P4.5 | 多 key 轮换 | 多个 key 轮流用 | key 池 + 轮换策略 | 增/删：key 管理 | ModelConfig.tsx | PUT /admin/models/{id} | 🔶 |
| P4.6 | Fallback 链 | 主模型挂自动切换 | 备选列表拖拽排序 | 调：排序 | ModelConfig.tsx | PUT /admin/models/{id} | 🔶 |
| P4.7 | 连通性测试 | ping 模型 | 测试按钮 → POST test | 调：测试 | ModelConfig.tsx | POST /admin/models/test | ✅ |
| P4.8 | 参数配置 | 温度/max_tokens/超时 | 表单配置 | 调：参数 | ModelConfig.tsx | PUT /admin/models/{id} | ✅ |
| P4.9 | 健康状态 | 模型可用性徽章 | 定时 ping + 状态显示 | 查：状态 | ModelConfig.tsx | GET /admin/models | ✅ |

### P5 记忆与知识库管理页（对照 GPT Memory / 豆包记忆 / Dify 知识库）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P5.1 | 记忆策略配置 | 选记忆模式 | buffer/summary/rag/hybrid + 参数 | 调：策略 | admin/MemoryManager.tsx | GET/POST /admin/memory | ✅ |
| P5.2 | 记忆内容查看 | 看已记住什么 | 记忆列表（KV/摘要/向量） | 查：查看 | MemoryManager.tsx | GET /admin/memory | ✅ |
| P5.3 | 记忆清理 | 删除记忆 | 清空/按类型删 | 删：清理 | MemoryManager.tsx | DELETE /admin/memory | ✅ |
| P5.4 | 记忆检索测试 | 测试召回 | query 输入 → Top-K 结果 | 调：测试 | MemoryManager.tsx | POST /admin/memory/query | ✅ |
| P5.5 | 知识库列表 | 全部知识库 | 列表：名称/文档数/状态 | 查：列表 | MemoryManager.tsx | GET /admin/memory | ✅ |
| P5.6 | 知识库文档管理 | 上传/删除文档 | 上传解析 → 分块 → 入库 | 增/删：文档 | MemoryManager.tsx | 待补（文档 CRUD） | 🔶 |
| P5.7 | 分块参数 | chunk_size/overlap | 参数配置 + 预览 | 调：参数 | MemoryManager.tsx | 待补 | ⬜ |
| P5.8 | 嵌入模型选择 | embedding provider | 下拉选择 | 调：选择 | MemoryManager.tsx | 待补 | ⬜ |
| P5.9 | 记忆开关 | 总开关（GPT Memory 开/关） | 设置项切换 | 调：开关 | MemoryManager.tsx | PUT /admin/memory | 🔶 |

### P6 编排与工作流页（对照 Coze 工作流 / LangGraph Studio / Dify）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P6.1 | 工作流列表 | 全部编排配置 | 列表：名称/模式/状态 | 查：列表 | admin/OrchestrationWorkflow.tsx | GET /admin/workflows | ✅ |
| P6.2 | 创建工作流 | 新建编排 | 表单：模式（single/supervisor/...） | 增：创建 | OrchestrationWorkflow.tsx | POST /admin/workflows | ✅ |
| P6.3 | 删除工作流 | 删除编排 | 删除按钮 → DELETE | 删：删除 | OrchestrationWorkflow.tsx | 待补（后端缺 DELETE） | 🔶 |
| P6.4 | 修改工作流 | 编辑编排配置 | 表单修改 → 保存 | 改：编辑 | OrchestrationWorkflow.tsx | POST /admin/workflows | ✅ |
| P6.5 | DAG 可视化 | 工作流拓扑图 | SVG 节点连线 | 调：拖拽 | OrchestrationWorkflow.tsx | POST /admin/workflows | ✅ |
| P6.6 | 节点配置 | 每节点参数 | 点击节点 → 属性面板 | 改：节点配置 | OrchestrationWorkflow.tsx | POST /admin/workflows | ✅ |
| P6.7 | 路由规则表 | 关键词/LLM 路由 | 规则表格：条件→目标 | 增/删/改：规则 | OrchestrationWorkflow.tsx | POST /admin/workflows | 🔶 |
| P6.8 | A2A 连接配置 | 远程 agent 注册 | Agent Card URL → 注册 | 增/删：连接 | OrchestrationWorkflow.tsx | GET/POST /admin/workflows | 🔶 |
| P6.9 | 任务监控 | 实时任务 DAG | 运行中任务状态/耗时 | 查：监控 | 待补 | GET /a2a/tasks、POST /chat | 🔶 |
| P6.10 | 节点暂停/恢复 | HITL 界面化 | 中断/恢复按钮 | 调：暂停恢复 | 待补 | 待补 | ⬜ |

### P7 评估管理页（对照 LangSmith 数据集 / AutoGen Studio 结果）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P7.1 | 数据集列表 | 评估用例集 | 列表：名称/条数 | 查：列表 | admin/EvaluationDashboard.tsx | GET /admin/evaluations | ✅ |
| P7.2 | 新增用例集 | 创建数据集 | 表单：名称/标签 | 增：创建 | EvaluationDashboard.tsx | POST /admin/evaluations | ✅ |
| P7.3 | 用例增删改 | 管理用例条目 | 表格：输入/期望/标准，可增删改 | 增/删/改：用例 | EvaluationDashboard.tsx | POST /admin/evaluations | 🔶 |
| P7.4 | 执行评估 | 跑分 | 选数据集 → run | 调：执行 | EvaluationDashboard.tsx | POST /admin/evaluations/run | ✅ |
| P7.5 | 结果报告 | 总分/分项/失败详情 | 报告视图 | 查：报告 | EvaluationDashboard.tsx | GET /admin/evaluations | ✅ |
| P7.6 | 指标雷达图 | 多维度可视化 | 雷达图/柱状图 | 查：图表 | EvaluationDashboard.tsx | —（前端 mock） | ✅ |
| P7.7 | 回归对比 | 版本分数 diff | 新旧版本对比表 | 查：对比 | EvaluationDashboard.tsx | 待补 | 🔶 |
| P7.8 | AI 生成用例 | 描述→测试用例 | 需求 → 用例集 | 增：AI 生成 | 待补 | POST /admin/evaluations/generate（待补） | ⬜ |
| P7.9 | 质量门禁 | 分数<阈值阻止发布 | CI 检查 + 发布拦截 | 调：阈值 | 待补 | 待补 | ⬜ |
| P7.10 | 人工标注 | 人工评分 | 标注界面 | 改：标注 | 待补 | 待补 | ⬜ |

### P8 监控与告警页（对照 Langfuse / Grafana / 各平台用量页）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P8.1 | 指标看板 | 请求量/延迟/token/成本 | 折线图/指标卡 | 查：看板 | admin/MonitoringPanel.tsx | GET /admin/metrics | ✅ |
| P8.2 | 告警规则列表 | 全部告警规则 | 列表：指标/阈值/渠道 | 查：列表 | MonitoringPanel.tsx | GET /admin/alerts | ✅ |
| P8.3 | 新增告警规则 | 创建规则 | 表单：指标+阈值+渠道 | 增：创建 | MonitoringPanel.tsx | POST /admin/alerts | ✅ |
| P8.4 | 删除告警规则 | 删除规则 | 删除按钮 → DELETE | 删：删除 | MonitoringPanel.tsx | 待补（后端缺 DELETE） | 🔶 |
| P8.5 | 修改告警规则 | 编辑规则 | 表单修改 → 保存 | 改：编辑 | MonitoringPanel.tsx | POST /admin/alerts | ✅ |
| P8.6 | 告警启停 | 启用/静默规则 | 开关切换 | 调：启停 | MonitoringPanel.tsx | POST /admin/alerts | ✅ |
| P8.7 | 通知历史 | 历史告警记录 | 时间线列表 | 查：历史 | MonitoringPanel.tsx | 待补 | 🔶 |
| P8.8 | Trace 查看 | 单请求全链路 | trace_id 搜索 → 瀑布图 | 查：链路 | 待补 | 待补 | ⬜ |
| P8.9 | 日志查看器 | 结构化日志搜索 | level/service/error 过滤 | 查：日志 | 待补 | 待补 | ⬜ |
| P8.10 | 数据漂移检测 | 输入分布对比 | 训练 vs 线上漂移预警 | 查：预警 | 待补 | 待补 | ⬜ |

### P9 权限与用户管理页（对照 GPT 团队 / 平台 IAM）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P9.1 | 用户列表 | 全部用户 | 列表：用户名/角色 | 查：列表 | 待补（admin 骨架有导航位） | GET /admin/security | 🔶 |
| P9.2 | 邀请用户 | 添加用户 | 邀请链接/邮箱 | 增：邀请 | 待补 | POST /admin/security/roles | 🔶 |
| P9.3 | 角色分配 | 改用户角色 | 角色下拉（管理员/开发者/只读） | 改：角色 | 待补 | POST /admin/security/roles | 🔶 |
| P9.4 | API Key 管理 | 生成/吊销 key | key 列表 + 生成/吊销 | 增/删：key | 待补 | 待补 | ⬜ |
| P9.5 | 权限矩阵 | 模块×动作网格 | 网格勾选（查看/编辑/测试/启用/删除） | 改：权限 | 待补 | 待补 | ⬜ |
| P9.6 | 审计日志 | 配置变更记录 | 操作时间线 | 查：审计 | 待补 | 待补 | ⬜ |

### P10 系统设置页（对照各平台设置）

| # | 功能项 | 是什么 | 怎么做 | 管理（增删改调） | 前端组件 | 后端接口 | 状态 |
|---|--------|--------|--------|------------------|---------|---------|------|
| P10.1 | 环境变量编辑 | 可视化改 .env | 表单 + 敏感项加密 | 改：编辑 | admin/SettingsPanel.tsx | GET/PUT /admin/settings | ✅ |
| P10.2 | 部署配置 | Docker/资源/副本 | 参数表单 | 改：配置 | SettingsPanel.tsx | PUT /admin/settings | ✅ |
| P10.3 | 主题切换 | 亮/暗色 | CSS 变量 + 持久化 | 调：主题 | SettingsPanel.tsx | — | ✅ |
| P10.4 | I18N 配置 | 多语言 UI | i18next 语言切换 | 调：语言 | SettingsPanel.tsx | — | 🔶 |
| P10.5 | 权限矩阵入口 | IAM 设置 | 跳转 P9 | 改：权限 | SettingsPanel.tsx | GET /admin/security | 🔶 |
| P10.6 | 框架切换 | 当前框架展示/切换 | 显示当前 + 切换引导 | 调：切换 | SettingsPanel.tsx | PUT /admin/settings | 🔶 |
| P10.7 | 备份/迁移 | 全量导出/导入 | yaml 打包 + 恢复 | 增/删：备份 | 待补 | 待补 | ⬜ |
| P10.8 | 自定义指令（全局） | 全局指令（GPT 同款） | 文本编辑 → 注入所有会话 | 改：编辑 | SettingsPanel.tsx | PUT /admin/settings | 🔶 |

---

## 三、前后端对齐矩阵（后端接口 → 前端界面，确保不隐藏）

> **原则**：后端每个接口，前端必须有对应操作入口。以下为全量盘点（2026-08-10 代码实测）。

### 3.1 业务接口

| 后端接口 | 方法 | 功能 | 前端入口 | 前端组件 | 对齐状态 |
|---------|------|------|---------|---------|---------|
| /api/chat | POST | 对话 | 输入框发送 | chat/ChatWindow.tsx | ✅ |
| /api/chat/reset | POST | 重置会话 | 清空按钮 | ChatWindow.tsx | ✅ |
| /api/sessions | GET/POST | 会话列表/创建 | 侧边栏 | layout/Sidebar.tsx | ✅ |
| /api/sessions/{id} | GET/DELETE | 会话详情/删除 | 点击/删除 | Sidebar.tsx | ✅ |
| /api/sessions/{id}/messages | GET | 历史消息 | 打开会话 | ChatWindow.tsx | ✅ |
| /api/tools | GET | 工具列表 | 管理台工具页 | admin/ToolRegistry.tsx | ✅ |
| /api/tools/{name} | GET | 工具详情 | 点击工具 | ToolRegistry.tsx | ✅ |
| /api/tools/mcp/servers | GET | MCP 服务器列表 | MCP 面板 | ToolRegistry.tsx | ✅ |
| /api/tools/mcp/connect | POST | 连接 MCP | 连接向导 | ToolRegistry.tsx | ✅ |
| /api/tools/mcp/disconnect | POST | 断开 MCP | 断开按钮 | ToolRegistry.tsx | ✅ |
| /api/voice/transcribe | POST | ASR 语音转文字 | 语音按钮 | chat/VoiceInput.tsx | ✅ |
| /api/voice/speak | GET | TTS 文字转语音 | 播放按钮 | VoiceInput.tsx | ✅ |
| /api/voice/engines | GET | 音色列表 | 音色选择 | VoiceInput.tsx | ✅ |
| /api/config | GET/PUT | 配置读取/更新 | 配置面板 | shared/SettingsPanel.tsx | ✅ |
| /.well-known/agent.json | GET | A2A Agent Card | （协议端点） | — | ✅（协议） |
| /api/a2a/rpc | POST | A2A RPC | （协议端点） | — | ✅（协议） |
| /api/a2a/tasks | GET | A2A 任务 | 编排任务监控 | OrchestrationWorkflow.tsx（待补） | 🔶 |
| /api/health | GET | 健康检查 | 部署探活 | — | ✅（运维） |

### 3.2 管理接口（/api/admin/*）

| 后端接口 | 方法 | 功能 | 前端入口 | 前端组件 | 对齐状态 |
|---------|------|------|---------|---------|---------|
| /admin/prompts | GET | 提示词列表 | 管理台-提示词 | admin/PromptEditor.tsx | ✅ |
| /admin/prompts | POST | 创建提示词 | 新建按钮 | PromptEditor.tsx | ✅ |
| /admin/prompts/{id} | PUT | 更新提示词 | 编辑保存 | PromptEditor.tsx | ✅ |
| /admin/prompts/{id} | DELETE | 删除提示词 | 删除按钮 | PromptEditor.tsx | ✅ |
| /admin/prompts/generate | POST | AI 生成提示词 | AI 生成 7 动作 | PromptEditor.tsx | ✅ |
| /admin/prompts/import | POST | 导入提示词 | 导入 5 通道 | PromptEditor.tsx | ✅ |
| /admin/models | GET/POST | 模型列表/添加 | 管理台-模型 | admin/ModelConfig.tsx | ✅ |
| /admin/models/{id} | PUT | 更新模型 | 编辑保存 | ModelConfig.tsx | ✅ |
| /admin/models/test | POST | 连通性测试 | 测试按钮 | ModelConfig.tsx | ✅ |
| /admin/tools | GET/POST | 工具列表/注册 | 管理台-工具 | admin/ToolRegistry.tsx | ✅ |
| /admin/tools/{id} | PUT | 更新工具 | 编辑保存 | ToolRegistry.tsx | ✅ |
| /admin/tools/{id} | DELETE | 删除工具 | 删除按钮 | ToolRegistry.tsx | ✅ |
| /admin/tools/mcp/connect | POST | MCP 连接测试 | 连接向导 | ToolRegistry.tsx | ✅ |
| /admin/memory | GET/POST | 记忆查看/配置 | 管理台-记忆 | admin/MemoryManager.tsx | ✅ |
| /admin/memory/query | POST | 检索测试 | 测试面板 | MemoryManager.tsx | ✅ |
| /admin/memory | DELETE | 清理记忆 | 清理按钮 | MemoryManager.tsx | ✅ |
| /admin/agents | GET/POST | Agent 列表/创建 | 管理台-Agent | admin/AgentGraph.tsx | ✅ |
| /admin/agents/graph | POST | 保存图配置 | 保存按钮 | AgentGraph.tsx | ✅ |
| /admin/agents/{id} | DELETE | 删除 Agent | 删除按钮 | AgentGraph.tsx | ✅ |
| /admin/workflows | GET/POST | 工作流列表/保存 | 管理台-编排 | admin/OrchestrationWorkflow.tsx | ✅ |
| /admin/evaluations | GET/POST | 数据集列表/创建 | 管理台-评估 | admin/EvaluationDashboard.tsx | ✅ |
| /admin/evaluations/run | POST | 执行评估 | 运行按钮 | EvaluationDashboard.tsx | ✅ |
| /admin/metrics | GET | 监控指标 | 管理台-监控 | admin/MonitoringPanel.tsx | ✅ |
| /admin/alerts | GET/POST | 告警列表/创建 | 告警规则表 | MonitoringPanel.tsx | ✅ |
| /admin/settings | GET/PUT | 系统设置 | 管理台-设置 | admin/SettingsPanel.tsx | ✅ |
| /admin/security | GET | 安全信息 | 权限页（导航预留） | AdminSidebar.tsx（页面待补） | 🔶 |
| /admin/security/roles | POST | 角色管理 | 权限页（待补） | 待补 | 🔶 |

### 3.3 对齐结论

- **已对齐 ✅：34 项**（业务 17 + 管理 17）——后端接口均有前端页面入口。
- **部分对齐 🔶：5 项**（a2a 任务监控、security 页面、tools MCP disconnect 详情、memory 文档 CRUD、workflows DELETE）。
- **后端有、前端无 ⬜：0 项**（当前无"隐藏功能"）。

> 维护要求：新增后端路由时必须同步更新本矩阵 + 前端页面，否则视为缺陷。

---

## 四、缺口清单（对照豆包/GPT 网页端与各 Agent 项目）

> 状态：⬜ = 完全缺失，🔶 = 部分实现。按用户要求"该写的都要写完"，以下为当前缺口全集。

### 4.1 页面/交互层缺口（用户可直接感知）

| # | 缺口 | 对标 | 优先级 | 说明 |
|---|------|------|--------|------|
| G1 | 会话分组/项目（Projects） | GPT G2 | 高 | 会话按主题分组，组内共享文件+指令 |
| G2 | 会话搜索 | GPT G12 | 高 | 按标题/内容搜历史会话 |
| G3 | 会话收藏夹 | 豆包 D15 | 中 | 收藏会话/网页 |
| G4 | 会话分享/导出 MD/PDF | GPT G11 | 中 | 分享 token + 导出 |
| G5 | 附件上传（图片/文档） | GPT G8、豆包 D7 | 高 | 上传→解析→入库→对话引用 |
| G6 | Canvas 画布协作 | GPT G3 | 低 | 写作/编程协作工作区 |
| G7 | 工具调用可视化增强 | Claude | 中 | 现有 ToolCall 卡片可升级为步骤时间线 |
| G8 | 联网搜索开关 UI | GPT G4、豆包 D4 | 中 | 输入框旁开关 |
| G9 | 图像生成/编辑 | 豆包 D3 | 中 | 文生图工具 + 图片编辑 |
| G10 | 浏览器自动化界面 | 豆包 D14 | 低 | Playwright 工具的操作面板 |
| G11 | 定时任务管理界面 | 豆包 D11 | 中 | cron 可视化 + 任务列表 |

### 4.2 管理面缺口（每层都要能增删改调）

| # | 缺口 | 当前状态 | 补法 |
|---|------|---------|------|
| M1 | 模型删除端点（DELETE /admin/models/{id}） | 🔶 后端缺 | admin.py 加 DELETE 路由 + 前端删除按钮 |
| M1 | 多 key 轮换池 UI | 🔶 配置字段在，界面待补 | ModelConfig.tsx 加 key 池表格 |
| M1 | Fallback 链拖拽排序 | 🔶 字段在，排序 UI 待补 | ModelConfig.tsx 加排序组件 |
| M2 | 提示词版本 diff/回滚 UI | 🔶 文件 git 有版本，界面待补 | PromptEditor.tsx 加版本 Tab |
| M2 | 提示词 A/B 分流 | ⬜ | 版本字段 + 流量比例配置 |
| M4 | 工具 Schema 可视化（参数表渲染） | 🔶 数据在，渲染待补 | ToolRegistry.tsx 加 SchemaForm |
| M4 | 工具试跑（TestRunner） | 🔶 | 通用 TestRunner 组件 |
| M4 | 工具热加载（拖拽文件注册） | ⬜ | 插件目录扫描 + 拖拽上传 |
| M5 | 知识库文档管理（上传/删除/重解析） | 🔶 | MemoryManager.tsx 加文档 Tab |
| M5 | 分块参数配置 + 预览 | ⬜ | chunk 设置面板 |
| M5 | 嵌入模型选择 | ⬜ | embedding 下拉 |
| M6 | 工作流删除端点（DELETE /admin/workflows/{id}） | 🔶 后端缺 | admin.py 加 DELETE + 前端按钮 |
| M6 | A2A 远端注册表 UI | 🔶 | Agent Card URL 导入表单 |
| M6 | 任务运行监控（DAG 实时状态） | 🔶 | 轮询 /a2a/tasks + 前端 DAG |
| M6 | 节点暂停/恢复（HITL） | ⬜ | interrupt 接口 + 前端按钮 |
| M7 | 多租户（组织/项目隔离） | ⬜ | tenant 贯穿请求→存储→配额 |
| M8 | 移动端适配 | ⬜ | 响应式 CSS |
| M8 | 国际化 i18n 完整 | 🔶 | i18next 全量词条 |
| M9 | 删除告警规则端点（DELETE /admin/alerts/{id}） | 🔶 后端缺 | admin.py 加 DELETE + 前端按钮 |
| M9 | 通知历史记录 | 🔶 | 告警事件存储 + 时间线 UI |
| M10 | Trace 查看器（瀑布图） | ⬜ | trace 存储 + 前端瀑布 |
| M10 | 日志查看器 | ⬜ | 日志检索 API + 前端 |
| M10 | 数据漂移检测 UI | ⬜ | 分布对比图表 |
| M11 | IAM：用户管理页面（列表/邀请/角色） | 🔶 后端有 security 端点 | 前端补 IAM 页面 |
| M11 | API Key 管理（生成/吊销） | ⬜ | key CRUD + 前端 |
| M11 | 权限矩阵网格 | ⬜ | 模块×动作勾选 |
| M11 | 审计日志界面 | ⬜ | 操作记录 API + 前端 |
| M12 | AI 生成 Agent（描述→yaml） | ⬜ | 生成端点 + 前端按钮 |
| M12 | Agent 导入（yaml/平台迁移） | ⬜ | 导入端点 + 前端 |
| M12 | Agent 发布/灰度 | ⬜ | 版本发布 + 流量切换 |
| M12 | 模板市场（内置模板浏览） | ⬜ | 模板库 + 前端 |
| M13 | 备份/迁移（全量导出导入） | ⬜ | 配置包打包/恢复 |

### 4.3 补齐优先级路线

| 阶段 | 内容 |
|------|------|
| **第一批（高）** | G1 会话分组、G2 会话搜索、G5 附件上传、M1 模型 DELETE+key 池、M2 版本 diff UI、M4 Schema 可视化+试跑、M5 文档管理、M6 workflow DELETE+A2A 注册表、M9 alerts DELETE |
| **第二批（中）** | G3 收藏、G4 分享导出、G8 搜索开关、G9 图像、G11 定时任务 UI、M8 移动端+i18n、M10 Trace/日志查看器、M11 IAM 页面、M12 AI 生成 Agent+导入 |
| **第三批（低）** | G6 Canvas、G10 浏览器自动化 UI、M5 分块预览、M6 节点暂停恢复、M7 多租户、M13 备份迁移 |

---

## 五、对照验证结论（2026-08-10）

### 5.1 与豆包网页端对照

| 豆包功能 | 本平台状态 |
|---------|-----------|
| 智能问答 D1 | ✅ 对话页 + Agent 运行时 |
| 内容生成 D2 | ✅ 写作型模板 + 提示工程 |
| 图像生成/编辑 D3 | 🔶 工具层可接，无界面入口 |
| 联网搜索 D4 | ✅ 搜索工具 + 路由 |
| 对话管理分享 D5 | 🔶 多会话✅，分享待补 |
| 多模态 D6 | ✅ 多模态输入适配 |
| 文档处理 D7 | 🔶 解析库有，在线编辑无 |
| AI 阅读 D8 | ✅ RAG 知识库 |
| 语音 D9 | ✅ 完整 ASR/TTS 链路 |
| 对话角色/智能体 D10 | ✅ Agent 模板 + 管理页 |
| 定时任务 D11 | ✅ scheduler.py，管理 UI 待补 |
| AI 编程 D12 | ✅ coding 模板 |
| AI PPT D13 | 🔶 数据分析模板 + 图表工具 |
| 浏览器助手 D14 | 🔶 工具可接，界面待补 |
| 收藏夹 D15 | ⬜ 待补 |
| 视频生成 D16 | ⬜ 工具可接，无界面 |

### 5.2 与 ChatGPT 网页端对照

| ChatGPT 功能 | 本平台状态 |
|-------------|-----------|
| 对话 G1 | ✅ |
| Projects G2 | ⬜ 会话分组待补 |
| Canvas G3 | ⬜ |
| Search G4 | ✅ 搜索工具 |
| Memory G5 | ✅ 记忆全套 + 管理页 |
| 自定义 GPTs G6 | ✅ Agent 管理页 |
| 高级语音 G7 | ✅ 语音链路（实时对话增强待补） |
| 文件上传分析 G8 | 🔶 上传待补 |
| 代码解释器 G9 | ✅ 沙箱工具 |
| 自定义指令 G10 | ✅ 系统提示模板 |
| 分享导出 G11 | 🔶 分享待补 |
| 多会话/历史 G12 | ✅ 会话管理（搜索待补） |
| 团队/工作区 G13 | 🔶 IAM 后端有，前端待补 |

### 5.3 总体结论

- **能力层（M1-M6）**：基本齐全（✅ 90%），缺口集中在管理界面而非核心逻辑。
- **工程层（M7-M9）**：API 层齐全，缺 3 个 DELETE 端点 + 运维 UI。
- **质量层（M10-M13）**：后端逻辑有（evaluate/monitoring/alerting/compliance），**前端管理界面缺口最大**（Trace/日志/漂移/审计）。
- **交互层（P0-P10）**：对话与 8 大管理页已落地；会话分组/搜索/附件上传/分享导出是首要补齐项。

> **结论：本平台"能跑"（后端能力齐全），"可管理"（8 大管理页已建）；按用户标准，还需补齐 4.2 节缺口（重点是 DELETE 端点、版本/试跑 UI、IAM 页面、会话高级功能），才能达到"每个层次、每个页面都能增删改调、前后端不隐藏"的完整标准。**

---

## 六、附录：本规格与 feature-checklist 的关系

| 文档 | 定位 |
|------|------|
| docs/feature-checklist.md | M0-M13 技术层完整性清单（256+ 项，按"生成物"组织） |
| docs/full-spec.md（本文件） | **页面级可验证规格**（P0-P10 + 前后端对齐矩阵 + 缺口清单，按"用户视角"组织） |
| docs/admin-console-design.md | 管理控制台深度设计（布局/控制/AI 生成/外部导入） |
| docs/framework-selection.md | 多框架选型（不默认绑定） |

> 验证流程：先看本文件的 P0-P10 逐页对照 → 再翻 feature-checklist 的技术层 → 缺口按 4.2 补。

---
