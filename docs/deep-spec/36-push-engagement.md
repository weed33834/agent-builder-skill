# 36 推送与触达（Push & User Engagement Delivery）

> 定位：Agent 平台的"主动触达层"——把"任务完成/需要审批/异常告警/定时提醒/运营通知"在用户不在线时可靠送达：多渠道推送（Push/短信/邮件/IM/站内信）、到达率保障（在线直推+离线推送+兜底）、免打扰与频率治理、触达效果追踪。与 09-schedule（定时任务触发）、12-monitor（告警）、33-多端（在线同步）、34-协作（@通知）互补：本篇聚焦"推送通道与触达治理"。
> 来源：腾讯云 Push（跨平台高可靠触达：在线/离线稳定送达、用户召回）/ MPush 高并发架构（消息队列削峰、多级缓存、智能路由、云边端协同、多端同步）/ 小程序-APP 对接（统一推送网关）/ 消息推送实践（免打扰、频率限制、到达率归因、深链回跳）。

---

## 一、定位与架构

- 核心价值：Agent 是异步的（任务后台跑、审批等人点），必须能在"用户离开对话"后仍把关键结果送达；推送是留存与召回的生命线
- 架构分层：触达事件源（09-schedule 定时/12-monitor 告警/07-workflow 审批/用户订阅）→ 触达编排（模板渲染/渠道选择/频率治理/免打扰）→ 推送网关（渠道适配器：APNs/FCM/厂商通道/短信/邮件/IM/站内信）→ 送达回执（到达/点击/转化归因）
- 渠道矩阵与选择策略：站内信（默认，必达可见）/ Push（高优先级，需权限）/ 短信（紧急：验证码/高危告警，成本高）/ 邮件（长文/报告，容量大）/ IM（企微钉钉飞书 Slack，B 端强触达）/ 深链（推送点击后回跳对应页面/会话）
- 触达分级：P0 紧急（审批超时/安全告警，多通道并行+短信兜底）/ P1 重要（任务完成/定时提醒，Push+站内信）/ P2 普通（运营/周报，站内信+邮件）/ P3 低优（产品更新，可合并每日摘要）
- 与相邻模块边界：09-schedule 管"什么时候触发"，本篇管"触发后怎么送达、送到哪、用户怎么回"；12-monitor 管"告警生成"，本篇管"告警触达与升级"；33-多端管"在线实时同步"，本篇管"离线触达与召回"

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| PushTemplate | tmpl_id / name / channel / title_tpl / body_tpl / deep_link_tpl / variables[] / status / version |
| DeliveryEvent | event_id / source(schedule|monitor|workflow|user) / source_ref / priority(p0-p3) / payload / template_ref / status |
| PushMessage | msg_id / event_ref / channel / target[](user|device|group) / content / deep_link / schedule_at / status |
| ChannelAdapter | adapter_id / name(apns|fcm|huawei|xiaomi|sms|email|im|inapp) / config_ref / health / quota_ref |
| QuietRule | rule_id / name / scope(user|group|global) / window(22:00-08:00) / exceptions[](priority|keywords|sender) / status |
| RateLimitRule | rule_id / scope / max_per_hour / max_per_day / channel_limits / status |
| Receipt | receipt_id / msg_ref / step(delivered|shown|clicked|converted) / ts / device_ref / channel / attribution |
| Subscriber | sub_id / user_id / channels[](inapp|push|sms|email|im) / preferences / quiet_rules[] / status |

生命周期：事件产生（DeliveryEvent）→ 模板渲染 → 渠道选择（优先级+用户偏好+免打扰）→ 推送（PushMessage）→ 回执采集（Receipt）→ 效果归因 → 触达统计

## 三、配置项全清单

- push.enabled（总开关）、push.channels[]（启用渠道，按平台/优先级配置）
- push.template.default（默认模板集）、push.template.render_engine（变量渲染引擎，含脱敏）
- push.priority.routing（P0 多通道并行+短信兜底 / P1 Push+站内信 / P2 站内信+邮件 / P3 合并摘要）
- push.deep_link.enabled（深链开关）、deep_link.sign（深链签名防伪造）
- push.quiet.enabled（免打扰开关）、quiet.default_window（默认 22:00-08:00）、quiet.exceptions[]
- push.rate.max_per_hour（默认 5/用户/小时）、max_per_day（默认 20/用户/天）、burst_limit
- push.retry.enabled（推送重试）、retry.max_attempts（默认 3）、retry.backoff
- push.receipt.enabled（回执开关）、receipt.timeout（未回执重发判定，默认 30min）
- push.fallback.chain（渠道兜底链：push→sms→email→inapp）
- push.merge.digest.enabled（P3 每日摘要合并开关）、digest.time（默认 09:00）、digest.max_items
- push.expire（消息过期时间，默认 24h，过期不再推送）
- push.provider.credentials（各厂商密钥，KMS 托管，16-L 联动）
- push.metrics.enabled（触达指标：到达率/点击率/转化率，上报 16-J 业务指标）

## 四、管理界面（增删改调 + 辅助功能）

