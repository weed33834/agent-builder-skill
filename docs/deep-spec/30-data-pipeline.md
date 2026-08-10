# 30 数据管道与集成（Data Pipeline & Integration）

> 定位：Agent 平台的"数据生命线"——从异构数据源抽取、清洗、转换、加载，到实时流处理与批流一体，为知识库（16-D）、记忆（05）、评估（24）、分析（26）持续供数。与 22-数据治理（资产目录/质量）互补：22 管"数据资产治理"，本篇管"数据流动工程"。
> 来源：ETL/ELT 方法论 / Apache Airflow-Luigi 编排 / Kafka 实时管道 / CDC 变更数据捕获 / RestCloud 可视化 ETL（80+ 组件、断点续传、批流一体）/ Snowflake-S3-Airflow 现代数据栈。

---

## 一、定位与架构

- ETL vs ELT：ETL 先转换后入库（传统数仓）；ELT 先入库后转换（云数仓算力强，适合半结构化大数据）
- 批流一体：批量（定时全量/增量）+ 流式（Kafka 实时）统一处理框架
- 抽取策略：全量抽取（初始化）/ 增量抽取（时间戳）/ CDC 变更捕获（Binlog/归档日志，实时且不打扰源库）
- 管道编排：DAG 任务依赖（Airflow 式）、调度、重试、告警、断点续传
- 数据流向：源系统 → 采集 → 缓冲（Kafka）→ 转换（清洗/脱敏/标准化）→ 加载 → 消费端（RAG 库/数仓/指标）
- 与 Agent 的关系：既是消费方（知识库建库/记忆沉淀/评估集），也是生产者（对话日志/反馈流出）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| DataSource | source_id / name / type(db|api|file|kafka|log) / conn_config_enc / driver / status / last_sync |
| Pipeline | pipeline_id / name / mode(batch|stream|batch_stream) / dag_json / schedule_cron / retry / timeout |
| PipelineTask | task_id / pipeline_id / step_type(extract|transform|load|quality) / config / depends_on[] / status |
| SyncRecord | record_id / source_id / pipeline_id / batch_no / rows_total / rows_success / rows_failed / start/end_time / status |
| TransformRule | rule_id / name / type(clean|dedup|mask|normalize|aggregate|map) / config / enabled |
| DataSink | sink_id / name / type(vector_db|warehouse|object_store|search_engine) / config / status |
| DataQualityCheck | check_id / pipeline_id / rule / threshold / result / alert_level |

## 三、配置项全清单

- pipeline.scheduler.cron（调度表达式）、pipeline.retry.max（最大重试）、pipeline.retry.backoff（退避策略）
- pipeline.batch.size（批量大小）、pipeline.parallelism（并行度）
- pipeline.stream.buffer（Kafka 缓冲配置）、stream.offset（offset 管理：自动/手动）
- pipeline.cdc.enabled（CDC 开关）、cdc.source（Binlog/归档日志）、cdc.sync.interval
- transform.mask.fields（脱敏字段清单）、transform.dedup.key（去重键）
- quality.check.thresholds（质量阈值：空值率/异常率）、quality.fail_action（失败动作：告警/阻断/旁路）
- sink.batch.flush（落库批量刷新）、sink.vector.embed（向量库嵌入模型，联动 16-D/28）
- pipeline.alert.channels（管道告警渠道，联动 12-monitor）

## 四、管理界面（增删改调 + 辅助功能）

- 数据源管理：异构数据源 CRUD（数据库/API/文件/Kafka）、连接测试、驱动管理、凭据加密存储
- 管道编排器：可视化 DAG 编辑器（拖拽节点）、调度配置、依赖管理、运行历史、重跑/停跑
- 任务执行监控：当前执行任务列表、进度、日志、失败重试、断点续传
- 转换规则库：清洗/去重/脱敏/标准化规则 CRUD、规则测试台（样本数据试跑）、规则版本
- 数据质量中心：质量检查规则配置、检查结果看板、问题数据明细、修复建议
- 同步统计：各管道/数据源同步量、成功率、耗时趋势、失败 Top
- 数据预览：源/目标数据抽样预览、字段映射可视化、血缘追溯（联动 22-B）

## 五、运行时嵌入链路

- 知识库建库：源系统 → 抽取 → 清洗 → 分块 → 向量化 → 入向量库（16-D/28 多模态）
- 记忆沉淀：对话日志 → 流式管道 → 清洗 → 结构化 → 入记忆库（05-memory）
- 评估数据：线上对话/反馈 → 管道 → 评估集（24-测试）
- 指标供数：埋点/业务数据 → 管道 → 指标库（26-增长）
- 实时事件：用户行为/异常 → Kafka → 实时处理 → 触发告警/推荐（12-monitor 联动）

## 六、安全与权限

- 凭据管理：数据源凭据加密存储（KMS）、不落日志、访问权限分级
- 脱敏前置：抽取后立即脱敏（手机号/身份证/密钥），敏感字段白名单
- 管道权限：管道 CRUD 需 RBAC（谁可建/可改/可运行），运行需审计
- 数据边界：跨境数据合规检查（16-E）、禁止未授权数据外流
- 防误操作：危险操作（全量覆盖/删除目标）二次确认+审批

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 数据源管理 | DataSourceManager | CRUD /api/pipeline/sources + POST /api/pipeline/sources/{id}/test | ⬜ |
| 管道编排器 | PipelineDAGEditor | CRUD /api/pipeline/pipelines + POST /api/pipeline/pipelines/{id}/run | ⬜ |
| 任务执行监控 | PipelineTaskMonitor | GET /api/pipeline/tasks + POST /api/pipeline/tasks/{id}/retry | ⬜ |
| 转换规则库 | TransformRuleLibrary | CRUD /api/pipeline/transform-rules + POST /api/pipeline/transform-rules/test | ⬜ |
| 数据质量中心 | DataQualityCenter | GET /api/pipeline/quality + POST /api/pipeline/quality/checks | ⬜ |
| 同步统计 | SyncStatsDashboard | GET /api/pipeline/stats | ⬜ |

验证：① 接入 MySQL 源→配置管道→数据正确入库 ② 定时调度到点自动执行 ③ 断点续传：中断后从断点恢复不重复 ④ 脱敏规则生效（手机号打码）⑤ 质量阈值触发告警 ⑥ CDC 实时同步：源库变更秒级到达目标
