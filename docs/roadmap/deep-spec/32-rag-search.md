# 32 RAG 检索增强（Retrieval-Augmented Generation & Search）

> 定位：Agent 平台的"外部知识接入中枢"——把文档、网页、表格、音视频变成可检索的知识资产，用 查询分类→分块→嵌入→混合检索→重排→重打包→生成 的完整管线让 LLM 基于事实回答。与 03-context（上下文注入预算）、16-D（企业知识库治理）、20-底层（BM25+向量 RRF）、29-互操作（MCP 检索工具）互补：本篇聚焦"检索工程本身"——从 Naive RAG 到 GraphRAG 的每一层怎么做、怎么配、怎么管、怎么验证。
> 来源：RAG 最佳实践（查询分类/分块/嵌入模型/元数据/向量库/检索/重排/重打包/摘要/生成器微调十环节）/ Naive→Advanced→Modular RAG 演进 / LongRAG（长文本单元）、Self-RAG（自反思检索）、GraphRAG（知识图谱检索）选型 / 混合检索 BM25+向量+RRF / 重排模型（cross-encoder）工程落地 / 引用溯源（citation）与防幻觉。

---

## 一、定位与架构

- 核心价值：解决 LLM 知识截止、幻觉、领域知识缺失三大问题；让答案"有据可依、可点引用"
- 检索管线（Modular RAG 全景）：查询理解 → 查询改写/扩展 → 多路召回（向量+BM25+知识图谱）→ 融合（RRF）→ 重排（rerank）→ 重打包（压缩/去重/截断）→ 生成（带引用）
- 检索演进分级：Naive RAG（embedding→top-k→生成，够用但召回糙）→ Advanced RAG（查询改写/混合检索/重排/元数据过滤）→ Modular RAG（可插拔检索模块，本篇默认形态）
- 检索形态选型：标准向量检索（通用文档）/ LongRAG（长文档，整章为单元减少切碎损失）/ Self-RAG（检索-反思循环，按需检索+自我批判，适合开放问答）/ GraphRAG（实体关系图谱，适合多跳关系问答与全局概览）
- 系统位置：知识库文档入库（16-D）→ 本模块分块/嵌入/索引 → 对话请求触发检索（03-context 组装注入）→ 生成 → 引用回显（15-ux-detail 引用角标）
- 与相邻模块边界：03-context 管"注入多少 token"，本篇管"检索什么、怎么检索得准"；16-D 管"企业知识库权限与治理"，本篇管"检索算法与配置"；20-底层 提供 TF-IDF/BM25 原语，本篇是其完整编排层

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| KnowledgeSource | source_id / name / type(doc|web|table|audio|video|api) / connector_ref / sync_schedule / status / owner / permission_scope |
| ChunkConfig | chunk_id / source_ref / strategy(fixed|semantic|recursive|sentence_window|parent_child) / size / overlap / separators[] / metadata_rules |
| EmbeddingModel | emb_id / provider / model_name / dims / max_tokens / cost_per_1m / status / quota_ref |
| IndexSet | index_id / source_ref / emb_model_ref / index_type(vector|bm25|hybrid|graph) / store_ref / stats(tokens|chunks|docs) / version / status |
| RetrievalPipeline | pipe_id / name / stages[](query_rewrite|recall|fusion|rerank|repack) / config_json / status / owner |
| RecallResult | recall_id / query / candidates[](doc_id|chunk_id|score|source) / fusion_scores / rerank_scores / final_topk / latency / trace_id |
| CitationRef | citation_id / message_id / chunk_id / doc_id / page / snippet / status(valid|stale|removed) / verify_time |
| RagEvalRun | eval_id / pipe_ref / dataset_ref / metrics(hit_rate|mrr|nDCG|faithfulness|answer_relevancy|context_precision) / report_ref |

生命周期：KnowledgeSource 创建（连接器导入）→ ChunkConfig 分块 → 嵌入/索引 → RetrievalPipeline 发布（灰度切换）→ 线上检索（RecallResult + CitationRef）→ 定期重索引（版本化）→ 停用归档

