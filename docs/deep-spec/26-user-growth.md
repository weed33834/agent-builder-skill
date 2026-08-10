# 26 用户研究与增长（User Research & Growth）

> 定位：把 Agent 平台当产品经营——埋点、指标、实验、反馈闭环、用户研究，让"好用"可度量、增长可复制。与 16-J（分析洞察）互补：16-J 管"平台业务指标看板"，本篇管"增长方法论 + 埋点体系 + 实验引擎 + 反馈闭环"。
> 来源：AARRR/RARRA 模型 / 北极星指标方法论 / 埋点设计（事件模型）/ A/B 测试工程实践（字节 DataTester / 神策）/ SaaS 增长（激活/留存/Aha 时刻）。

---

## 一、定位与架构

- 增长模型演进：AARRR（获客/激活/留存/营收/裂变）→ RARRA（留存优先，流量红利见顶后的重心转移）
- 北极星指标：从用户旅程找最能代表价值的指标（如笔记产品=笔记总数量），唯一且可行动
- 增长五步：拉用户旅程 → 选北极星 → 增长战略图 → 增长实验 → 规模化复制
- 指标树：北极星 → 核心指标（激活率/留存/转化）→ 过程指标（PV/UV/时长/频次）
- 埋点是数据基础：行为埋点/功能埋点/生命周期埋点/渠道埋点/漏斗埋点

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| Event | event_id / name / type(click|page|action|lifecycle) / params{schema} / platform / version |
| EventRecord | record_id / event_name / user_id / session_id / ts / props / device / ip_hashed |
| MetricDef | metric_id / name / formula / dims[] / period / owner |
| Cohort | cohort_id / name / filter / group_by(acquisition_date|channel|plan) |
| Funnel | funnel_id / name / steps[] / window / conversion_target |
| Experiment | exp_id / name / hypothesis / variant_a / variant_b / traffic_split / metrics[] / status / duration |
| Feedback | feedback_id / type(rating|nps|survey|interview) / user_id / content / session_ref / status |
| UserSegment | segment_id / name / rules / size / active |

## 三、配置项全清单

- analytics.enabled（埋点总开关）、analytics.sampling（采样率，线上高流量可降采样）
- analytics.event.retention（事件保留期）、analytics.privacy.ip_hash（IP 哈希脱敏）
- analytics.consent.（隐私同意策略：GDPR/个保法）
- experiment.min_sample（最小样本量）、experiment.duration（最小运行时长）
- experiment.significance（显著性水平，默认 95%）
- growth.nps.interval（NPS 推送频率）、growth.survey.targets（调研触发条件）
- growth.funnel.window（漏斗转化时间窗）

## 四、管理界面（增删改调 + 辅助功能）

- 指标大盘：北极星指标 + 核心指标卡片（DAU/MAU/留存/激活率/转化）+ 趋势图
- 埋点管理：事件定义 CRUD、参数 schema 校验、埋点生效状态、未埋点页面检测
- 留存分析：次日/7日/30日留存曲线、同期群分析（cohort）、分群对比
- 漏斗分析：自定义漏斗（如 注册→首次对话→连续使用）、步骤转化率、流失断点定位
- A/B 实验台：创建实验（假设/变体/流量分配/指标）、运行监控（显著性）、结论判定、经验库沉淀
- 用户分群：规则分群（行为/属性）、分群大小预览、导出
- 反馈中心：NPS 看板、满意度评分分布、评价明细、访谈记录、反馈→需求池流转
- 路径分析：用户行为路径、Aha 时刻挖掘（关键动作 vs 留存相关性）
- 增长建议：自动识别流失断点 + 实验建议

## 五、运行时嵌入链路

- 埋点采集：前端 SDK 自动采集（页面/点击/行为）→ 批量上报 → 数仓聚合
- 会话关联：埋点与会话/消息/trace 关联（trace_id），可下钻到具体对话
- 实验路由：流量分配中间件 → 变体下发（Prompt/UI/模型配置变体）
- 反馈采集：对话内点赞点踩（15-ux-detail I 域）→ 自动入库 → 关联会话
- 数据回灌：质量差会话 → 测试用例（24-测试）→ 改进闭环

## 六、安全与权限

- 数据最小化：埋点字段白名单、禁止采集敏感字段
- 用户隐私：同意管理、数据导出权、删除权（复用 16-E 合规）
- 实验权限：创建需审批、生产实验受控
- 反作弊：异常流量过滤（爬虫/刷量）

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 指标大盘 | GrowthDashboard | GET /api/metrics/summary | ⬜ |
| 埋点管理 | EventManager | CRUD /api/events + POST /api/events/record | ⬜ |
| 留存分析 | RetentionPage | GET /api/analytics/retention?cohort= | ⬜ |
| 漏斗分析 | FunnelBuilder | POST /api/analytics/funnel | ⬜ |
| A/B 实验台 | ExperimentStudio | CRUD /api/experiments + POST /api/experiments/{id}/run | ⬜ |
| 反馈中心 | FeedbackCenter | GET /api/feedback + POST /api/feedback | ⬜ |

验证：① 前端操作后事件出现在埋点明细 ② 留存曲线与同期群正确 ③ 创建漏斗→转化率正确 ④ A/B 实验到期出显著性结论 ⑤ 赞踩数据进入反馈中心并可下钻会话
