# 33 多端与端云协同（Multi-End & Cloud-Edge Sync）

> 定位：Agent 平台"无处不在"的触达层——Web/桌面/小程序/App/企业 IM 多渠道一致体验，核心是"状态同步而非数据广播"：服务端统一分配全局递增消息 ID（雪花算法），各端按序拉取/推送，离线缓存、断点续传、端云协同。与 15-ux-detail（单端交互细节）、16-G（开放平台渠道接入）、36-推送触达（Push 通道）互补：本篇聚焦"多端架构与同步一致性"。
> 来源：多端架构实践（React Native/Flutter/UniApp 跨端选型）/ 腾讯云 IM + Push 一站式方案（在线离线稳定送达）/ MPush 高并发架构（分布式软总线、多端消息同步、云边端协同、原子化服务）/ 小程序-APP 无缝对接（REST + WebSocket 双通道）/ 消息同步"状态同步而非数据广播"原则 + 服务端雪花 ID 全局排序。

---

## 一、定位与架构

- 核心价值：一套 Agent 能力，多端一致触达（Web 深度交互 / 移动端碎片交互 / 桌面常驻 / IM 内嵌）；会话、消息、任务、资产跨端无缝续接
- 架构分层：端（Web/桌面/小程序/App/IM）→ 端云同步层（长连接 + 增量同步 + 离线队列）→ 网关（鉴权/路由/限流）→ Agent 服务（会话/任务/资产）
- 同步原则：**状态同步而非数据广播**——服务端为每条消息分配全局唯一递增 ID（雪花算法/DB 自增+业务前缀），客户端以"游标拉取"代替"全量推送"，保证多端顺序一致
- 通道矩阵：WebSocket（在线实时）/ HTTP 轮询（弱网降级）/ SSE（单向流式）/ 推送（离线触达，36-推送）/ 短连接轮询（IM 渠道）
- 端云协同分工：云端负责会话状态机与生成（重计算）；端上负责渲染、输入缓存、草稿、本地收藏（轻状态）；离线时端上可继续编辑，恢复后合并上传
- 与相邻模块边界：15-ux-detail 管"每个端界面上长什么样"，本篇管"多端怎么连、怎么同步、怎么保持一致"；36-推送管"离线怎么触达"，本篇管"在线同步与状态一致性"；16-G 管"第三方渠道怎么接入"，本篇管"自有多端架构"

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| ClientApp | app_id / name / platform(web|desktop|miniprogram|ios|android|im) / version / channel / status / owner |
| Device | device_id / user_id / app_ref / platform / os_version / push_token / last_seen / status(online|offline|disabled) |
| SyncCursor | cursor_key(user_id|session_id|stream_id) / last_seq / last_ts / device_ref / status |
| StreamMessage | msg_id(全局递增雪花ID) / stream_key / seq / type(text|tool|event|artifact) / payload_ref / ts / author / status |
| OfflineQueue | queue_id / device_ref / action(pending|retry) / payload / attempts / next_retry / status |
| SyncConflict | conflict_id / stream_key / base_seq / local_change / remote_change / resolution(manual|auto_lww|server_wins) / resolved_at |
| EndSession | session_id / user_id / device_ref / started_at / ended_at / resume_state / sync_status |
| DeltaPatch | patch_id / stream_key / base_version / ops[](insert|delete|update) / checksum / status |

生命周期：ClientApp 注册 → Device 绑定（登录/换机）→ 建立长连接 → 游标初始化 → 增量同步（消息/状态/资产）→ 离线（队列缓存）→ 重连（断点续传+补拉）→ 冲突解决 → 会话迁移/登出解绑

## 三、配置项全清单

- multiend.enabled（多端总开关）、multiend.platforms[]（启用端列表）
- sync.mode（push|pull|hybrid，默认 hybrid：在线推+游标拉兜底）
- sync.cursor.batch_size（单次拉取条数，默认 200）、sync.cursor.max_seq_gap（差距过大触发全量重建）
- sync.heartbeat.interval（心跳间隔 s，默认 30）、heartbeat.timeout（判定离线阈值 s，默认 90）
- sync.reconnect.backoff（重连退避：指数 1s→2s→4s→…上限 60s）、reconnect.max_attempts
- sync.offline.queue.enabled（离线队列开关）、queue.max_size（默认 500 条）、queue.ttl（默认 7 天）
- sync.offline.upload.mode（手动|自动|WiFi-only，默认自动）
- sync.conflict.strategy（manual|auto_lww|server_wins，默认 manual 高风险 / server_wins 低风险）
- sync.delta.enabled（增量补丁开关）、delta.checksum（一致性校验开关）
- multiend.device.max_per_user（单用户设备上限，默认 5）、device.auto_kick（超限踢旧设备开关）
- multiend.session.resume.enabled（跨端续接开关）、resume.ttl（会话挂起保留时长，默认 24h）
- sync.encryption（同步链路加密开关，TLS+业务层加密）
- sync.metrics.enabled（同步指标：延迟/成功率/冲突率，上报 12-monitor）

