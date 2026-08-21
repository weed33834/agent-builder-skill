# 深度规格 05：记忆系统（Memory System）

> 模板：docs/deep-spec/00-template.md
> 调研依据：MemGPT/ChatDB 对比（分层向量存储 vs 结构化表）、分层记忆协同架构（短期/长期）、O-Mem 三层记忆（工作记忆/特征提取/长期存储）、智能遗忘机制。
> 核心结论：**记忆必须分层 + 可管理 + 可遗忘**，不能是"永远增长的黑盒"。

## 1. 定位与总体架构

**业务价值**：记忆是智能体"越用越懂你"的根本。记忆系统管住：**写入**（从对话中学到什么）、**存储**（分层放哪）、**检索**（这轮该想起什么）、**管理**（用户可查看/编辑/删除/遗忘）、**遗忘**（隐私合规 + 防记忆膨胀）。

**分层记忆模型（对标人类记忆 + MemGPT）**：

```
┌─ 工作记忆（working）────────────────────────────────┐
│ 当前对话上下文 + 临时任务状态（由 03 上下文管理负责）   │
│ 无持久化，会话结束即散                               │
├─ 情景记忆（episodic）────────────────────────────────┤
│ 对话摘要/事件记录（什么时候和用户聊了什么）            │
│ 载体：会话历史 + 滚动摘要（03 产物）                  │
├─ 语义记忆（semantic）────────────────────────────────┤
│ 从交互中提炼的事实：用户画像/偏好/领域知识             │
│ 载体：记忆条目（结构化 + 向量化）← 本模块核心          │
├─ 程序记忆（procedural）──────────────────────────────┤
│ 学会的技能/工作流/惯例（如"用户喜欢先给结论"）         │
│ 载体：指令资产 + 工作流模板                          │
└─ 知识库（knowledge base）────────────────────────────┤
│ 外部导入的文档/资料（RAG 检索源）                     │
│ 载体：文档集合 + 向量索引                            │
```

**写入管线（对话 → 记忆）**：

```
对话完成/消息间隔
  → MemoryExtractor（LLM 提取，用 summary 类 prompt 资产）
      ├─ 识别候选记忆：用户身份事实 / 明确偏好 / 未完成任务 / 关键决定 / 长期目标
      ├─ 去重：与现有记忆冲突 → 更新 or 忽略
      ├─ 分级：importance 评分（1-10），低于阈值丢弃
      ├─ 结构化为 {type, content, entity, tags, importance}
      └─ 写入 memory_entries（结构化表）+ 向量化（进 vector_store）
  → 按需触发知识库更新（用户上传文档时走导入管线）
```

**检索管线（请求 → 记忆注入）**：

```
每轮请求 ContextManager.assemble（03）
  → MemoryStore.retrieve(user_id, user_query)
      ├─ 向量相似度召回（top_k，带 min_score 过滤）
      ├─ 实体过滤（当前会话涉及的用户/项目实体优先）
      ├─ 时间衰减（旧记忆降权，除非 importance 极高）
      ├─ 去重 + 预算裁剪（CONTEXT_MEMORY_MAX_TOKENS）
      └─ 返回带 `<memory>` 标记的内容 → 03 注入
```

## 2. 资产模型（记忆数据模型）

### 2.1 记忆条目（DB：`memory_entries`）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id | UUID | ✅ | — | 记忆 ID | — |
| user_id | string | ✅ | — | 属主（记忆按用户隔离） | — |
| type | enum | ✅ | fact | 记忆类型 | fact(事实) / preference(偏好) / goal(目标) / task(待办) / decision(决定) / procedure(惯例) / skill(技能) |
| content | string | ✅ | — | 记忆内容（一句话，结构化） | 10-500 字符，须是完整陈述句 |
| entities | list<string> | 否 | [] | 关联实体（人名/项目名/产品） | 用于实体过滤检索 |
| tags | list<string> | 否 | [] | 标签 | 管理界面分类 |
| importance | int | ✅ | 5 | 重要性 1-10 | 提取时自动评分；用户可手动改 |
| confidence | float | 否 | 0.8 | 置信度（是否经过确认） | 0-1；推断的记忆 < 0.7，用户确认后升 |
| source | enum | ✅ | extract | 来源 | extract(自动提取) / manual(手动添加) / import(导入) / confirm(用户确认) |
| source_ref | string | 否 | — | 来源引用（哪条消息/哪个文件） | 消息 ID / 文档 ID |
| status | enum | ✅ | active | 状态 | active / archived / forgotten(已遗忘) |
| created_at / updated_at / last_recalled_at | datetime | ✅ | now | 时间戳（last_recalled_at 供频率统计） | — |
| expires_at | datetime | 否 | null | 过期时间（临时记忆/事件型） | 过期自动转 archived |

