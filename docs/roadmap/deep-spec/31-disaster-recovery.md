# 31 容灾与业务连续性（Disaster Recovery & Continuity）

> 定位：Agent 平台的"最后一道防线"——备份、多活、故障切换、恢复演练，用 RTO/RPO 度量灾难恢复能力，保证大模型服务、数据、知识库在灾难下可恢复、业务不中断。与 12-monitor（监控告警）、25-性能（高可用扩容）、16-K（运维）互补：本篇聚焦"灾备体系本身"。
> 来源：RTO/RPO 指标体系 / 3-2-1 备份原则（三副本两介质一异地）/ 多活容灾架构（服务层/业务层/数据库层）/ 分钟级 RTO 生产实践（30s-1min）/ DRP 灾难恢复计划 / 每月恢复演练常态化（政务系统实践）/ 故障演练包（拖拽编排+自动化切换验证）。

---

## 一、定位与架构

- 核心指标：RTO（恢复时间目标：灾难到恢复可用最大时间）、RPO（恢复点目标：可容忍最大数据丢失量，决定备份频率）
- 备份策略：全量（周）+ 增量（日，Binlog/归档日志）+ 3-2-1 原则
- 容灾分级：数据级（备份恢复）→ 应用级（备用站点接管）→ 业务级（多活/双活）
- 多活架构：单元化部署（服务层/业务层/数据库层多活）、智能调度、故障切换自动/半自动
- 演练机制：定期演练（月度恢复演练）、故障演练包（可视化编排、自动化切换验证与结果判定）、演练报告闭环
- 连续性分层：单机故障（HA 自动恢复）→ 机房故障（跨区域切换）→ 区域性灾难（异地容灾）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| BackupJob | job_id / name / scope(database|object_store|config|model) / type(full|incremental|differential) / schedule / retention |
| BackupSet | set_id / job_id / snapshot_time / size / location / checksum / verify_status / restore_test_status |
| DRPlan | plan_id / name / tier(1-6) / rto_target / rpo_target / scenarios[] / steps[] / contact / status |
| DrSite | site_id / name / region / role(primary|standby|active) / capacity / sync_status / last_switch |
| SwitchoverTask | task_id / plan_id / trigger(mannual|auto|scheduled) / direction / steps_progress / result / duration |
| Drill | drill_id / name / scenario(failover|restore|data_loss|region_down) / plan_ref / scheduled_time / result / report_ref |
| ContinuityMetric | metric_id / name(actual_rto|actual_rpo|backup_success_rate|drill_pass_rate) / value / period |

## 三、配置项全清单

- dr.backup.enabled（备份总开关）、backup.full.cron（全量备份周期）、backup.incremental.cron（增量周期）
- backup.retention.days（备份保留天数）、backup.3-2-1（异地副本开关）、backup.encryption（备份加密）
- backup.verify.enabled（备份校验）、verify.schedule（校验周期）
- dr.rto.target（RTO 目标，如 60s）、dr.rpo.target（RPO 目标，如 5min）
- dr.multisite.enabled（多活开关）、multisite.sync.mode（同步/异步复制）、multisite.regions[]
- dr.switchover.mode（手动/半自动/自动）、switchover.auto.threshold（自动切换触发条件）
- drill.schedule（演练频率：月度）、drill.scenarios（演练场景集）、drill.notify（演练通知）
- dr.alert.channels（容灾告警渠道，联动 12-monitor）

## 四、管理界面（增删改调 + 辅助功能）

- 备份中心：备份任务 CRUD、备份集列表（时间点恢复）、备份校验状态、恢复演练一键触发
- 恢复控制台：选择备份集/时间点 → 预览可恢复内容 → 执行恢复 → 恢复验证（数据校验）
- 容灾拓扑图：主备/多活站点拓扑可视化、同步状态、延迟监控、容量水位
- DR 计划管理：灾难恢复计划 CRUD（场景/步骤/联系人/RTO-RPO 目标）、计划版本、审批发布
- 切换演练台：创建演练（场景选择）、演练编排（拖拽步骤）、执行进度、切换验证（自动化断言）、演练报告
- 故障注入实验室：模拟灾难（断网/杀进程/删数据/区域故障）、观察系统行为、恢复验证
- 连续性看板：RTO/RPO 达成率、备份成功率、演练通过率、未闭环风险项

## 五、运行时嵌入链路

- 备份链路：调度器触发 → 备份执行（全量/增量）→ 加密存储（本地+异地 3-2-1）→ 备份校验 → 状态上报
- 恢复链路：灾难发生 → 告警（12-monitor）→ 触发 DR 计划 → 切换/恢复执行 → 数据一致性校验 → 业务接管 → 复盘
- 多活切换：故障检测 → 流量调度（LB/DNS）→ 单元切换 → 数据同步补偿 → 自动/人工确认
- 演练链路：演练计划 → 沙箱环境模拟灾难 → 执行恢复步骤 → 自动化验证（RTO/RPO 实测）→ 报告 + 改进项
- 配置即代码：备份/DR 计划以声明式配置管理，环境差异参数化

## 六、安全与权限

- 备份数据加密（传输+存储）、备份密钥 KMS 管理
- 恢复/切换为高危操作：需审批（四眼，联动 13-iam）+ 演练环境隔离
- 备份访问权限分级：仅运维/安全角色可看可恢复
- 演练与生产隔离：演练永不触碰生产数据（用克隆环境）
- 审计：所有备份/恢复/切换操作留痕

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 备份中心 | BackupCenter | CRUD /api/dr/backups + POST /api/dr/backups/{id}/restore | ⬜ |
| 恢复控制台 | RestoreConsole | POST /api/dr/restore + GET /api/dr/restore/{id}/verify | ⬜ |
| 容灾拓扑图 | DrTopologyView | GET /api/dr/topology + GET /api/dr/sites/{id}/sync-status | ⬜ |
| DR 计划管理 | DrPlanManager | CRUD /api/dr/plans + POST /api/dr/plans/{id}/publish | ⬜ |
| 切换演练台 | DrillConsole | POST /api/dr/drills + GET /api/dr/drills/{id}/report | ⬜ |
| 故障注入实验室 | FaultInjectionLab | POST /api/dr/fault-inject + POST /api/dr/fault-inject/{id}/recover | ⬜ |
| 连续性看板 | ContinuityDashboard | GET /api/dr/metrics | ⬜ |

验证：① 备份任务按计划执行且校验通过 ② 从指定时间点恢复数据完整（RPO 达标）③ 模拟主站故障→自动/手动切换→业务恢复（RTO 达标）④ 月度演练生成报告含实测 RTO/RPO ⑤ 故障注入（删表）后恢复成功 ⑥ 备份/恢复/切换全程审计留痕