## 四、管理界面（增删改调 + 辅助功能）

- 端管理：ClientApp CRUD（注册/启停/版本发布）、设备列表（在线状态、推送 token、最后活跃、踢下线/禁用）
- 同步监控台：实时同步链路（长连接数、消息吞吐、同步延迟 p50/p95、离线队列水位）、按端/按用户下钻
- 游标管理：SyncCursor 列表（异常游标检测：落后过大/漂移）、手动重置游标（重建同步）
- 离线队列管理：查看各设备离线队列、手动触发补拉/重放、清理过期队列
- 冲突中心：SyncConflict 列表（冲突详情：本地/远端变更对比）、人工裁决界面（选边/合并）、解决策略批量配置
- 多端会话视图：同一会话在多端的状态（端上挂起/已同步/有本地未上传改动）、跨端续接操作（把会话"转到手机"）
- 端版本管理：版本发布记录、强制升级策略（低于最低版本禁用）、灰度发布
- 指标看板：同步成功率、冲突率、离线转在线转化率、端活跃分布

## 五、运行时嵌入链路

- 连接建立：端启动 → 获取会话（鉴权 13-iam）→ WebSocket 建连 → 服务端下发 SyncCursor（last_seq）→ 增量拉取缺失消息（游标续传）
- 消息上行：用户在 A 端发送 → 服务端分配雪花 msg_id → 持久化 → 广播给在线端（B/C）→ 离线端通过游标下次拉取
- 流式下行：SSE/WS 推送 token 流 → 各端渲染（15-ux-detail 流式气泡）→ 消息完成时落库更新 seq → 引用/工具卡等富内容随事件下发
- 离线处理：断网 → 本地草稿/操作入 OfflineQueue → 重连后按序上传（幂等键防重）→ 服务端合并 → 返回新游标 → 补拉遗漏
- 冲突处理：两端同时改同一资产 → 检测 base_seq 冲突 → 按策略：server_wins（服务端版本为准，通知落选端）/ auto_lww（最后写入者胜，按服务端时间戳）/ manual（进冲突中心人工裁决）
- 跨端续接：用户在手机点"继续电脑上的会话" → 服务端把会话上下文快照（含挂起任务状态）绑定新端 → 新端重建上下文（03-context）→ 原端标记已迁移
- 失败降级：WS 断开 → 心跳探测 → 指数退避重连 → 重连失败切 HTTP 游标轮询 → 轮询也失败 → 转离线模式 + 36-推送触达
- 代码路径参考：gateway/ws_gateway（长连接网关）、sync/stream_router（消息路由与游标）、sync/cursor_store（游标存储）、sync/offline_queue（离线队列）、sync/conflict_resolver（冲突解决）——与仓库 gateway/sync 层衔接

## 六、安全与权限

- 链路加密：TLS 全链路 + 敏感字段业务层加密（16-L 联动）
- 设备绑定鉴权：设备登录令牌（一次性）、换机需重新鉴权、设备吊销（丢失设备一键下线）
- 权限继承：多端同步内容受 13-iam 授权约束；端上缓存数据加密存储、退出登录即清除
- 防重放：消息幂等键（客户端生成 + 服务端去重）、seq 单调递增校验
- 审计：设备绑定/解绑、游标重置、冲突裁决、强制升级全程留痕
- 未成年人/合规：端上数据留存策略（16-M 联动）、数据驻留区域（16-L）

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 端管理 | ClientAppManager | CRUD /api/multiend/apps + POST /api/multiend/apps/{id}/disable | ⬜ |
| 设备管理 | DeviceManager | GET /api/multiend/devices + POST /api/multiend/devices/{id}/kick + /disable | ⬜ |
| 同步监控台 | SyncMonitor | GET /api/multiend/sync/stats + GET /api/multiend/sync/streams | ⬜ |
| 游标管理 | CursorManager | GET /api/multiend/cursors + POST /api/multiend/cursors/{id}/reset | ⬜ |
| 离线队列管理 | OfflineQueueView | GET /api/multiend/offline + POST /api/multiend/offline/{id}/replay | ⬜ |
| 冲突中心 | ConflictCenter | GET /api/multiend/conflicts + POST /api/multiend/conflicts/{id}/resolve | ⬜ |
| 多端会话视图 | EndSessionView | GET /api/multiend/sessions + POST /api/multiend/sessions/{id}/transfer | ⬜ |

验证：① 双端同时在线，A 发消息 B 秒级可见且顺序一致（雪花 ID 有序）② 断网 2 分钟离线操作，重连后自动补传且无重复消息（幂等）③ 两端同时改同一会话标题，触发冲突并按策略解决 ④ 手机端"续接"电脑会话，上下文完整迁移 ⑤ 心跳超时后设备正确标记离线，重连后游标续传 ⑥ 踢下线后设备令牌立即失效 ⑦ 同步指标上报 12-monitor 且延迟 p95 达标
