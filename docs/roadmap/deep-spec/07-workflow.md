# 深度规格 07：编排与工作流（Orchestration & Workflow）

> 模板：docs/deep-spec/00-template.md
> 调研依据：多智能体三种编排模式（Supervisor/Pipeline/Swarm，2026 主流共识）、IBM watsonx 编排（AI 路由/弹性扩展/受控治理）、LangGraph Supervisor 中心辐射模式（共享白板 Append-only）、多智能体工作流设计模式（papers.anthropic.com）。
> 核心结论：**复杂任务需要协调配合的专家，而非一个万能通才**——编排层决定智能体团队怎么干活。

## 1. 定位与总体架构

**业务价值**：单 agent 有边界，多 agent 有分工。编排层管住：**任务分解**（谁负责什么）、**路由**（任务分给谁）、**协作**（共享上下文/白板）、**流程控制**（串行/并行/条件/循环）、**状态管理**（中断/恢复/检查点）、**跨进程协同**（A2A）。

**四种编排模式（全部支持，按任务选择）**：

```
┌─ Pipeline（管道）───────────────────────────────────┐
│ A→B→C→D 固定顺序，每步消费上步输出                    │
│ 适用：多阶段流水线（理解→检索→生成→审校）              │
├─ Supervisor（监督者）────────────────────────────────┤
│ 中央 supervisor 分解任务→分发给专家 worker→汇总结果    │
│ 中心辐射型 Hub-and-spoke；共享白板（Append-only）      │
│ 适用：动态任务分配（客服/研究/多专家协作）              │
├─ Swarm（群体）───────────────────────────────────────┤
│ 对等 agent 间 handoff（把对话控制权转交）              │
│ 适用：角色轮转/客服升级/多部门协作                     │
├─ Hierarchical（层级）────────────────────────────────┤
│ 多级 supervisor（团队-子团队），适合大规模组织          │
└─ Workflow（确定性流程，LangGraph）───────────────────┤
│ 显式节点图：条件分支/循环/并行 fan-out·fan-in          │
│ 适用：确定性业务流程（审批流/数据处理）                 │
```

**架构位置**：

```
任务请求 → Orchestrator（编排引擎）
  ├─ 模式选择：workflow（确定性图）/ supervisor / swarm / pipeline
  ├─ 执行：WorkflowGraph.run() / Supervisor.loop() / Swarm.handoff()
  ├─ 状态：AgentState（MessagesState）穿越全程，checkpointer 持久化
  ├─ 中断/恢复：HITL 审批点、长任务恢复（断点续跑）
  ├─ 跨进程：A2A 客户端（RemoteA2aAgent 调用其他服务/平台的 agent）
  └─ 产物：最终答案/任务报告/执行轨迹
```

**与相邻模块边界**：
- 编排 vs 工具（04）：工具是单步能力；编排是"工具+agent+流程"的组合调度。
- 编排 vs 上下文（03）：编排决定状态怎么流；上下文决定每轮装什么进窗口。
- 编排 vs 记忆（05）：编排的任务状态（进行中/结果）存工作记忆；沉淀的经验进程序记忆。

## 2. 资产模型（编排数据模型）

### 2.1 工作流定义（DB：`workflows` / YAML 文件）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id / name | — | ✅ | — | 工作流名（唯一） | — |
| description | string | 否 | — | 用途说明 | — |
| mode | enum | ✅ | workflow | 编排模式 | workflow/supervisor/swarm/pipeline/hierarchical |
| graph | json | ✅ | — | 图定义（workflow 模式） | nodes/edges/start/end |
| nodes | list | ✅ | [] | 节点列表 | 见 2.2 |
| edges | list | ✅ | [] | 边列表 | {from, to, condition?} |
| start / end | string | ✅ | — | 入口/出口节点 | — |
| max_iterations | int | ✅ | 10 | 循环上限（防死循环） | 1-100 |
| timeout | int | ✅ | 300 | 整体超时（秒） | 10-86400 |
| version | int | ✅ | 1 | 版本（编辑+1） | — |
| status | enum | ✅ | draft | draft/published/archived | — |
| enabled | bool | ✅ | true | 启用 | — |
| checkpoint | bool | ✅ | true | 是否启用断点续跑 | — |
| error_policy | enum | ✅ | fail | 节点失败策略 | fail(整体失败)/skip(跳过继续)/retry(重试)/fallback_node(走备用节点) |
| tags / owner / created_at / updated_at | — | ✅ | — | 通用字段 | — |

### 2.2 节点类型（nodes 元素）

