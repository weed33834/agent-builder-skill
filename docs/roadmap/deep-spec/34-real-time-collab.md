# 34 实时协作（Real-Time Collaboration）

> 定位：Agent 平台的"多人协同层"——多用户在同一会话/工作区/文档上实时协作：在线状态、光标与操作同步、冲突检测与解决、操作日志回溯、角色权限实时生效。与 16-I（团队协作共享：评论/分享/审批流）、33-多端（设备级同步）、13-iam（权限）、15-ux-detail（协作会话 UI）互补：本篇聚焦"实时协作技术底座"。
> 来源：实时协作架构实践（Label Studio：WS 通信层+操作日志+状态合并）/ Rust 全栈实时协作（JWT 认证、Redis 缓存、冲突解决）/ 协同编辑冲突处理研究（操作标识+冲突合并算法）/ Excel 多人协作（区域锁定、变更优先级、颜色标记）/ Git 冲突模型（版本基线+三方合并）。

---

## 一、定位与架构

- 核心价值：让"一个人跟 Agent 对话"升级为"一个团队跟 Agent 协同"——共享会话、共享工作区、共享画布/文档，实时看到彼此的修改与 Agent 的进展
- 架构分层：客户端（本地操作 + 乐观更新）→ 实时通道（WebSocket，连接管理/心跳/路由）→ 协作服务（操作接收/排序/广播/冲突检测）→ 状态存储（文档状态 + 操作日志 LWW/CRDT）→ 持久化
- 一致性模型：最终一致性（默认）+ 强一致（敏感区域，如审批字段）；冲突解决策略矩阵：区域锁定 / 变更优先级 / 操作合并（OT 变换）/ 版本基线（Git 式三方合并）
- 协作对象：会话（多人同看同发消息）/ 工作区画布（多人拖拽节点）/ 文档编辑（富文本协同）/ 任务（多人认领推进）
- 与相邻模块边界：16-I 管"业务层协作流程"（谁分享给谁、审批流怎么配），本篇管"技术层并发控制"（两个人在同一秒改同一处怎么不丢）；33-多端管"同一人多端"，本篇管"多人在一端/多端"

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| CollabSession | collab_id / object_type(session|canvas|doc|task) / object_ref / participants[](user_id|role) / mode(view|comment|edit|admin) / status(active|archived) |
| Presence | presence_id / collab_ref / user_id / device_ref / status(online|away|offline) / last_active / cursor_pos / selection[] |
| Operation | op_id / collab_ref / user_id / base_version / type(insert|delete|update|move|run) / target / payload / lamport_ts / server_seq / status |
| OpLog | log_id / collab_ref / op_ids[] / start_ts / end_ts / author / checksum / snapshot_ref |
| ConflictRecord | conflict_id / collab_ref / op_a / op_b / type(overlap|order|schema) / resolution(auto|manual|rejected) / resolved_by / resolved_at |
| LockRegion | lock_id / collab_ref / region(key|range|node_id) / holder / expires_at / strategy(soft|hard) |
| CollabSnapshot | snap_id / collab_ref / version / content_ref / checksum / created_by / created_at |
| ReviewPoint | review_id / collab_ref / author / target_version / comment / status(open|approved|rejected) / resolved_at |

生命周期：创建协作会话（邀请/公开链接）→ 参与者加入（Presence 上线）→ 实时操作流（OpLog 累积）→ 冲突检测与解决（ConflictRecord）→ 快照定期生成（可回滚）→ 结束/归档（参与者退出、权限回收）

## 三、配置项全清单

- collab.enabled（总开关）、collab.object_types[]（启用的协作对象）
- collab.channel.engine（websocket|sse|polling，默认 websocket）、channel.heartbeat.interval（默认 25s）
- collab.presence.enabled（在线状态开关）、presence.expire_after（离线判定，默认 60s）
- collab.oplog.enabled（操作日志开关）、oplog.retention.days（日志保留，默认 90 天）
- collab.oplog.snapshot.interval（快照频率：每 N 条 op 或 N 分钟）
- collab.conflict.strategy（lock_region|priority|merge|baseline，按对象类型可分别配置）
- collab.conflict.auto_resolve（自动解决开关：仅低风险类型）、auto_resolve.rules[]（如"注释类 op 可自动合并"）
- collab.lock.enabled（区域锁定开关）、lock.hold_timeout（持有超时释放，默认 5min）、lock.max_per_user
- collab.version.lamport（Lamport 时钟排序开关，跨设备因果排序）
- collab.history.replay（操作回放开关：可回放任意版本区间）
- collab.max_participants（单会话最大人数，默认 50）、collab.guest.enabled（游客协作开关）
- collab.notify（协作事件通知：加入/修改/冲突，联动 36-推送）
- collab.metrics.enabled（协作指标：并发数/op 延迟/冲突率，上报 12-monitor）

## 四、管理界面（增删改调 + 辅助功能）

