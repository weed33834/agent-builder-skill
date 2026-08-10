# 深度规格 12：监控与告警（Monitoring & Alerting）

> 模板：docs/deep-spec/00-template.md
> 定位：**上线只是开始**。监控管住：性能（延迟/吞吐）、可用性（成功率/错误率）、资源（CPU/内存/队列）、业务（调用量/成本/质量）、告警（分级+多渠道+升级）、观测（trace/日志一键排查）。

## 1. 定位与总体架构

**业务价值**：智能体出问题不能让用户先发现。监控系统管住四件事：**看得见**（指标/日志/链路）、**算得清**（阈值/趋势/环比）、**叫得响**（分级告警+多渠道+升级）、**查得快**（一条 trace 从用户请求看到底层调用）。

**观测三支柱**：

```
┌─ Metrics（指标，数字趋势）───────────────────────────┐
│ 调用量/成功率/P50·P95·P99 延迟/错误率/token 成本/队列深度│
│ 存储：时序库（Prometheus + Grafana 或自研聚合）         │
├─ Logs（日志，事件详情）───────────────────────────────┤
│ 请求日志/错误日志/审计日志（结构化 JSON，带 trace_id）   │
│ 存储：日志库（ES/ClickHouse 或文件+索引）               │
├─ Traces（链路，请求路径）─────────────────────────────┤
│ 用户请求 → 对话管线 → 工具调用 → LLM 调用 全链路         │
│ 每段：耗时/输入输出摘要/错误/成本                        │
│ 存储：trace 库（Jaeger/Tempo 或自研）                   │
└───────────────────────────────────────────────────────┘
```

**告警分级**：

| 级别 | 含义 | 响应 | 渠道 |
|------|------|------|------|
| P0 致命 | 服务不可用/数据丢失 | 立即响应（<15min） | 电话/短信+企微 |
| P1 严重 | 主链路高错误率/大面积超时 | 快速响应（<1h） | 企微/钉钉+邮件 |
| P2 警告 | 单模块降级/指标接近阈值 | 当日处理 | 对话推送/邮件 |
| P3 提示 | 趋势预警/容量预测 | 观察 | 汇总日报 |

## 2. 资产模型（监控数据模型）

### 2.1 监控指标定义（DB：`monitor_metrics`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id / name | — | ✅ | 指标名（如 request_total / llm_latency_p95） |
| metric_type | enum | ✅ | counter(累计) / gauge(瞬时) / histogram(分布) |
| unit | string | 否 | 单位（ms/元/次数/%） |
| source | enum | ✅ | system(系统自动埋点)/business(业务自定义) |
| dimension_keys | list | 否 | 维度（agent_id/model/tool/status…） |
| description | string | 否 | 说明 |
| enabled | bool | ✅ | 采集开关 |

### 2.2 告警规则（DB：`alert_rules`）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id / name | — | ✅ | — | 规则名 |
| metric | FK | ✅ | — | 关联指标 |
| condition | json | ✅ | — | 条件：{op: gt/gte/lt/lte, value, window: 5m, evaluate: every, aggregation: avg/max/p95} |
| severity | enum | ✅ | P2 | P0-P3 |
| duration | int | ✅ | 60 | 持续多少秒触发（防抖动） |
| cooldown | int | ✅ | 300 | 冷却期（避免轰炸） |
| notify_channels | list | ✅ | [对话] | 渠道 |
| notify_targets | list | ✅ | — | 接收人/群/URL |
| escalate_after | int | 否 | — | 未恢复 N 分钟后升级下一级 |
| enabled | bool | ✅ | true | 启用 |
| description | string | 否 | — | 处理指引（SOP 链接/操作建议） |

### 2.3 告警事件（DB：`alert_events`）

| 字段 | 说明 |
|------|------|
| id / rule_id | 事件标识 |
| severity / status | 级别 + 状态（firing/resolved/acknowledged） |
| message | 告警文案（含当前值/阈值/持续时间） |
| graph_url | 关联图表链接 |
| triggered_at / resolved_at | 触发/恢复时间 |
| ack_by / ack_at | 确认人/时间 |
| notifications | 已发送渠道记录 |

### 2.4 业务健康检查（DB：`health_checks`）

