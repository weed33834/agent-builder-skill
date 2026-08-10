# 深度规格 09：定时任务与调度（Scheduling System）

> 模板：docs/deep-spec/00-template.md
> 定位：智能体"自主行动"的时间维度——到点自动干活（定时播报、周期汇总、打卡、数据巡检、新闻订阅、定时提醒），无需用户在场。

## 1. 定位与总体架构

**业务价值**：对话是"用户找 agent"；定时任务是"agent 找用户"。调度系统管住：**任务定义**（何时做什么）、**执行引擎**（到点触发 agent/工作流/工具）、**可靠性**（错过补跑/重试/幂等）、**通知**（结果推送渠道）、**管理**（增删改查/启停/暂停恢复）。

**架构位置**：

```
定时任务定义（DB：scheduled_tasks）
  → Scheduler（调度器：cron 解析 + 到期触发 + 并发控制）
      → TaskRunner（执行器：任务类型分发）
          ├─ agent_task：把 prompt 交给指定 agent 执行（可带上下文）
          ├─ workflow_task：触发工作流（07）
          ├─ tool_task：直接调工具（如"查天气发邮件"）
          └─ script_task：执行脚本（沙箱 02）
      → 结果处理（成功/失败 → 通知 → 记录）
          → 通知渠道：对话推送 / 邮件 / 企微钉钉飞书 webhook / 短信
```

**任务类型**：

| 类型 | 说明 | 示例 |
|------|------|------|
| 一次性（at） | 指定时间执行一次 | 明天 9:00 提醒开会 |
| 周期（cron） | 按 cron 表达式周期执行 | 每天 8:00 播报天气/新闻 |
| 间隔（interval） | 每 N 分钟/小时 | 每 30 分钟巡检一次系统 |
| 触发式 | 事件驱动（外部 webhook 触发） | 收到 webhook 后延迟 5 分钟执行 |
| 依赖式 | 前序任务成功后才执行 | 数据拉取成功 → 生成报告 |

## 2. 资产模型（定时任务数据模型）

### 2.1 任务定义（DB：`scheduled_tasks`）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id / name | — | ✅ | — | 任务名（唯一） | — |
| description | string | 否 | — | 用途说明 | — |
| task_type | enum | ✅ | agent | 任务类型 | agent/workflow/tool/script |
| schedule_type | enum | ✅ | cron | 调度类型 | at/cron/interval/event/dependency |
| schedule_expr | string | ✅ | — | 调度表达式 | cron: `0 8 * * *`；at: ISO 时间；interval: "30m"/"2h" |
| timezone | string | ✅ | Asia/Shanghai | 时区（cron 按此解释） | IANA 时区 |
| agent_id | string | 条件 | — | agent 任务目标 | task_type=agent 必填 |
| prompt_template | string | 条件 | — | 执行指令模板 | 支持变量 {date}/{summary_prev} |
| workflow_id | string | 条件 | — | 工作流任务目标 | task_type=workflow 必填 |
| tool_name / tool_args | — | 条件 | — | 工具任务 | task_type=tool 必填 |
| script_ref | string | 条件 | — | 脚本引用（沙箱内跑） | task_type=script 必填 |
| enabled | bool | ✅ | true | 启停 | false=不调度 |
| paused | bool | ✅ | false | 暂停（保留定义，恢复后继续） | — |
| catchup | enum | ✅ | none | 错过后补跑 | none(跳过) / immediate(立即补) / next(下个周期) |
| max_retries / retry_delay | int | ✅ | 2/60 | 失败重试 | 0-10 次，10-3600 秒 |
| timeout | int | ✅ | 300 | 单次执行超时 | 10-86400 |
| concurrency_policy | enum | ✅ | skip | 上次未跑完时的策略 | skip(跳过本次) / queue(排队) / parallel(并行) / cancel(取消旧的) |
| notify_on | enum | ✅ | failure | 通知时机 | never/success/failure/all |
| notify_channels | list | ✅ | [对话] | 结果推送渠道 | chat/email/webhook/sms |
| notify_target | string | 条件 | — | 渠道目标（用户 ID/邮箱/URL） | — |
| payload | json | 否 | {} | 执行附加参数 | — |
| last_run_at / next_run_at | datetime | — | — | 运行时间（调度器维护） | — |
| run_count / success_count / last_status | — | ✅ | 0 | 统计 | — |
| owner / created_at / updated_at | — | ✅ | — | 审计 | — |

### 2.2 运行记录（DB：`scheduled_runs`）