| 节点类型 | 说明 | 关键配置 |
|----------|------|----------|
| agent | 调用子 agent（指定 agent_id + 任务描述模板） | agent_id, prompt_template, max_turns |
| llm | 直接 LLM 调用（非 agent） | model_alias, system_prompt, temperature |
| tool | 执行工具 | tool_name, args_template |
| workflow | 嵌套子工作流 | workflow_id, input_mapping |
| condition | 条件分支 | if/else 表达式（引用 state 字段） |
| parallel | 并行执行（fan-out） | branches: [{nodes, join}] |
| human | 人工审批/输入（HITL） | approval_type, timeout, on_timeout |
| transform | 数据转换（拼接/提取/格式化） | operation, input, output |
| memory | 读写记忆 | op: read/write, key, template |
| a2a | 跨进程调用远程 agent | agent_url, agent_card_id, payload |

### 2.3 Agent 角色定义（DB：`agents` / agent.yaml）——编排参与方

| 字段 | 类型 | 说明 |
|------|------|------|
| id / name | — | agent 标识 |
| role | enum | worker(执行者) / supervisor(调度者) / router(路由) / reporter(汇总) |
| model | string | 使用的模型别名（06） |
| prompt | string | 角色提示词（01 资产引用） |
| tools | list | 可用工具白名单（04） |
| max_turns | int | 单次任务最大轮数 |
| handoff_keys | list | swarm 模式下可转交的 agent |
| permissions | json | 可执行的敏感操作 |
| timeout / retries | — | 执行控制 |

### 2.4 路由规则（DB：`routing_rules`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id / name | — | 规则名 |
| match | json | 匹配条件（关键词/意图/用户标签/消息长度/成本档） |
| target | string | 路由到：agent_id / workflow_id |
| priority | int | 优先级（高者先匹配） |
| fallback_target | string | 无匹配时兜底 |
| enabled | bool | 启用 |

### 2.5 运行实例（DB：`workflow_runs`）——可观测与恢复

| 字段 | 说明 |
|------|------|
| id / workflow_id / version | 运行标识 |
| status | pending/running/waiting_human/success/failed/timeout/cancelled |
| input / output | 输入输出快照 |
| current_node / visited_nodes | 执行位置（恢复用） |
| checkpoint_state | 检查点（LangGraph checkpoint 引用） |
| parent_run_id | 嵌套运行时父 ID |
| started_at / finished_at / duration | 时间与耗时 |
| trace_id | 关联可观测性链路（13） |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| ORCH_DEFAULT_MODE | enum | workflow | 默认编排模式 | workflow/supervisor/swarm/pipeline | 热加载 |
| ORCH_MAX_ITERATIONS | int | 10 | 循环上限 | 1-100 | 热加载 |
| ORCH_WORKFLOW_TIMEOUT | int | 300 | 默认超时 | 10-86400 | 热加载 |
| ORCH_HITL_TIMEOUT | int | 600 | 人工审批等待超时 | 10-86400 | 热加载 |
| ORCH_HITL_TIMEOUT_ACTION | enum | reject | 超时处理 | reject(拒绝) / proceed(继续) / cancel(取消) | 热加载 |
| ORCH_CHECKPOINT_ENABLED | bool | true | 检查点开关 | true/false | 重启 |
| ORCH_CHECKPOINT_DRIVER | enum | memory/sqlite/redis | 检查点存储 | — | 重启 |
| ORCH_MAX_PARALLEL | int | 8 | 最大并行分支数 | 1-64 | 热加载 |
| ORCH_AGENT_MAX_TURNS | int | 15 | 子 agent 最大轮数 | 1-100 | 热加载 |
| ORCH_ERROR_RETRY_MAX | int | 2 | 失败重试次数 | 0-5 | 热加载 |
| ORCH_A2A_ENABLED | bool | true | 跨进程 A2A 开关 | true/false | 热加载 |
| ORCH_A2A_TIMEOUT | int | 120 | A2A 调用超时 | 10-600 | 热加载 |
| ORCH_RUN_RETENTION_DAYS | int | 30 | 运行记录保留 | 1-3650 | 热加载 |
| ORCH_PUBLISH_REQUIRE_REVIEW | bool | false | 工作流发布需审批 | true/false | 热加载 |

### 3.2 按工作流配置（workflow YAML）

```yaml
workflow:
  name: order-support
  mode: supervisor
  max_iterations: 5
  checkpoint: true
  error_policy: retry
  supervisor:
    agent: supervisor-agent        # 调度者
    workers: [triage, order-db, refund, escalation]
    strategy: llm_route            # llm_route / keyword / round_robin / priority
  nodes:
    - {id: triage, type: agent, agent: triage-agent, max_turns: 3}
    - {id: escalate, type: agent, agent: escalation-agent}
  edges:
    - {from: triage, to: refund, condition: "state.refund_required == true"}
    - {from: triage, to: escalate, condition: "state.satisfied == false"}
```

