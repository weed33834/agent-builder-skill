# 35 弱网与离线韧性（Weak-Network & Offline Resilience）

> 定位：Agent 平台在"网络不可靠"环境下的生存能力——移动弱网、断断续续、离线场景下保证操作不丢、状态可恢复、体验可降级。覆盖：请求重试与退避、请求排队与幂等、离线缓存与同步、断点续传、服务降级阶梯（限流→熔断→降级→缓存兜底）。与 20-底层（并发韧性四件套）、25-性能（缓存/自动伸缩）、33-多端（离线队列）、12-monitor（告警）互补：本篇聚焦"端到端的弱网/离线策略体系"。
> 来源：LLM API 优雅降级实践（按错误类型切换备用模型：限流→备用服务、长输入→长上下文模型、格式不符→更强模型）/ 断点续传（文件/数据分块传输）/ 微服务降级与熔断（超时降级/失败次数降级/限流降级/线程隔离舱壁）/ 离线优先架构（本地优先、冲突合并、同步补偿）。

---

## 一、定位与架构

- 核心价值：移动场景（地铁/电梯/偏远地区）与不稳定网络下，用户操作不丢失、生成不中断、任务可恢复；把"网络抖动"从用户感知中抹掉
- 分层策略：传输层（重试/退避/超时）→ 队列层（离线排队/幂等）→ 缓存层（响应缓存/本地快照）→ 服务层（限流/熔断/降级阶梯）→ 恢复层（补偿/对账/断点续传）
- 降级阶梯（由轻到重）：限流（预防）→ 重试退避（瞬时故障）→ 熔断（持续故障，舱壁隔离）→ 降级（备用模型/简化响应）→ 缓存兜底（读旧数据）→ 离线模式（纯本地）
- LLM 专属降级：按错误类型路由（限流→备用 provider / 超长输入→长上下文模型 / 格式不符→更强模型 / 上下文溢出→压缩后重试，联动 03-context）
- 与相邻模块边界：20-底层 提供"并发四件套"原语（限流/熔断/重试/超时），本篇组织为"端到端韧性策略+管理界面+离线体验"；06-models 管"provider 与 fallback 配置"，本篇管"策略触发与降级体验"；33-多端 管"多端同步"，本篇管"单端离线与恢复"

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| RetryPolicy | policy_id / name / scope(api|llm|upload|sync) / max_attempts / base_delay / max_delay / backoff(linear|exponential|jitter) / retryable_codes[] |
| TimeoutPolicy | policy_id / scope / connect_timeout / read_timeout / total_timeout / streaming_idle_timeout |
| CircuitBreaker | cb_id / name / scope / failure_threshold / window_sec / half_open_probe_count / cooldown_sec / state(closed|open|half_open) |
| DegradeRule | rule_id / scope / trigger(rate|error_rate|latency|manual) / actions[](switch_provider|simplify|use_cache|offline) / fallback_ref / status |
| CacheEntry | cache_id / scope / key / value_ref / policy(ttl|stale_while_revalidate|no_cache) / created_at / hits |
| OfflineTask | task_id / user_id / device_ref / kind(chat|upload|edit|run) / payload / idempotency_key / attempts / status(pending|uploading|done|failed) / next_retry |
| ResumePoint | resume_id / transfer_id / total_size / done_size / chunk_size / checksum / status / expired_at |
| CompensateJob | job_id / scope / plan[](verify|reconcile|rollback|notify) / status / result / trace_id |

生命周期：请求进入 → 策略匹配（Retry/Timeout/CircuitBreaker）→ 成功/失败 → 失败入 OfflineTask（幂等键）→ 后台补传 → 校验（CompensateJob 对账）→ 完成/告警

## 三、配置项全清单

- resilience.retry.max_attempts（默认 3）、retry.base_delay_ms（默认 500）、retry.max_delay_ms（默认 30000）
- resilience.retry.backoff（linear|exponential|jitter，默认 exponential+jitter 防惊群）
- resilience.retry.retryable_codes（可重试错误码：网络错误/5xx/429/超时；4xx 业务错误不重试）
- resilience.timeout.connect_ms（默认 5000）、timeout.read_ms（默认 30000）、timeout.streaming_idle_ms（流式空闲判定，默认 15000）
- resilience.circuit.failure_threshold（默认 5 次）、window_sec（默认 60）、cooldown_sec（默认 30）、half_open_probe_count（默认 1）
- resilience.degrade.auto.enabled（自动降级开关）、degrade.trigger.error_rate（默认 30%）、degrade.trigger.p99_latency_ms
- resilience.degrade.llm.routes[]（错误类型→备用动作：limit→provider_b、long_input→long_ctx_model、format→stronger_model、overflow→compress_retry）
- resilience.cache.enabled（响应缓存开关）、cache.default_ttl_sec、cache.stale_while_revalidate（过期可读旧值后台刷新）
- resilience.offline.enabled（离线模式开关）、offline.max_queue（默认 100）、offline.expire_days（默认 7）
- resilience.upload.chunk_size（断点续传分块大小，默认 1MB）、upload.resume.enabled
- resilience.idempotency.enabled（幂等开关）、idempotency.key_ttl（默认 24h）
- resilience.reconcile.schedule（对账任务周期，联动 09-schedule）、reconcile.enabled
- resilience.notify（降级事件通知：触发/恢复，联动 36-推送 + 12-monitor）