| 字段 | 说明 |
|------|------|
| id / task_id | 运行标识 |
| scheduled_for / started_at / finished_at | 时间 |
| status | pending/running/success/failed/skipped/timeout/retrying |
| result_summary | 结果摘要（agent 回复前 500 字） |
| error | 失败原因（脱敏） |
| attempts | 重试次数 |
| notified | 是否已通知 |
| trace_id | 可观测性关联 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| SCHEDULER_ENABLED | bool | true | 调度器总开关 | true/false | 热加载 |
| SCHEDULER_TICK_SECONDS | int | 15 | 扫描周期（秒） | 1-60 | 重启 |
| SCHEDULER_MAX_CONCURRENT | int | 5 | 并发执行上限 | 1-50 | 热加载 |
| SCHEDULER_DEFAULT_TIMEOUT | int | 300 | 默认执行超时 | 10-86400 | 热加载 |
| SCHEDULER_MISSED_TASK_POLICY | enum | skip | 停机期间错过任务处理 | skip/run_next/catchup | 热加载 |
| SCHEDULER_RUN_RETENTION_DAYS | int | 90 | 运行记录保留 | 7-3650 | 热加载 |
| SCHEDULER_TIMEZONE | string | Asia/Shanghai | 默认时区 | IANA | 热加载 |
| SCHEDULER_HEARTBEAT_WEBHOOK | string | — | 调度器心跳告警（长时间不跳=挂了） | URL | 热加载 |

### 3.2 任务级配置（创建表单同构）

```yaml
task:
  name: daily-news-digest
  description: 每天早上 8 点推送新闻摘要
  task_type: agent
  schedule_type: cron
  schedule_expr: "0 8 * * *"
  timezone: Asia/Shanghai
  agent_id: news-agent
  prompt_template: "请汇总今天的科技新闻，按重要性排序，100 字以内。今天是{date}"
  catchup: immediate
  max_retries: 2
  concurrency_policy: skip
  notify_on: all
  notify_channels: [chat]
  notify_target: "user:915365536"
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 任务列表（SchedulerPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 任务列表 | 名称/类型/调度表达式/下次运行/状态/统计 | GET /admin/schedules |
| 筛选搜索 | 类型/启用状态/关键字 | ?type=&enabled=&q= |
| 启停 | 一键启用/停用（停用=不再调度） | POST /admin/schedules/{id}/toggle |
| 暂停/恢复 | 暂停（保留定义，恢复继续按原计划） | POST /admin/schedules/{id}/pause、/resume |
| 立即执行 | 手动触发一次（调试用） | POST /admin/schedules/{id}/run-now |
| 下次时间预览 | 输入 cron 表达式 → 显示未来 5 次触发时间（**防写错表达式**） | POST /admin/schedules/preview |

### 4.2 任务编辑器（ScheduleEditor）

| 能力 | 说明 |
|------|------|
| 基本信息 | 名称/描述/类型/时区 |
| 调度配置 | 类型选择 + 表达式 + 表达式校验/预览 + 常见模板（每天/每周/每小时/工作日） |
| 执行配置 | 目标选择（agent/工作流/工具/脚本）+ 指令模板（变量提示）+ 超时/重试/并发策略 |
| 通知配置 | 时机/渠道/目标 + 测试通知按钮（发一条测试） |
| 高级 | 错过补跑策略/幂等键/负载均衡 |

### 4.3 运行记录（ScheduleRuns）

| 能力 | 说明 | 接口 |
|------|------|------|
| 运行列表 | 时间/任务/状态/耗时/重试次数 | GET /admin/schedules/runs |
| 运行详情 | 结果摘要/错误/完整输出 | GET /admin/schedules/runs/{id} |
| 失败重试 | 对失败运行手动重试 | POST /admin/schedules/runs/{id}/retry |
| 统计 | 各任务成功率/平均耗时/失败趋势 | GET /admin/schedules/stats |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 任务模板 | 预置常用模板：每日新闻/天气播报/周报生成/数据巡检/定时备份 | 🔶 待补 |
| 导入导出 | 任务配置 YAML 导出/导入迁移 | 🔶 待补 |
| 日历视图 | 任务时间轴/日历视图 | ⬜ |
| 停用提醒 | 长期失败任务自动停用 + 告警 | ⬜ |
| 依赖编排 | 任务 A 成功后触发 B（DAG 依赖） | 🔶 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 调度主循环

```
Scheduler 常驻服务（后台任务，启动时随 app 拉起）
  ├─ 每 tick（15s）扫描到期任务：next_run_at ≤ now && enabled && !paused
  ├─ 并发控制：活跃任务数 ≥ MAX_CONCURRENT → 下轮再取
  ├─ 并发策略检查：上次仍在运行 → skip/queue/parallel/cancel
  ├─ 分发到 TaskRunner（线程池/进程池）
  └─ 执行完成后计算下次 next_run_at 写回