| 字段 | 说明 |
|------|------|
| id / name | 检查名（如"模型网关健康"/"知识库索引健康"） |
| check_type | http(探测 URL) / ping / script(脚本检查) / metric(指标阈值) / agent(对话探活：发一条测试消息) |
| target / interval | 目标与频率 |
| expected | 期望（HTTP 状态码/脚本退出码/回复关键词） |
| retries | 连续失败几次判 down |
| status | healthy/degraded/down |
| last_result / last_checked_at | 最近结果 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| MONITOR_ENABLED | bool | true | 监控总开关 | true/false | 热加载 |
| MONITOR_METRICS_ENABLED | bool | true | 指标采集 | true/false | 热加载 |
| MONITOR_LOGS_ENABLED | bool | true | 日志采集 | true/false | 热加载 |
| MONITOR_TRACES_ENABLED | bool | true | 链路采集 | true/false | 热加载 |
| MONITOR_TRACE_SAMPLE_RATE | float | 0.1 | 全链路采样率（低成本） | 0-1 | 热加载 |
| MONITOR_ERROR_SAMPLE_ALWAYS | bool | true | 错误请求必采样 | true/false | 热加载 |
| MONITOR_METRIC_EXPORT | enum | none | 指标导出 | none/prometheus/console | 重启 |
| MONITOR_ALERT_ENABLED | bool | true | 告警总开关 | true/false | 热加载 |
| MONITOR_ALERT_CHECK_INTERVAL | int | 15 | 规则检查周期秒 | 5-120 | 热加载 |
| MONITOR_RETENTION_METRICS_DAYS | int | 30 | 指标保留 | 7-3650 | 热加载 |
| MONITOR_RETENTION_LOGS_DAYS | int | 30 | 日志保留 | 7-3650 | 热加载 |
| MONITOR_RETENTION_TRACES_DAYS | int | 15 | 链路保留 | 7-3650 | 热加载 |
| MONITOR_HEALTH_CHECK_ENABLED | bool | true | 探活开关 | true/false | 热加载 |

### 3.2 内置告警规则模板（开箱即用）

| 规则 | 条件 | 级别 |
|------|------|------|
| 主服务 5xx | 错误率 > 5% 持续 2min | P1 |
| LLM 网关不可用 | 成功率 < 80% 持续 1min | P0 |
| 延迟飙升 | p95 > 10s 持续 5min | P1 |
| 成本异常 | 单日成本 > 阈值 2 倍 | P2 |
| 队列积压 | 任务队列 > 100 持续 5min | P2 |
| 知识库索引失败 | 文档处理失败 > 10 连续 | P2 |
| 数据漂移 | 输入分布漂移分数 > 阈值 | P2 |
| 评估退化 | 在线评分连续 3 日下降 | P2 |
| 调度器心跳 | 心跳超时 > 5min | P0 |

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 监控大盘（Dashboard）——核心

| 能力 | 说明 | 接口 |
|------|------|------|
| 总览卡片 | 今日调用量/成功率/P95 延迟/成本/活跃 agent | GET /admin/monitoring/overview |
| 实时曲线 | 按时间窗（1h/6h/24h/7d）看各指标趋势 | GET /admin/monitoring/metrics?name=&window= |
| 维度下钻 | 按 agent/模型/工具/渠道维度聚合 | ?group_by=agent_id |
| 对比 | 今日 vs 昨日/上周同期 | GET /admin/monitoring/compare |
| 图表库 | 折线/柱状/热力图/仪表盘布局自定义 | — |

### 4.2 告警管理（AlertPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 规则列表 | 规则/指标/条件/级别/状态/最近触发 | GET /admin/monitoring/alerts |
| 规则编辑 | 条件/窗口/级别/渠道/冷却/升级策略 | POST/PUT /admin/monitoring/alerts |
| 删除 | DELETE /admin/monitoring/alerts/{id}（已有） | ✅ |
| 测试告警 | 发一条测试通知验证渠道（**验证链路**） | POST /admin/monitoring/alerts/{id}/test |
| 事件列表 | 触发中/已恢复/已确认 | GET /admin/monitoring/alerts/events |
| 确认/关闭 | 确认（接手处理）/关闭（误报） | POST /admin/monitoring/alerts/events/{id}/ack |
| 静默 | 指定规则静默一段时间（发布窗口） | POST /admin/monitoring/alerts/{id}/silence |

### 4.3 链路与日志（TraceLogPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| Trace 列表 | 按时间/agent/状态/耗时/错误筛选 | GET /admin/monitoring/traces |
| Trace 详情 | 瀑布图：每段（对话/检索/工具/LLM）耗时+摘要+错误+成本 | GET /admin/monitoring/traces/{id} |
| 日志搜索 | 关键字/级别/时间/服务筛选（结构化字段过滤） | GET /admin/monitoring/logs?q=&level= |
| 日志详情 | 完整上下文（trace_id 关联） | GET /admin/monitoring/logs/{id} |
| 错误聚合 | 同类错误分组+次数+首次/最后出现 | GET /admin/monitoring/errors |

