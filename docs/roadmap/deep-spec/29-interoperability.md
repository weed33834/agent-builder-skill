# 29 Agent 互操作与开放协议（Interoperability & Open Protocols）

> 定位：让 Agent 走出单机，跨厂商、跨框架、跨组织协作——MCP（模型上下文协议）管"微观执行"（Agent 怎么调工具），A2A（Agent-to-Agent）管"宏观协作"（Agent 之间怎么打交道）。同时覆盖 Agent Card 发现机制、开放 API、标准合规。与 04-tools（工具系统）、18-ecosystem（生态接入）、16-G（开放平台）互补。
> 来源：A2A 协议（Linux 基金会治理，150+ 组织支持）/ MCP 2026-07 大重构（取消 Session 改为无状态请求）/ 清华大学 2026 A2A 研究报告 / GB/Z 185-2026《智能体互联互通》/ 微信 A2A 手机厂商落地 / OpenAN A2A-T 电信增强协议。

---

## 一、定位与架构

- 协议栈分层：MCP=模型↔工具/数据（微观执行）；A2A=智能体↔智能体（宏观协作）；二者互补缺一不可
- A2A 四大核心对象：Agent Card（能力发现）、Task（任务委托）、Message（消息传递）、Artifact（产物交付）
- 标准化流程：发现（Agent Card 注册/解析）→ 委托（Task 创建）→ 执行（Agent 间消息协作）→ 交付（Artifact 回传）
- 状态模型：A2A 任务状态机（submitted→working→input-required→completed→failed→cancelled）
- 演进趋势：MCP 无状态化（2026.7 取消 Session）、国标 GB/Z 185-2026《智能体互联互通》、行业增强协议（A2A-T 电信版）
- 三种接入角色：作为 A2A 客户端（调用别的 Agent）、作为 A2A 服务器（被调用）、作为 MCP 服务器（暴露工具给生态）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| AgentCard | agent_id / name / description / capabilities[] / skills[] / auth_required / contact_url / trust_level |
| A2ATask | task_id / requester_agent / target_agent / parts[] / status / priority / context_ref / deadline |
| A2AMessage | message_id / task_id / role(agent|user|system) / content / content_type / ts / reply_to |
| Artifact | artifact_id / task_id / type / uri / mime / checksum / size / license |
| MCPEndpoint | endpoint_id / name / transport(stdio|http|sse|streamable_http) / tools[] / resources[] / auth / status |
| InteropPolicy | policy_id / name / allow_agents[] / deny_actions[] / rate_limit / trust_requirements / audit_level |

## 三、配置项全清单

- interop.a2a.enabled（A2A 总开关）、a2a.server.url（本 Agent 对外服务地址）、a2a.auth.mode（none|token|mtls|oauth）
- a2a.card.auto_publish（Agent Card 自动发布）、card.refresh_interval（能力变更刷新）
- a2a.task.timeout（任务超时）、a2a.task.max_parts（单任务消息上限）、a2a.retry.policy
- interop.mcp.enabled（MCP 服务开关）、mcp.transport（stdio|streamable_http）、mcp.auth（无/密钥/OAuth）
- interop.trust.policy（信任策略：白名单/签名验证/等级制）
- interop.audit.level（跨 Agent 调用审计级别）
- interop.rate_limit（对外调用限流）、interop.cost.budget（协作调用预算，联动 23）

## 四、管理界面（增删改调 + 辅助功能）

- Agent Card 管理：本 Agent 能力卡编辑（名称/描述/能力列表/认证要求）、发布状态、版本
- A2A 任务监控：跨 Agent 任务列表、状态流转、消息流可视化、失败重试、取消
- 外部 Agent 目录：发现/注册外部 Agent（手动 + 自动发现）、信任等级、能力搜索、健康状态
- MCP 服务器管理：接入 MCP 服务器（stdio/HTTP/SSE）、工具浏览与测试、资源列表、鉴权配置
- 互操作策略：访问控制策略 CRUD（谁可调/可调什么/限流/审计）、策略生效范围
- 协议实验室：手工构造 A2A/MCP 消息调试、协议兼容性测试、联调工具
- 标准合规检查：GB/Z 185-2026 等标准符合度自检、导出合规报告

## 五、运行时嵌入链路

- 作为客户端：本 Agent 决策需外部能力 → 查 Agent Card 目录 → 校验信任 → 创建 A2A Task → 消息协作 → 收 Artifact → 汇入会话
- 作为服务器：外部 Agent 请求 → Agent Card 鉴权 → Task 入队 → 路由到本 Agent 工作流（07）→ 执行 → 回传 Artifact
- MCP 工具链路：Agent 工具调用（04-tools）→ MCP 客户端 → 远程 MCP 服务器执行 → 结果回传
- 工具暴露链路：本平台工具 → MCP 服务器封装 → 生态内其他 Agent 可调用（扩展 18-生态）
- 审计链路：跨 Agent 全链路 trace_id 贯通 → 审计日志（谁调了谁/做了什么/产物去向）

## 六、安全与权限

- 信任分级：不可信 Agent 限制只读/受限工具；高信任才可执行敏感操作
- 认证：A2A 支持 token/mTLS/OAuth；MCP 支持密钥/OAuth；拒绝匿名高危调用
- 数据边界：跨 Agent 传递数据脱敏（个人/敏感字段过滤，联动 16-E）
- 防滥用：限流、单 Agent 调用配额、异常行为熔断（联动 27-AI 安全）
- 审计：所有跨 Agent 调用留痕可追溯，审计级别可配置

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| Agent Card 管理 | AgentCardEditor | CRUD /api/interop/agent-card + POST /api/interop/agent-card/publish | ⬜ |
| A2A 任务监控 | A2ATaskMonitor | GET /api/interop/a2a/tasks + POST /api/interop/a2a/tasks/{id}/cancel | ⬜ |
| 外部 Agent 目录 | ExternalAgentDirectory | GET /api/interop/directory + POST /api/interop/directory/register | ⬜ |
| MCP 服务器管理 | MCPManager | CRUD /api/interop/mcp + POST /api/interop/mcp/{id}/test | ⬜ |
| 互操作策略 | InteropPolicyManager | CRUD /api/interop/policies | ⬜ |
| 协议实验室 | ProtocolLab | POST /api/interop/lab/send + POST /api/interop/lab/compat-test | ⬜ |

验证：① 发布 Agent Card 后目录可见且能力正确 ② 创建 A2A 任务跨 Agent 执行成功并回传产物 ③ 接入 MCP 服务器后可调用其工具 ④ 本平台工具通过 MCP 被外部调用成功 ⑤ 低信任 Agent 敏感操作被拦截 ⑥ 跨 Agent 调用全程可审计追溯