```

### 5.2 执行链路（agent 任务示例）

```
TaskRunner.run(task)
  ├─ 1. 渲染 prompt_template（{date}/{prev_summary} 等变量）
  ├─ 2. 创建隔离会话（session 按任务 ID 命名，跨次可复用 → 支持"对比上次"）
  ├─ 3. 调用 ChatService（与对话同管线：记忆/RAG/工具/编排全部可用）
  ├─ 4. 超时控制 + 结果截断（长回复摘要化）
  ├─ 5. 结果处理：
  │     ├─ 按 notify_on 判断 → 推送通知（chat/email/webhook/sms）
  │     ├─ 写 scheduled_runs（摘要+状态+耗时）
  │     └─ 失败 → 按 max_retries 重试（指数退避）
  └─ 6. 长期失败（连续 N 次）→ 告警 + 可选自动停用
```

### 5.3 与通知渠道的协作

| 渠道 | 实现 | 用途 |
|------|------|------|
| 对话推送 | 复用 messaging 通道发给指定用户 | 主渠道 |
| 邮件 | SMTP 适配器 | 报告/汇总 |
| 企微/钉钉/飞书 | webhook 适配器 | 团队通知 |
| 短信 | 短信网关 | 紧急告警 |
| 回调 URL | HTTP POST 任务结果 | 系统间集成 |

### 5.4 失败降级

| 场景 | 降级 |
|------|------|
| 调度器进程崩溃 | 心跳告警；重启后按 MISSED_TASK_POLICY 处理错过任务 |
| 执行超时 | 杀任务 + 标记 timeout + 通知 |
| agent 执行失败 | 重试 → 仍失败 → 通知 + 运行记录留痕 |
| 通知渠道失败 | 渠道标记 unhealthy → 下次换备用渠道 |
| 依赖任务未成功 | 跳过 + 记录 skipped（可配置为阻塞） |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：任务全量；开发者：创建自己 agent 的任务；用户：自己的提醒任务 |
| 审计 | 任务增删改/启停/手动执行/重试全部记录 |
| 防滥用 | 每用户任务数上限、执行频率上限（min 间隔 1 分钟）、并发上限 |
| 敏感任务 | 涉及外发/写库的任务声明敏感 → 需审批或强制审计 |
| 数据 | 运行结果含对话内容 → 保留期+加密；通知目标白名单 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 任务 CRUD | /admin/schedules（GET/POST/PUT/DELETE） | admin/SchedulerPanel.tsx（待建） | 🔶 后端已有 scheduler.py | 前端组件 |
| 启停/暂停/恢复 | POST /admin/schedules/{id}/toggle|pause|resume | SchedulerPanel | 🔶 | — |
| 立即执行 | POST /admin/schedules/{id}/run-now | SchedulerPanel | 🔶 | — |
| 表达式预览 | POST /admin/schedules/preview | ScheduleEditor | 🔶 | cron 解析 |
| 运行记录/详情 | /admin/schedules/runs* | SchedulerPanel 子页 | 🔶 | 落库已有 |
| 失败重试 | POST .../runs/{id}/retry | SchedulerPanel | 🔶 | — |
| 统计 | GET /admin/schedules/stats | SchedulerPanel | ⬜ | 聚合 |
| 任务模板 | GET /admin/schedules/templates | ScheduleEditor | ⬜ | — |
| 依赖编排 | 字段 parent_task_ids | SchedulerPanel | ⬜ | DAG 调度 |
| 通知测试 | POST /admin/schedules/notify-test | ScheduleEditor | ⬜ | 渠道复用 |

**验证方法**：
1. 创建"每 2 分钟执行一次"的 agent 任务（指令："报告当前时间"）→ 观察运行记录出现多次（调度生效）。
2. 表达式预览输入 `0 8 * * *` → 显示未来 5 个 8:00（校验生效）。
3. 手动"立即执行" → 运行记录新增一条 + 通知推送（手动触发生效）。
4. 让 agent 任务必然失败（指令让它报错）→ 观察重试 2 次后标记 failed + 失败通知（重试生效）。
5. 暂停任务 → 到点不再执行 → 恢复 → 下次正常（暂停恢复生效）。