## 四、管理界面（增删改调 + 辅助功能）

- 策略中心：Retry/Timeout/CircuitBreaker/DegradeRule 的 CRUD 与启停、策略生效范围（全局/接口/LLM 调用）
- 熔断器看板：各熔断器状态（closed/open/half_open）、触发次数、冷却倒计时、手动重置
- 降级事件流：实时降级事件列表（时间/范围/触发原因/执行动作/恢复时间）、按服务/按错误类型筛选
- 缓存管理：CacheEntry 命中率统计、缓存清理、缓存预热（常用查询预加载）
- 离线任务中心：OfflineTask 列表（用户/设备/类型/状态/重试次数）、手动重试/取消/清理过期任务
- 断点续传管理：ResumePoint 列表（传输进度）、过期清理、手动续传触发
- 对账中心：CompensateJob 执行记录（校验结果/差异明细/处理动作）、差异处理（补发/回滚/通知用户）
- 弱网模拟实验室：模拟网络条件（丢包率/延迟/带宽限制/抖动）→ 验证策略生效 → 生成韧性测试报告
- 韧性报告：降级次数趋势、熔断次数、离线任务成功率、缓存命中率、对账差异率

## 五、运行时嵌入链路

- 请求韧性链路：请求发起 → 幂等键生成 → 超时控制（connect/read/streaming idle）→ 重试策略（退避+抖动）→ 熔断器检查（open 直接走降级）→ 执行 → 失败入队
- LLM 降级链路：LLM 调用失败 → 错误分类（429/5xx/超时/上下文溢出/格式不符）→ 按 DegradeRule 路由（切换 provider/模型/压缩重试）→ 仍失败 → 缓存兜底（若有同 query 缓存）→ 仍失败 → 降级响应（简化答案+声明）
- 离线链路：断网 → 用户操作入 OfflineTask（本地）→ 网络恢复 → 按序上传（幂等键去重）→ 服务端处理 → 结果回写 → 用户可见"已同步"
- 断点续传链路：大文件上传 → 分块（chunk_size）→ 记录 ResumePoint → 中断 → 重连后从 done_size 续传 → 全部完成 → checksum 校验
- 对账链路：定时对账（09-schedule）→ 校验"客户端已上报 vs 服务端已接收"差异 → 差异处理（补传/标记失败/通知）
- 降级恢复链路：故障恢复 → 熔断器 half_open 探测 → 成功则关闭 → 通知"服务已恢复"（36-推送）→ 缓存失效策略（避免读陈旧）
- 代码路径参考：resilience/retry.py、resilience/circuit_breaker.py、resilience/degrade_router.py（LLM 路由降级）、resilience/offline_queue.py（离线任务）、resilience/chunk_upload.py（断点续传）、resilience/reconcile.py（对账）——与仓库 resilience 层衔接

## 六、安全与权限

- 降级操作审计：所有降级动作（切换 provider/简化响应）记录 trace_id 与原因（12-monitor 联动）
- 降级不降安全：降级响应不绕过权限校验、不暴露内部错误细节（给用户友好文案，17-ai-lessons）
- 缓存安全：缓存内容按权限隔离（不缓存越权数据）、敏感数据不进缓存（白名单机制）
- 离线任务安全：离线任务仅限本人设备、本地缓存加密、登出即清
- 幂等安全：幂等键防重放、防重复扣费/重复执行
- 配置权限：策略配置仅运维/管理员可改（13-iam），变更留痕

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 策略中心 | ResiliencePolicyCenter | CRUD /api/resilience/policies + POST /api/resilience/policies/{id}/toggle | ⬜ |
| 熔断器看板 | CircuitBreakerBoard | GET /api/resilience/circuits + POST /api/resilience/circuits/{id}/reset | ⬜ |
| 降级事件流 | DegradeEventStream | GET /api/resilience/events + WS 实时订阅 | ⬜ |
| 缓存管理 | CacheManager | GET /api/resilience/cache + POST /api/resilience/cache/{key}/clear | ⬜ |
| 离线任务中心 | OfflineTaskCenter | GET /api/resilience/offline + POST /api/resilience/offline/{id}/retry | ⬜ |
| 断点续传管理 | ResumeTransferView | GET /api/resilience/transfers + POST /api/resilience/transfers/{id}/resume | ⬜ |
| 对账中心 | ReconcileCenter | GET /api/resilience/reconcile + POST /api/resilience/reconcile/run | ⬜ |
| 弱网模拟实验室 | WeakNetLab | POST /api/resilience/lab/simulate + GET /api/resilience/lab/report | ⬜ |

验证：① 模拟 30% 丢包：请求自动重试且最终成功（无用户可见失败）② 连续失败触发熔断 open→降级→恢复后半开探测→closed ③ LLM 限流时自动切换备用 provider，用户无感 ④ 断网发送 3 条消息，恢复后自动补发且无重复（幂等）⑤ 大文件上传中断后断点续传成功且 checksum 一致 ⑥ 对账发现客户端与服务端不一致后差异正确处理 ⑦ 降级响应不泄露内部错误且不绕过权限 ⑧ 弱网实验室模拟→韧性报告可导出