- 协作会话管理：CollabSession 列表（对象/参与者/状态）、创建/关闭/归档会话、调整参与者角色
- 在线状态面板：Presence 实时视图（谁在哪个对象上、光标位置、最近活跃）、@提醒在线成员
- 操作日志查看器：OpLog 时间线（按人/按对象/按类型过滤）、单条 op 详情（before/after）、回放模式
- 冲突中心：ConflictRecord 列表（冲突类型/涉及操作/自动或人工解决）、人工裁决界面（选边/合并预览）
- 区域锁定管理：LockRegion 列表（持有者/过期时间）、强制释放锁、锁定策略配置
- 快照管理：CollabSnapshot 列表、对比任意两版本（diff 视图）、回滚到指定快照（需审批，联动 13-iam）
- 审查流：ReviewPoint 列表（@某人审查改动）、批准/驳回、审查历史
- 协作配置：各对象类型的冲突策略/锁策略/人数上限配置
- 协作看板：并发协作数、op 延迟、冲突率、解决耗时、活跃协作对象排行

## 五、运行时嵌入链路

- 加入链路：用户点开共享会话/工作区 → 鉴权（13-iam 角色）→ WS 建连 → 服务端下发 Presence + 最近快照 + 未应用 op 队列 → 客户端渲染当前状态
- 操作上行：用户编辑 → 客户端本地乐观更新（即时反馈）→ 生成 Operation（base_version + Lamport 时间戳）→ WS 上行 → 协作服务排序（server_seq）→ 广播给其他在线端 → 其他端应用 op（本地冲突检测）
- 冲突检测：新 op 的 base_version < 服务端当前版本 → 判冲突 → 按对象类型策略处理（lock_region 拒绝并提示 / priority 高优先级生效 / merge 尝试合并 / baseline 三方合并）
- Agent 协作：Agent 在工作区执行任务（拖拽节点/写文档）→ 以"Agent 身份"产生 op 流 → 用户实时看到 Agent 进展（15-ux-detail 任务卡）→ 用户可打断/接管（HITL，07-workflow）
- 回放/审计：任意版本区间回放（OpLog）→ 定位"谁在什么时候改了什么"→ 争议仲裁
- 失败降级：WS 断开 → 本地 op 入队（33-多端离线队列）→ 重连后按 server_seq 补发 → 服务端按版本合并 → 无法自动合并进冲突中心
- 代码路径参考：collab/ws_hub（连接与广播）、collab/op_store（操作存储）、collab/conflict_engine（冲突检测与解决）、collab/presence_tracker（在线状态）——与仓库 gateway/collab 层衔接

## 六、安全与权限

- 角色矩阵：view（只读）/ comment（评论）/ edit（编辑）/ admin（管理）四级，实时生效（改权限立即踢出或降级）
- 会话级权限：私有（仅邀请）/ 组织内（16-A）/ 公开链接（可选密码，16-I 分享规则）
- 敏感区域保护：审批/费用/密钥字段锁定（仅 admin 可改），锁定区域不可被普通成员编辑
- 操作审计：所有 op 入 OpLog（who/what/when/before/after），保留期可配
- 防滥用：消息频率限制、并发 op 数限制、游客权限受限（只读+评论）
- 数据安全：协作内容加密存储、快照/日志脱敏、导出权限受控

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 协作会话管理 | CollabSessionPanel | CRUD /api/collab/sessions + POST /api/collab/sessions/{id}/invite | ⬜ |
| 在线状态面板 | PresenceView | GET /api/collab/{ref}/presence + WS 实时订阅 | ⬜ |
| 操作日志查看器 | OpLogViewer | GET /api/collab/{ref}/ops + POST /api/collab/{ref}/ops/replay | ⬜ |
| 冲突中心 | ConflictCenter | GET /api/collab/conflicts + POST /api/collab/conflicts/{id}/resolve | ⬜ |
| 区域锁定管理 | LockManager | GET /api/collab/locks + POST /api/collab/locks/{id}/release | ⬜ |
| 快照管理 | SnapshotManager | GET /api/collab/snapshots + POST /api/collab/snapshots/{id}/rollback | ⬜ |
| 审查流 | ReviewFlow | POST /api/collab/reviews + POST /api/collab/reviews/{id}/approve | ⬜ |
| 协作看板 | CollabDashboard | GET /api/collab/metrics | ⬜ |

验证：① 两人同时打开同一工作区，A 移动节点 B 端 1s 内看到 ② 两人同时改同一文本框触发冲突，按策略解决且不丢改动 ③ 锁定区域被普通成员编辑被拒绝并提示 ④ 操作日志可回放定位"谁改了什么" ⑤ admin 把某成员降级为 view，其编辑立即被拒 ⑥ Agent 协作任务中用户可实时看到 Agent op 流并可打断 ⑦ 断线重连后本地操作补发不丢失、不重复