## 三、配置项全清单

- rag.enabled（总开关）、rag.default_pipeline（默认管线 ID）
- rag.chunk.strategy（fixed|semantic|recursive|sentence_window|parent_child，默认 recursive）
- rag.chunk.size（分块大小 tokens，默认 512）、rag.chunk.overlap（重叠 tokens，默认 64）
- rag.chunk.separators（递归分隔符优先级，默认 ["\n\n","\n","。"," ",""]）
- rag.embedding.provider / model / dims（嵌入模型，如 text-embedding-3 / bge-m3 1024 维）
- rag.embedding.batch_size（批量嵌入，默认 64）、rag.embedding.retry / timeout
- rag.index.type（vector|bm25|hybrid|graph）、rag.index.store（向量库实例引用）
- rag.recall.top_k（召回数，默认 20）、rag.recall.min_score（最低阈值过滤，默认 0.2）
- rag.recall.hybrid.enabled（混合检索开关）、hybrid.weights（向量:BM25 权重或 RRF k=60）
- rag.rerank.enabled（重排开关）、rerank.model（cross-encoder，如 bge-reranker-v2-m3）
- rag.rerank.top_n（重排后保留数，默认 5）、rerank.min_score（重排阈值）
- rag.repack.mode（concat|compress|dedup|truncate_by_budget）、repack.budget_ratio（占上下文预算比例，联动 03-context）
- rag.query.rewrite.enabled（查询改写：补全/消歧/多语言）、rewrite.max_queries（多查询扩展数，默认 1）
- rag.graph.enabled（GraphRAG 开关）、graph.entity_extract_model / graph.community_level
- rag.self_reflect.enabled（Self-RAG 反思循环开关）、self_reflect.max_rounds（默认 2）
- rag.citation.enabled（引用开关）、citation.min_snippet_len / citation.verify（引用时效校验）
- rag.cache.enabled（检索缓存）、cache.ttl / cache.max_entries（相同/相似查询命中缓存）
- rag.fallback（检索失败降级：纯 LLM 回答 + 声明"未检索到资料"）

## 四、管理界面（增删改调 + 辅助功能）

- 数据源管理：KnowledgeSource CRUD（连接器选择、同步计划、状态）、一键同步/增量同步/全量重建
- 分块实验台：选文档 → 调分块策略/大小/重叠 → 预览分块结果（可视化切分边界）→ A/B 对比两种配置
- 索引管理：IndexSet 列表（版本、规模、状态）、重建索引、索引健康检查（doc 数/向量维度/损坏检测）
- 检索调试台（核心）：输入 query → 展示各阶段输出（改写后 query / 多路召回候选 / RRF 融合分 / 重排后 top-k / 注入上下文预览）→ 逐条标注来源与得分 → 手动标记"相关/不相关"回流评测集
- 管线管理：RetrievalPipeline CRUD、阶段开关与参数、版本发布/回滚/灰度（先 10% 流量观察）
- 引用管理：CitationRef 列表、失效引用标记、批量验证、引用样式配置（角标/卡片/悬浮）
- 评测中心：选择评测集（16-D/24-test 提供）→ 跑 RagEvalRun → 指标对比（hit_rate/MRR/nDCG/faithfulness）→ 回归趋势图 → 门禁（指标低于阈值阻止管线发布）
- AI 辅助：AI 生成分块配置建议 / AI 生成查询改写规则 / 自动标注检索结果相关性 / 检索失败分析报告

## 五、运行时嵌入链路