- 模板中心：PushTemplate CRUD、模板变量编辑（占位符校验）、预览（模拟不同渠道渲染效果）、版本管理（发布/回滚）、AI 生成模板文案（多语言，16-M 联动）
- 发送中心：创建自定义推送（选择受众/渠道/时间）、定时发送（09-schedule）、测试发送（指定测试设备）、取消/撤回（未送达消息）
- 渠道管理：ChannelAdapter 列表（健康状况、配额、密钥轮换）、渠道启停、渠道优先级调整
- 免打扰管理：QuietRule CRUD（全局/组/个人）、例外规则（P0 可穿透、关键词例外）
- 频率治理：RateLimitRule CRUD、超限拦截记录、用户申诉处理
- 回执与效果：Receipt 漏斗（送达→展示→点击→转化）、按渠道/按模板/按事件类型下钻、归因报告（哪个渠道带来多少回访）
- 用户偏好中心（管理端）：查看/修改用户订阅渠道与偏好、批量调整（如全员改免打扰窗口）
- 触达看板：到达率/点击率趋势、渠道健康、P0 触达时效（30s 内送达率）、失败归因分布

## 五、运行时嵌入链路

- 触发链路：事件产生（09-schedule 到点 / 12-monitor 告警 / 07-workflow 审批流转 / 用户订阅回调）→ 组装 DeliveryEvent（priority）→ 查用户偏好+免打扰规则 → 通过则模板渲染 → 渠道选择（多通道并行 or 兜底链）→ 发送
- 发送链路：PushMessage 入队 → 渠道适配器（APNs/FCM/厂商通道/短信网关/邮件 SMTP/IM Webhook）→ 削峰（消息队列，MPush 式）→ 发送 → 记录 Receipt
- 回执链路：设备回执（delivered/clicked）→ 上报归因 → 未回执超时 → 兜底渠道（P0 短信）→ 仍失败 → 站内信兜底（保证可见）
- 深链链路：推送点击 → 深链解析（签名校验）→ 路由到对应会话/任务/审批页 → 用户直接续接（联动 33-多端会话迁移）
- 免打扰链路：推送前检查 QuietRule → P0 穿透（例外）→ 非 P0 在免打扰窗口则延迟至窗口结束（或并入次日摘要）
- 频率治理链路：发送前计数（RateLimitRule）→ 超限拦截 → 拦截事件记录 → 用户侧聚合提示（"有 3 条通知已折叠"）
- 失败降级：渠道不可用（厂商通道故障）→ 按 fallback.chain 切换 → 全部失败 → 站内信+下次登录补发
- 代码路径参考：engage/event_router（事件路由）、engage/template_engine（模板渲染）、engage/gateway（推送网关+适配器）、engage/quiet_guard（免打扰）、engage/receipt_tracker（回执归因）——与仓库 engage/notify 层衔接

## 六、安全与权限

- 发送权限：自定义推送仅运营/管理员（13-iam），敏感内容（密码/密钥）禁止进推送（脱敏，16-E）
- 深链安全：深链签名+过期校验，防伪造跳转
- 数据保护：推送内容最小化（只含必要信息）、模板变量脱敏、PII 不进推送（手机号打码）
- 合规：推送频率符合行业规范（过度推送投诉）、用户退订权（退订即停，含短信退订回执）、未成年人推送限制（16-M）
- 审计：所有推送（含系统触发）留痕：事件/受众/内容/渠道/结果

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 模板中心 | PushTemplateCenter | CRUD /api/push/templates + POST /api/push/templates/{id}/preview | ⬜ |
| 发送中心 | SendConsole | POST /api/push/send + POST /api/push/send/{id}/cancel | ⬜ |
| 渠道管理 | ChannelManager | GET /api/push/channels + POST /api/push/channels/{id}/rotate-key | ⬜ |
| 免打扰管理 | QuietRuleManager | CRUD /api/push/quiet-rules | ⬜ |
| 频率治理 | RateLimitManager | CRUD /api/push/rate-limits + GET /api/push/rate-limits/blocked | ⬜ |
| 回执与效果 | ReceiptAnalytics | GET /api/push/receipts + GET /api/push/receipts/funnel | ⬜ |
| 用户偏好中心 | SubscriberPreferences | GET /api/push/subscribers + PUT /api/push/subscribers/{id}/preferences | ⬜ |
| 触达看板 | EngageDashboard | GET /api/push/metrics | ⬜ |

验证：① 定时任务到点→P1 事件→Push+站内信双通道送达，用户离线也能收到 ② P0 告警 30s 内多通道触达，未回执自动短信兜底 ③ 免打扰窗口内非 P0 推送被延迟，P0 穿透 ④ 同一用户 1 小时超 5 条被拦截并折叠提示 ⑤ 推送点击深链正确回跳会话且签名有效 ⑥ 渠道故障自动切换兜底链，站内信保证可见 ⑦ 模板变量含敏感字段时脱敏后渲染 ⑧ 触达漏斗（送达/展示/点击/转化）数据可下钻