### 2.2 知识库文档（DB：`kb_documents`）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id | UUID | ✅ | — | 文档 ID |
| kb_id | FK | ✅ | — | 所属知识库（collection） |
| title | string | ✅ | — | 文档标题 |
| source_type | enum | ✅ | upload | upload / url / git / api / manual |
| source_url | string | 否 | — | 来源地址 |
| content | text | ✅ | — | 正文（或分块后的原文） |
| chunk_count | int | 否 | — | 分块数 |
| status | enum | ✅ | pending | pending / processing / ready / failed / deleted |
| metadata | json | 否 | {} | 自定义元数据（作者/版本/标签） |
| created_by / created_at | — | ✅ | — | 审计 |

### 2.3 知识库（DB：`knowledge_bases`，即 vector collection 的资产化）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id / name | — | ✅ | — | 库名（对应 vector_store collection_name） |
| description | string | 否 | — | 用途说明 |
| embedding_model | string | ✅ | 默认 | 使用的嵌入模型（变更需重建索引） |
| chunk_size / chunk_overlap | int | ✅ | 800/100 | 分块参数 |
| access | enum | ✅ | private | private(指定 agent/user) / team / public |
| allowed_agents | list | 否 | [] | 可使用它的 agent |
| enabled | bool | ✅ | true | 是否参与检索 |
| stats | json | 否 | {} | 文档数/分块数/最后索引时间 |

### 2.4 遗忘机制（不是删除，是"可逆遗忘"）

- **自动遗忘**：expires_at 到期 → archived；记忆条目超过 N 条时按 (importance, recency) 淘汰低价值。
- **用户主动遗忘**：管理界面"遗忘"按钮 → status=forgotten → 从检索中彻底排除（向量标记删除）。
- **批量遗忘**：按实体/类型/时间范围批量遗忘（GDPR 删除请求入口）。
- **可逆性**：forgotten 保留 30 天可恢复；之后物理删除（用户可选择立即物理删除）。

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| MEMORY_ENABLED | bool | true | 记忆总开关 | true/false | 热加载 |
| MEMORY_EXTRACT_ENABLED | bool | true | 自动提取开关 | true/false | 热加载 |
| MEMORY_EXTRACT_MODEL | string | 主模型 | 提取用模型（可用便宜模型） | 模型别名 | 热加载 |
| MEMORY_EXTRACT_INTERVAL | int | 6 | 每 N 条消息触发一次提取 | 2-50 | 热加载 |
| MEMORY_EXTRACT_MIN_IMPORTANCE | int | 4 | 低于此重要性不写入 | 1-9 | 热加载 |
| MEMORY_CONFLICT_POLICY | enum | update | 新旧记忆冲突处理 | update(新替旧)/keep(保留旧)/ask(询问用户) | 热加载 |
| MEMORY_MAX_ENTRIES | int | 2000 | 每人活跃记忆上限 | 100-50000 | 热加载 |
| MEMORY_RETRIEVE_TOP_K | int | 5 | 每轮检索条数 | 1-20 | 热加载 |
| MEMORY_RETRIEVE_MIN_SCORE | float | 0.4 | 检索最低相似度 | 0-1 | 热加载 |
| MEMORY_TIME_DECAY | float | 0.9 | 时间衰减系数（0-1，1=不衰减） | 0.5-1 | 热加载 |
| MEMORY_DECAY_HALFLIFE_DAYS | int | 30 | 衰减半衰期（天） | 1-365 | 热加载 |
| MEMORY_ENTITY_BOOST | float | 1.5 | 实体匹配加权倍数 | 1-3 | 热加载 |
| MEMORY_KB_ENABLED | bool | true | 知识库 RAG 开关 | true/false | 热加载 |
| MEMORY_KB_EMBEDDING_MODEL | string | 默认嵌入 | 嵌入模型 | 模型别名 | 重启 |
| MEMORY_KB_CHUNK_SIZE | int | 800 | 默认分块大小 | 200-4000 | 入库时 |
| MEMORY_KB_CHUNK_OVERLAP | int | 100 | 分块重叠 | 0-500 | 入库时 |
| MEMORY_KB_MAX_DOCS | int | 1000 | 知识库文档上限 | 10-100000 | 入库时 |
| MEMORY_VECTOR_DRIVER | enum | chroma | 向量库驱动 | chroma/faiss/pgvector/milvus/lancedb | 重启 |
| MEMORY_FORGET_RETENTION_DAYS | int | 30 | 遗忘可恢复期 | 0-3650 | 热加载 |
| MEMORY_AUDIT_ENABLED | bool | true | 记忆审计 | true/false | 热加载 |