### 3.3 按 agent 配置（agent.yaml 编排相关）

```yaml
orchestration:
  role: worker                     # worker/supervisor/router/reporter
  max_turns: 10
  supervisor: supervisor-agent     # 归属的调度者
  handoff_to: [billing, hr]        # swarm 模式可转交
  can_spawn: false                 # 是否允许动态创建子 agent
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 工作流列表（WorkflowList）

| 能力 | 说明 | 接口 |
|------|------|------|
| 列表 | 名称/模式/版本/启用状态/运行次数/成功率 | GET /admin/workflows |
| 筛选搜索 | 模式/状态/关键字 | ?mode=&status=&q= |
| 启停 | 停用后入口路由跳过 | POST /admin/workflows/{id}/toggle |
| 运行统计 | 成功率/平均耗时/失败节点分布 | GET /admin/workflows/stats |

### 4.2 工作流编辑器（WorkflowCanvas）——核心

| 能力 | 说明 |
|------|------|
| 可视化画布 | 节点拖拽/连线（React Flow 类）、缩放、对齐、自动布局 |
| 节点配置面板 | 点节点 → 右侧表单：类型/参数/agent 选择/工具选择/条件表达式 |
| 条件编辑 | 可视化 if/else 连线（true/false 分支） |
| 并行编辑 | 并行分支分组 + join 策略选择（all/single） |
| 校验 | 保存前校验：孤立节点/缺 start/死循环/条件引用不存在字段 |
| 版本管理 | 编辑+1，发布=可被入口路由引用；历史版本可回滚 |
| 模拟运行 | 输入测试 payload → 画布高亮逐步执行（**验证工作流真实可跑**） |
| 运行监控 | 真实运行中的节点状态实时点亮 + 当前停在哪个 HITL 点 |

### 4.3 运行管理（RunManager）

| 能力 | 说明 | 接口 |
|------|------|------|
| 运行列表 | 状态/工作流/耗时/触发者 | GET /admin/workflows/runs |
| 运行详情 | 输入输出/节点轨迹/每节点耗时/检查点 | GET /admin/workflows/runs/{id} |
| 手动重跑 | 从失败点或从头重跑 | POST /admin/workflows/runs/{id}/retry |
| 取消运行 | 终止卡死运行 | POST /admin/workflows/runs/{id}/cancel |
| HITL 处理 | 查看等待审批的任务 + 通过/拒绝（管理台侧入口） | GET/POST /admin/workflows/hitl/{id} |
| 断点恢复 | 列出可恢复的运行（中断未完成）→ 一键续跑 | POST /admin/workflows/runs/{id}/resume |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 路由规则管理 | 匹配条件/目标/优先级增删改 + 测试匹配 | GET/POST/PUT/DELETE /admin/routing-rules | 🔶 |
| 工作流模板 | 预置常用模板（审批流/客服分流/数据处理管道）一键导入 | 🔶 待补 |
| AI 生成工作流 | 用自然语言描述 → 生成图结构（LLM 生成 nodes/edges）→ 画布编辑 | 🔶 待补 |
| 导入导出 | YAML 导出迁移/跨平台导入 | 🔶 待补 |
| A/B 测试 | 同一入口两个工作流版本按比例分流 | ⬜ |

## 5. 运行时嵌入（真正被调用）

### 5.1 执行引擎（workflow 模式，LangGraph v1.0 语义）

```
入口消息 → Orchestrator.route(message)（按 routing_rules）
  → 命中 workflow → WorkflowRunner.start(workflow_id, input)
      ├─ 1. 装载：workflows 表读定义（published 版本）→ 构建图
      ├─ 2. 初始化 AgentState（MessagesState + 自定义字段）
      ├─ 3. 从 start 节点执行：
      │     每个节点执行后 → 写回 state → 沿 edges 走
      │     condition 边 → 评估表达式（引用 state 字段）
      │     parallel 节点 → asyncio.gather 并行分支 → join 聚合
      │     human 节点 → interrupt() 挂起 → HITL 通道推送审批卡片
      ├─ 4. 检查点：每节点后保存 checkpoint_state（可恢复）
      ├─ 5. 终止条件：到达 end / 超时 / 循环上限 / 手动取消
      ├─ 6. 结果：最终 state 的输出字段 → 返回给对话层
      └─ 7. 记录：workflow_runs 全轨迹落库
