# 25 性能工程（Performance Engineering）

> 定位：LLM 推理服务性能的量化管理——从指标定义到压测、从缓存到调度、从单机到集群。与 12-monitor（运行时监控）互补：12 管"发现故障"，本篇管"如何设计/测量/优化性能"。
> 来源：vLLM 推理引擎技术（PagedAttention/Continuous Batching/前缀缓存）/ SGLang / 推理加速实践（KV Cache/量化/推测解码）/ 性能调优指南。

---

## 一、定位与架构

- 核心指标三件套：
  - **TTFT**（Time-To-First-Token）：首 token 延迟，决定用户体验，典型目标 <1s
  - **TPOT**（Time-Per-Output-Token）：后续每 token 平均耗时，决定流畅度，典型 30-100ms
  - **吞吐量**（Throughput）：tokens/s 或 req/s，决定系统成本与利用率
- 权衡关系：吞吐量↑（batch size↑）→ 单用户时延↑；不同场景指标权重不同（对话重 TTFT、批处理重吞吐）
- 推理两阶段差异：Prefill（GEMM 密集，受计算限制）vs Decode（GEMV 密集，受内存带宽限制）
- 关键优化技术：KV Cache / PagedAttention（分页显存）/ Continuous Batching（动态批）/ 前缀缓存（Radix Attention）/ 推测解码 / 量化（INT8/FP8）/ Prefill-Decode 分离架构

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| PerfTest | test_id / name / scenario(chat|batch|stream) / target / duration / concurrency / ramp_up / payload |
| PerfMetric | metric_id / test_id / ttft_p50_p95_p99 / tpot / throughput_tps / req_per_sec / gpu_util / error_rate / latency_dist |
| CacheConfig | cache_id / scope(model|prompt|session) / ttl / max_size / hit_rate / price_mode |
| PoolConfig | pool_id / model / replicas / autoscale(thresholds) / batch_config / queue_policy |
| LoadProfile | profile_id / name / pattern(steady|spike|step) / rps / duration / payload_gen |

## 三、配置项全清单

- perf.targets.ttft_p95（目标阈值）、perf.targets.tpot、perf.targets.error_rate
- perf.batch.dynamic（动态批：preferred_batch_size / max_queue_delay_ms）
- perf.cache.prompt（前缀缓存开关：16-token 块哈希复用）
- perf.cache.semantic（语义缓存开关 + 相似度阈值）
- perf.autoscale.（副本伸缩：min/max/cpu_or_qps 阈值/冷却时间）
- perf.queue.（队列策略：FCFS/优先级/最大排队延迟）
- perf.streaming.buffer（流式缓冲配置）
- perf.timeouts（请求超时：connect/read/idle）
- perf.loadtest.defaults（压测默认参数：并发/时长/递增）

## 四、管理界面（增删改调 + 辅助功能）

- 性能看板：实时 TTFT/TPOT/吞吐/错误率 + GPU 利用率 + 队列深度
- 压测中心：场景配置（并发/时长/负载模式）、一键压测、历史报告
- 报告对比：历次压测指标对比、基线漂移检测、SLO 达成率
- 缓存管理：prompt/语义缓存命中率、缓存条目查看/清理、价格模式
- 资源池管理：副本数、自动伸缩规则、批处理参数
- 调优建议：自动识别瓶颈（TTFT 高→加 prefill 资源/缓存；吞吐低→调 batch/量化）
- 队列监控：排队长度、等待时间、丢弃率

## 五、运行时嵌入链路

- 请求路径：网关 → 队列调度（优先级/批合并）→ 推理引擎（PagedAttention/KV Cache/前缀缓存）→ 流式返回
- 指标采集：每次请求记录 TTFT/TPOT/tokens → 聚合进监控（12-monitor）
- 自动伸缩：指标触发 → 扩缩副本
- 降级链：队列满 → 限流（429）→ 降级模型 → 缓存兜底
- 前端配合：流式渲染（20-底层 A 域）+ 打字机效果 + 断线重连

## 六、安全与权限

- 压测权限：仅管理员（可压垮生产）
- 压测环境隔离：压测在 staging 执行，生产压测需审批
- 配置保护：引擎参数修改需审批（可能影响成本/稳定性）
- 缓存安全：缓存内容脱敏（不缓存含敏感信息的响应）

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 性能看板 | PerfDashboard | GET /api/perf/current | ⬜ |
| 压测中心 | LoadTestRunner | POST /api/loadtests + GET 报告 | ⬜ |
| 报告对比 | PerfComparePage | GET /api/loadtests/compare | ⬜ |
| 缓存管理 | CacheManager | CRUD /api/caches + GET 命中率 | ⬜ |
| 资源池管理 | PoolManager | CRUD /api/pools | ⬜ |
| 队列监控 | QueueMonitor | GET /api/queues/stats | ⬜ |

验证：① 压测 100 并发→报告含 TTFT/吞吐/错误率 ② 开启前缀缓存→重复提问命中率↑TTFT↓ ③ 自动伸缩触发（负载↑副本↑）④ 队列满→429 而非崩溃 ⑤ SLO 指标达成率可视化