### 3.2 按 agent 配置（agent.yaml）

```yaml
memory:
  enabled: true
  extract: true                      # 该 agent 是否自动提取记忆
  extract_min_importance: 5          # 更严格
  conflict_policy: ask               # 冲突时问用户
  retrieve:
    top_k: 3
    min_score: 0.5
    time_decay: 0.85
  knowledge_bases: [product-docs]    # 该 agent 可检索的知识库
  shared_memory: false               # 是否与其他 agent 共享记忆（团队场景 true）
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 记忆浏览器（MemoryPanel）——用户明确要求的"管理"

| 能力 | 说明 | 接口 |
|------|------|------|
| 记忆列表 | 按用户/类型/重要性/状态/时间查看全部记忆 | GET /admin/memory?user_id=&type=&q= |
| 查看详情 | 内容/来源/置信度/最近召回时间/引用消息 | GET /admin/memory/{id} |
| 新增记忆 | 手动添加（用户直接告诉 agent"记住…"也可） | POST /admin/memory |
| 编辑记忆 | 改内容/类型/重要性/标签/实体（改后重新向量化） | PUT /admin/memory/{id} |
| 删除/遗忘 | 遗忘（可逆）/物理删除（不可逆，二次确认） | DELETE /admin/memory/{id}、POST .../forget |
| 批量遗忘 | 按实体/类型/时间范围勾选批量操作 | POST /admin/memory/batch |
| 搜索 | 全文+语义搜索记忆库 | GET /admin/memory?q=（向量检索） |
| 冲突查看 | 显示提取时的冲突处理记录 | GET /admin/memory/conflicts |
| 提取预览 | 对一段对话预览会提取出什么记忆（试运行） | POST /admin/memory/preview-extract |

### 4.2 知识库管理（KnowledgeBasePanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 知识库列表 | 库名/文档数/分块数/启用状态/访问范围 | GET /admin/knowledge-bases |
| 创建/编辑库 | 名称/描述/嵌入模型/分块参数/访问范围/绑定 agent | POST/PUT /admin/knowledge-bases |
| 删除库 | 连带删除向量索引（二次确认） | DELETE /admin/knowledge-bases/{id} |
| 文档上传（多通道） | ①文件上传（pdf/docx/md/txt/csv）②URL 抓取 ③Git 仓库 ④API 推送 ⑤手动粘贴 | POST /admin/knowledge-bases/{id}/documents |
| 文档处理状态 | 分块/向量化进度 + 失败重试 | GET /admin/knowledge-bases/{id}/documents |
| 文档删除 | 单文档删除（同步删向量） | DELETE .../documents/{doc_id} |
| 检索测试台 | 输入查询 → 显示命中分块+分数+注入效果（**验证 RAG 真实工作**） | POST /admin/knowledge-bases/{id}/test |
| 重建索引 | 全量重建（换嵌入模型后必须） | POST /admin/knowledge-bases/{id}/rebuild |
| 用量统计 | 文档数/向量数/存储占用/检索次数 | GET /admin/knowledge-bases/stats |

### 4.3 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 记忆导出 | 用户记忆导出（JSON/Markdown，数据可携带权） | 🔶 待补 |
| 记忆导入 | 从导出文件恢复 | 🔶 待补 |
| 隐私报告 | 某用户的全部记忆清单+用途说明（GDPR 数据主体访问请求） | ⬜ 待补 |
| 模板记忆 | 新用户 onboarding 时预置一组常用记忆模板（可勾选） | ⬜ 待补 |
| 记忆可视化 | 实体关系图（谁认识谁、项目与偏好关联） | ⬜ 待补 |
| 对话中管理 | 对话内"记住/忘记这个"指令（GPT 记忆同款交互） | ✅ 指令路由实现 |

## 5. 运行时嵌入（真正被调用）

### 5.1 写入链路（每轮对话的幕后）

```
用户消息处理完（ChatService）
  → 消息计数 % MEMORY_EXTRACT_INTERVAL == 0
      → MemoryExtractor.extract(history_window, user_id)
          ├─ LLM 调用（prompt 资产 type=summary，含提取指令）
          │    输入：最近 N 条消息 → 输出：候选记忆列表 [{type, content, entities, importance}]
          ├─ 冲突检测：与现有 active 记忆比对
          │    ├─ 相同 → 跳过（更新 last_recalled_at 或确认计数）
          │    ├─ 矛盾 → 按 conflict_policy（update/keep/ask）
          │    └─ 新增 → importance ≥ 阈值 → 写入
          ├─ 写入 memory_entries（事务）
          ├─ 向量化：embedding(content) → vector_store 写（带 user_id 过滤字段）
          └─ 审计：写 memory 审计日志
