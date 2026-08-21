# 22 数据治理与数据资产（Data Governance & Data Assets）

> 定位：让平台里的每一份数据（训练集/评测集/知识库/对话日志/埋点）都可发现、可理解、可信赖、可审计。企业级 Agent 平台的"数据底座"，与 16-企业级 的 D 知识库/合规、12-监控的日志链路互补：16-D 管"知识资产生命周期"，本篇管"全量数据资产治理"。
> 来源：DAMA-DMBOK 数据治理框架 / 数据资产管理（元数据/血缘/质量/分类分级）/ 数据要素入表实践。

---

## 一、定位与架构

- 数据资产四要素（可控制/可度量/可变现）：打破部门墙、看得懂（有元数据）、带价值属性
- 三库分层：原始数据资源库 → 治理后数据资产库 → 对外数据服务层
- 治理闭环：盘点 → 登记 → 采集元数据 → 建血缘 → 质量监控 → 资产组织（语义层）→ 开放服务
- 与 AI 平台的独特关系：训练数据、评测集、RAG 知识库、对话日志本身就是核心数据资产

## 二、资产模型（全字段）

| 资产字段 | 说明 |
|---|---|
| asset_id | 资产唯一 ID |
| name / business_name | 技术名 + 业务名 |
| type | dataset / eval_set / knowledge_base / chat_log / trace / metric / prompt_asset |
| source | 数据源（数据库/文件/API/采集器） |
| owner / org | 负责人 + 所属组织 |
| classification | 分类（内部/机密/敏感/公开） |
| tags / annotations | 标签 + 人工注释 |
| lineage | 血缘关系（上游/下游） |
| quality_score | 质量评分 |
| usage_stats | 使用统计（调用次数/最近访问） |
| lifecycle_state | 采集/处理/就绪/归档/销毁 |

## 三、配置项全清单

- governance.enabled（治理开关）、governance.classification.required（强制分类）
- governance.quality.threshold（质量门槛，默认 85）
- governance.retention.（保留期策略：按资产类型默认值）
- governance.lineage.depth（血缘追溯深度）
- governance.sensitive.detect（敏感数据自动识别开关）
- governance.term.match（术语库自动匹配）

## 四、管理界面（增删改调 + 辅助功能）

- 资产目录页：搜索/过滤/定位（关键词 + 分类 + 标签 + 负责人）
- 资产详情页：业务信息 + 技术元数据 + 血缘图谱 + 质量报告 + 使用统计
- 元数据管理：人工编辑业务元数据 + 自动采集技术元数据（探针扫描）
- 业务/技术元数据匹配：相似度算法自动匹配 + 手动确认
- 数据源管理：配置数据源（数据库/云/IoT/文件/API）+ 探针扫描发现暗数据
- 血缘可视化：端到端数据流向图（来源→流转→加工→产出）
- 质量监控：规则配置 + 问题明细 + 改进建议
- 资产上下架：申请/审批流程（复用 16-E 审批引擎）
- 数据服务 API：资产开放接口（复用 16-G 开放平台）

## 五、运行时嵌入链路

- 采集器定时扫描数据源 → 元数据入库 → 血缘分析器（SQL 解析/ETL 解析）→ 质量评估器打分 → 资产状态机流转
- 对话/知识库写入时：自动登记资产 + 敏感检测 + 分类分级
- 血缘采集：跟踪管道执行（ETL 任务）、查询（SQL）、模型训练（特征定义/训练运行）
- 检索/使用方：资产目录 API 提供搜索能力，权限校验走 13-IAM

## 六、安全与权限

- 资产级权限：own/team/all + 敏感资产需审批访问
- 数据脱敏：敏感字段自动识别 + 掩码（复用 16-E 脱敏引擎）
- 审计：资产变更记录（who/what/when）+ 访问记录
- 导出控制：资产导出需合规审批

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 资产目录搜索 | AssetCatalogPage | GET /api/assets | ⬜ |
| 资产详情+血缘图 | AssetDetailPage(LineageGraph) | GET /api/assets/{id}/lineage | ⬜ |
| 元数据编辑 | MetadataEditor | PUT /api/assets/{id}/metadata | ⬜ |
| 数据源管理 | DataSourceManager | CRUD /api/datasources | ⬜ |
| 质量监控 | QualityDashboard | GET /api/assets/{id}/quality | ⬜ |
| 分类分级审批 | 复用审批流 | POST /api/assets/classify | ⬜ |

验证：① 新建数据源→采集→资产出现在目录 ② 血缘图展示端到端链路 ③ 质量规则触发告警 ④ 敏感资产访问被拦截 ⑤ 资产上下架全流程走通