- 入库链路：连接器拉取（文件/URL/API）→ 文档解析（OCR 等，16-D）→ 分块（ChunkConfig）→ 元数据附加 → 嵌入（批量）→ 写入 IndexSet（向量+倒排+图）→ 版本标记 → 状态上报
- 检索链路（对话中）：用户提问 → AgentRuntime 判定需检索（工具触发，04-tools）→ 查询理解（意图分类：需要检索/不需要）→ 查询改写 → 多路召回（向量 top-k + BM25 top-k + 图检索，并行）→ RRF 融合 → 重排（cross-encoder）→ 重打包（按 03-context 预算截断）→ 注入上下文（带 citation_id）→ LLM 生成 → 引用回显（15-ux-detail 引用角标可点击）
- 缓存链路：查询哈希 → 检索缓存命中（相同/相似）→ 直接返回候选，节省检索成本
- Self-RAG 链路：生成候选 → 反思 token（检索是否必要/回答是否支撑）→ 按需二次检索 → 修正
- 失败降级：检索超时/向量库不可用 → 重试 1 次 → 降级为 BM25-only → 再失败 → 纯 LLM 回答并在回复声明"未检索到相关资料"
- 代码路径参考：l5_tools/rag_engine（检索编排）、rag_pipeline.py（管线执行）、chunker.py（分块）、retriever.py（多路召回）、reranker.py（重排）、citation.py（引用管理）——与仓库 l6_retrieval 层衔接

## 六、安全与权限

- 权限继承：检索结果可见范围受 13-iam 资源授权约束（own/team/all + 知识库级 ACL），检索前过滤无权文档
- 敏感信息：索引内容脱敏（16-E 脱敏引擎联动）、检索日志脱敏（不落 query 全文或落加密）
- 注入防护：检索内容视为不可信输入，注入到 prompt 时做分隔与标记（防提示注入，联动 27-ai-security）
- 引用校验：被删除/过期文档的 citation 标记 stale，禁止回显失效引用
- 审计：数据源增删、索引重建、管线发布、评测运行全程留痕

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 数据源管理 | KnowledgeSourcePanel | CRUD /api/rag/sources + POST /api/rag/sources/{id}/sync | ⬜ |
| 分块实验台 | ChunkLab | POST /api/rag/chunk/preview + POST /api/rag/chunk/compare | ⬜ |
| 索引管理 | IndexManager | GET /api/rag/indexes + POST /api/rag/indexes/{id}/rebuild | ⬜ |
| 检索调试台 | RetrievalDebugger | POST /api/rag/debug（返回各阶段输出）+ POST /api/rag/debug/{id}/feedback | ⬜ |
| 管线管理 | PipelineManager | CRUD /api/rag/pipelines + POST /api/rag/pipelines/{id}/publish + /rollback | ⬜ |
| 引用管理 | CitationManager | GET /api/rag/citations + POST /api/rag/citations/{id}/verify | ⬜ |
| 评测中心 | RagEvalCenter | POST /api/rag/evals + GET /api/rag/evals/{id}/report | ⬜ |

验证：① 上传一份文档→分块→索引→检索调试台命中预期内容（含分与引用）② 构造"需要两段拼接才能回答"的问题，验证混合检索+重排优于纯向量 ③ 删除文档后引用被标记 stale 不再回显 ④ 检索超时/断库时降级路径生效且回复声明无资料 ⑤ 评测集跑分，改动管线前后指标可对比 ⑥ 无权用户检索不到越权文档内容 ⑦ 检索日志已脱敏

---

## 八、检索形态选型对照（工程决策表）

| 形态 | 适用场景 | 成本 | 延迟 | 关键配置 |
|---|---|---|---|---|
| Naive RAG | 起步验证、小知识库 | 低 | 低 | chunk=512, top_k=5 |
| Advanced RAG | 生产通用 | 中 | 中 | 混合检索+RRF+重排+元数据过滤 |
| LongRAG | 长文档（报告/论文/合同） | 中 | 中 | 长单元检索+单元内精排 |
| Self-RAG | 开放问答、事实敏感 | 高 | 高 | 反思循环 1-2 轮 |
| GraphRAG | 多跳关系问答、全局概览 | 高 | 高 | 实体抽取+社区摘要 |
| Hybrid 组合 | 复杂知识库（推荐） | 中高 | 中高 | Advanced RAG 为骨架 + 长文档走 LongRAG 分支 |