```

### 5.2 Supervisor 循环（动态任务分配）

```
SupervisorAgent.loop(mission)
  ├─ 1. supervisor 分析任务 → 输出子任务列表 [{worker, task, priority}]
  ├─ 2. 分发：llm_route 策略 → 每个子任务交给对应 worker agent
  ├─ 3. 共享白板：所有 worker 的中间结果 Append-only 写入共享状态
  │     （LangGraph 1.0 多 agent 状态：MessagesState 公共消息区）
  ├─ 4. supervisor 周期性检查进度（检查频率可配）→ 决定继续/调整/收尾
  ├─ 5. 汇总：所有结果综合 → 最终答案/报告
  └─ 循环上限防失控（max_iterations）
```

### 5.3 Swarm handoff（对等转交）

```
agent A 判断该用户问题应转给 B
  → A 返回 handoff 指令（工具调用形式：transfer_to_B）
  → 执行引擎切换当前 agent 为 B（保留共享上下文）
  → B 继续对话（可再转交/可转回）
  → 转交记录进运行轨迹（审计/调试）
```

### 5.4 A2A 跨进程（调用其他平台 agent）

```
A2AClient.call(agent_url, task)            # app/l7_orchestrator/a2a_client.py
  ├─ 1. GET {agent_url}/.well-known/agent.json → Agent Card（能力/协议）
  ├─ 2. POST {agent_url}/a2a/rpc {jsonrpc, method: tasks/send, params: {task}}
  ├─ 3. 轮询 tasks/get 或订阅事件流 → 任务状态（pending→working→completed/failed）
  ├─ 4. 结果回传（artifact/content）
  └─ 远程 agent 也可通过本服务 a2a_server 被外部调用（POST /a2a/rpc）
```

### 5.5 失败降级与恢复

| 场景 | 策略 |
|------|------|
| 节点失败 | error_policy：fail（整体失败+轨迹） / skip / retry（指数退避） / fallback_node |
| 子 agent 无响应 | 超时 → 重试 → 由 supervisor 重新分配 |
| 进程崩溃 | 检查点恢复：重启后列出未完成任务 → 断点续跑 |
| HITL 超时 | 按 ORCH_HITL_TIMEOUT_ACTION 处理（默认拒绝） |
| A2A 目标不可达 | 标记不可用 + 路由到备用本地 agent |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：工作流/路由全量；开发者：编辑+模拟运行（不可发布）；用户：仅触发已发布工作流 |
| 审计 | 发布/回滚/路由变更/运行轨迹审计；HITL 处理记录 |
| 防滥用 | 循环上限/超时/并行上限；递归工作流深度限制；A2A 目标白名单 |
| 敏感操作 | 工作流内敏感节点（写库/发邮件/支付）需声明 + 审批联动 |
| 隔离 | 工作流间状态隔离；嵌套子工作流无循环引用（校验拦截） |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 工作流 CRUD | /admin/workflows（GET/POST） | admin/OrchestrationPanel.tsx（已有基础） | ✅ | — |
| 删除 | DELETE /admin/workflows/{id} | OrchestrationPanel | ✅ | — |
| 详情/启停 | GET /admin/workflows/{id}、toggle | OrchestrationPanel | 🔶 | toggle 接口 |
| 画布编辑器 | POST /admin/workflows/{id}/graph | 新组件 WorkflowCanvas.tsx | ⬜ | React Flow 集成 |
| 模拟运行 | POST /admin/workflows/{id}/simulate | WorkflowCanvas | ⬜ | 执行引擎复用 |
| 运行列表/详情 | /admin/workflows/runs* | 新组件 RunManager.tsx | ⬜ | 轨迹落库+前端 |
| 重跑/取消/恢复 | /admin/workflows/runs/{id}/retry|cancel|resume | RunManager | ⬜ | 检查点复用 |
| HITL 处理 | /admin/workflows/hitl/* | 对话页审批卡片 + RunManager | 🔶 | 通道打通 |
| 路由规则 | /admin/routing-rules* | 新组件 RoutingPanel.tsx | 🔶 | 后端已有部分 |
| 模板/AI 生成 | /admin/workflows/templates、/generate | WorkflowCanvas | ⬜ | — |

**验证方法**：
1. 画布建三节点工作流（A→条件→B/C）→ 模拟运行输入不同 payload → 分支正确（图执行生效）。
2. 运行列表查看轨迹 → 每节点耗时/状态清晰（可观测生效）。
3. 建 supervisor 工作流（1 调度+3 worker）→ 运行 → 共享白板消息可见（协作生效）。
4. 在 HITL 节点运行 → 对话出现审批卡片 → 通过后继续执行（中断恢复生效）。
5. 故意让节点抛错 → 按 error_policy 重试/失败 → 轨迹记录（容错生效）。