```

### 5.2 检索链路（每轮请求）

```
ContextManager.assemble()（03）→ memory 区块
  → MemoryStore.retrieve(user_id, user_query, agent_cfg)
      ├─ 向量召回：query embedding → top_k×3 候选
      ├─ 实体过滤：query 中实体与 memory.entities 交集加权
      ├─ 时间衰减：score × decay^(age/halflife)（importance 高者减免）
      ├─ 状态过滤：active only（forgotten/archived 排除）
      ├─ 去重 + 预算裁剪：≤ CONTEXT_MEMORY_MAX_TOKENS
      └─ 输出：<memory importance="8">用户偏好：先给结论再给细节</memory>
  → 注入 system 尾部（03 管线 Step 5）
```

### 5.3 对话内指令（用户侧入口）

| 用户说 | 行为 |
|--------|------|
| "记住我叫小明" / "记住我喜欢简洁回复" | 直接写 memory（source=manual，importance=8，status=confirm） |
| "记住：周三前完成报告" | 写 task 类型 + expires_at=下周三 |
| "忘掉关于项目X的记忆" | 批量遗忘（实体=项目X），对话内反馈已遗忘 |
| "你记得我上次说的吗？" | 触发显式检索 + 展示命中记忆（含来源） |

### 5.4 知识库检索（RAG 链路）

```
用户问题 → RAGEngine.search(kb_ids, query, top_k, min_score)
  ├─ 向量召回 → 重排（可选 rerank）→ 按分数截断
  ├─ 注入：<rag_source id="doc-3" score="0.86">…</rag_source>（03-5.5 标注）
  └─ 模型答案可引用来源 → 前端展示引用卡片
```

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| 提取模型不可用 | 跳过本轮提取，下轮重试；不阻塞对话 |
| 向量库不可用 | 退化为关键词检索（SQL LIKE）；再退化 → 仅注入 importance≥8 的条目 |
| 嵌入模型失败 | 知识库不参与检索 + 告警 |
| 检索超时 | 返回空记忆（不阻塞主对话），记录慢查询 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 数据隔离 | 记忆按 user_id 硬隔离（查询条件必带），跨用户不可见；shared_memory 显式开启才共享 |
| 隐私合规 | 遗忘/导出/批量删除全能力（GDPR）；审计谁查看了谁的记忆 |
| 内容脱敏 | 提取时对疑似敏感信息（身份证/卡号）打标降权；导出文件默认脱敏选项 |
| 审计 | 写入/修改/遗忘/导出/查看记录；遗忘操作记录保留（合规证据） |
| 权限 | 管理员：全量；用户：仅自己；agent：仅授权知识库 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 记忆 CRUD | /admin/memory*（GET/POST/PUT/DELETE） | admin/MemoryPanel.tsx | ✅ 已有基础 | 增强：批量/遗忘/详情 |
| 记忆检索测试 | POST /admin/memory/query | MemoryPanel | 🔶 | 向量检索联通 |
| 记忆清空 | POST /admin/memory/clear | MemoryPanel | ✅ | — |
| 知识库 CRUD | /admin/knowledge-bases* | 新组件 KBManager.tsx | 🔶 待补 | 后端+前端 |
| 文档上传/状态/删除 | /admin/knowledge-bases/{id}/documents* | KBManager | 🔶 待补 | 处理管线+前端进度 |
| 检索测试台 | POST .../{id}/test | KBManager | 🔶 待补 | 复用 RAGEngine |
| 重建索引 | POST .../{id}/rebuild | KBManager | ⬜ | 异步任务 |
| 提取预览 | POST /admin/memory/preview-extract | MemoryPanel | ⬜ | 复用 Extractor |
| 隐私报告/导出 | GET /admin/memory/export | MemoryPanel | ⬜ | — |

**验证方法**：
1. 与 agent 对话："我叫小明，喜欢简洁回复" → 继续聊 → 管理台记忆列表出现两条记忆（提取/直写生效）。
2. 换个新会话问"我叫什么？" → 应回答小明（跨会话记忆生效）。
3. 管理台手动遗忘"小明"相关记忆 → 新会话再问 → 应回答不知道（遗忘生效）。
4. 上传一份产品文档到知识库 → 问文档内问题 → 答案带引用卡片（RAG 生效）。
5. 检索测试台输入查询 → 显示命中分块和分数（可验证性）。