### 4.4 健康检查（HealthPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 健康状态页 | 各服务/依赖灯：主服务/模型网关/向量库/调度器/通知渠道 | GET /health（公开）+ /admin/monitoring/health（详细） |
| 探活配置 | 新增 HTTP 探测/脚本检查/agent 对话探活 | GET/POST /admin/monitoring/health-checks |
| 手动触发 | 立即跑一次探活 | POST /admin/monitoring/health-checks/{id}/run |
| 历史 | 健康波动历史（可用性百分比） | GET /admin/monitoring/health-checks/{id}/history |

### 4.5 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 数据漂移检测 | 输入分布对比（训练基线 vs 线上）漂移分数 | 🔶 已有 drift 模块雏形 |
| 告警升级链 | P1 超时未确认 → 升级到 leader | 🔶 待补 |
| 值班表 | 轮班设置/告警路由到当前值班人 | ⬜ |
| 周报 | 自动生成本周稳定性周报 | 🔶 待补 |
| 导出 | 监控数据导出 | 🔶 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 埋点链路（全链路 trace_id 贯穿）

```
请求进入 → 分配 trace_id
  → 每一段（鉴权/对话管线/检索/工具/LLM/通知）：
      ├─ 打点：start/end/耗时/状态/成本/输出摘要
      ├─ 异常 → 记录错误（+堆栈摘要，脱敏）
      └─ 按采样率决定是否存全链路（错误必存）
  → 请求结束 → 聚合指标（计数器+直方图）
```

### 5.2 告警判定链路

```
AlertEngine 每 CHECK_INTERVAL 扫描规则
  ├─ 取指标窗口值（如最近 5min 错误率）
  ├─ 条件匹配 + 持续时长 ≥ duration → 进入 firing
  ├─ 冷却检查（cooldown 内不重复）
  ├─ 按 severity 选择渠道发送（P0 短信+IM，P2 对话）
  ├─ escalate_after 未恢复 → 升级发送
  └─ 恢复（指标回正常且持续）→ 发送恢复通知 + 标记 resolved
```

### 5.3 数据漂移检测链路（模型退化预警）

```
周期性（每日）：
  ├─ 采样线上输入（EVAL/监控双通道）
  ├─ 与基线分布对比（embedding 分布/关键词分布/长度分布）
  ├─ 漂移分数 > 阈值 → P2 告警（"训练数据里有30%是去年的"场景预警）
  └─ 建议动作：更新评测集/重新评估
```

### 5.4 失败降级

| 场景 | 降级 |
|------|------|
| 指标存储不可用 | 内存环形缓冲（最近 5min）保底 + 告警自身告警 |
| 告警渠道全挂 | 控制台醒目展示 + 下次请求时重试 |
| 全链路采样关闭 | 错误请求始终采样（不丢失故障证据） |
| 监控自身崩溃 | 独立于主服务运行（守护进程拉起） |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：全量（规则/确认/健康检查）；开发者：查看（traces/logs 含业务数据）；用户：不可见 |
| 数据 | 日志/trace 含对话内容 → 按权限+脱敏（手机号/密钥打码）；保留期强制 |
| 防滥用 | 告警频率限制（冷却+最大值）；webhook 目标白名单 |
| 审计 | 规则变更/告警确认/静默操作审计 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 告警规则 CRUD | /admin/monitoring/alerts（GET/POST/PUT/DELETE） | admin/MonitoringPanel.tsx（已有基础） | ✅ | — |
| 告警事件/确认 | /admin/monitoring/alerts/events*、/ack | MonitoringPanel | 🔶 | 事件落库 |
| 测试告警 | POST .../alerts/{id}/test | MonitoringPanel | 🔶 | 渠道复用 |
| 监控大盘 | /admin/monitoring/overview、/metrics | MonitoringPanel | 🔶 | 指标埋点 |
| Trace 列表/详情 | /admin/monitoring/traces* | 新组件 TraceLogPanel.tsx | ⬜ | 链路埋点+前端 |
| 日志搜索 | /admin/monitoring/logs | TraceLogPanel | 🔶 | 日志结构化 |
| 错误聚合 | /admin/monitoring/errors | TraceLogPanel | ⬜ | — |
| 健康检查 | /admin/monitoring/health-checks* | HealthPanel（简化版已有） | 🔶 | 探活执行器 |
| 数据漂移 | /admin/monitoring/drift | MonitoringPanel | 🔶 | 漂移算法 |
| 值班/升级/周报 | — | — | ⬜ | — |

**验证方法**：
1. 建一条规则"错误率>50% 持续 10s → P1" → 故意制造失败请求 → 收到告警（告警链路通）。
2. 告警管理点"测试"→ 各渠道收到测试消息（渠道通）。
3. 完成一个对话请求 → Trace 列表出现 → 详情瀑布图各段耗时可见（链路通）。
4. 日志搜索按 trace_id 过滤 → 找到同一次请求全部日志（关联通）。
5. 停用模型网关 → 健康页状态变 down + P0 告警（探活通）。
