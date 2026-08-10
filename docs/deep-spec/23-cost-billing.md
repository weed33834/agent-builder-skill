# 23 成本计费与配额治理（Cost, Billing & Quota Governance）

> 定位：LLM 应用的"钱"维度全链路管理——从单次调用成本到企业预算，从配额控制到内部结算。与 06-models（成本统计）+ 16-F（成本治理）互补：06 管"记录"，16-F 管"企业预算/分摊"，本篇管"计费引擎/配额调度/成本优化的完整机制"。
> 来源：LiteLLM/OpenRouter 成本优化 / Langfuse 成本追踪 / 云厂商计费体系 / CostBench 动态成本建模。

---

## 一、定位与架构

- 成本结构认知：按 Token 计费（输入/输出分开计价）、模型差价巨大（GPT-4 vs 3.5 达 20 倍）、上下文长度线性放大成本、区域定价差异、失败重试隐性成本
- 四层优化架构：成本可视化归因 → 智能路由降级 → 缓存复用 → 提示词瘦身
- 计费引擎三要素：计量（用量采集）→ 计价（价格表）→ 结算（账单/分摊）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| UsageRecord | record_id / session_id / user_id / org_id / model / provider / input_tokens / output_tokens / cache_tokens / ttft / latency / cost / timestamp / feature_tag |
| PriceItem | model / provider / input_price / output_price / cache_read_price / currency / effective_from |
| Budget | budget_id / org_id / period / amount / used / threshold_alerts[] / status |
| Quota | quota_id / scope(user/org/key) / token_limit / concurrency_limit / storage_limit / period / reset_policy |
| Invoice | invoice_id / org_id / period / items[] / total / currency / status |
| CostReport | report_id / dims / metrics / schedule / recipients |

## 三、配置项全清单

- billing.currency（结算币种）、billing.rounding（精度）
- billing.price_overrides（自定义价格表，可覆盖模型默认价）
- billing.cache.enabled（缓存计价开关：读缓存价低于原价）
- billing.batch.discount（批量折扣率）
- quota.defaults.（各范围默认配额：user/org/key）
- quota.overage_policy（超限策略：告警→限速→降级→熔断→停用）
- budget.alert_thresholds（阶梯告警：50/80/90/100%）
- billing.invoice.auto（自动出账周期）

## 四、管理界面（增删改调 + 辅助功能）

- 成本看板：实时总成本/按模型/按功能模块/按用户/按组织下钻
- 价格表管理：模型价格 CRUD + 批量导入 + 历史版本
- 预算管理：创建/调整预算、阶梯告警配置、超限自动动作
- 配额管理：按范围设置配额、实时用量、调整、临时提升
- 账单管理：自动出账、账单明细、导出、付款状态
- 成本分摊报表：按部门/项目/功能标签分摊 + 内部结算（chargeback）
- 优化建议：自动识别高消耗组件 + 给出替换模型/缓存/瘦身建议
- 模型比价器：输入业务参数（输入长度/输出长度/月调用量）→ 多模型成本对比

## 五、运行时嵌入链路

- 请求链路：API 网关计量中间件 → 采集 UsageRecord（模型/token/延迟）→ 异步入库 → 实时聚合
- 配额调度：请求前检查配额（token/并发/存储）→ 超限按策略执行（限速/降级/熔断）
- 预算触发：达到阈值 → 告警通知 → 自动降级到便宜模型/熔断
- 缓存计费：命中缓存（prompt cache）→ 按 cache_read 价格计价
- Token 预估：请求前用 tokenizer 预估成本 → 前端展示"本次预估费用"

## 六、安全与权限

- 成本数据权限：成本明细按组织隔离（复用 13-IAM 资源授权）
- 敏感操作：预算调整/价格修改需四眼审批（复用 16-E 审批）
- 审计：价格变更/配额变更留痕 + before/after diff
- 防滥用：异常用量检测（突增/循环调用）自动告警

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 成本看板 | CostDashboard(下钻) | GET /api/cost/summary?dims= | ⬜ |
| 价格表管理 | PriceManager | CRUD /api/pricing | ⬜ |
| 预算管理 | BudgetManager | CRUD /api/budgets | ⬜ |
| 配额管理 | QuotaManager | CRUD /api/quotas | ⬜ |
| 账单管理 | InvoicePage | GET /api/invoices | ⬜ |
| 模型比价器 | CostCalculator | POST /api/cost/estimate | ⬜ |

验证：① 一次对话后成本看板出现明细 ② 配额超限触发降级而非报错 ③ 预算 100% 自动熔断 ④ 缓存命中按低价计费 ⑤ 比价器输出与账单一致
