# agent-builder-skill 布局与设计审计报告

> 审计对象：`agent-builder-skill`（Universal Agent Builder）@ c35006e
> 审计方法：SKILL.md 声明 vs 实际代码逐项比对 + generate.py 实跑验证 + 大厂方案调研
> 审计日期：2026-08-10

---

## 一、核心结论（TL;DR）

| # | 问题 | 严重度 | 状态 |
|---|------|--------|------|
| 1 | **文档与代码严重脱节**：SKILL.md 声称 24 个文件，实际缺失 23 个 | 🔴 致命 | 待修 |
| 2 | **generate.py 无法运行**：Python 3.11 f-string 反斜杠 SyntaxError | 🔴 致命 | ✅ 已修复 |
| 3 | **API 代差**：generate.py 生成的代码是 LangGraph 旧 API（`set_entry_point`），模板是 v1.0 新 API（`add_edge(START,...)` + `Command`） | 🔴 致命 | 待修 |
| 4 | **L1-L10 分层过度设计**：10 层架构对"生成单 Agent 应用"场景过重，90 个文件里一半是空壳 | 🟠 严重 | 待修 |
| 5 | **缺少配套工程**：无 tests、无 CI 跑通验证、无评估（eval）模块 | 🟠 严重 | 待修 |
| 6 | **声明不一致**：README 声称 React 18，实际 package.json 是 React 18 但 SKILL.md 声称 React 19 | 🟡 中等 | 待修 |

---

## 二、逐项审计详情

### 2.1 SKILL.md 声明 vs 实际（缺失文件清单）

SKILL.md 声称的 24 个文件，实际**只有 `templates/backend/scripts/run.sh` 存在**，其余 23 个缺失：

```
templates/backend/app/l2_interface/callbacks.py        ❌
templates/backend/app/l3_prompt/few_shot.py            ❌
templates/backend/app/l3_prompt/sanitizer.py           ❌
templates/backend/app/l4_agent/checkpointer.py         ❌
templates/backend/app/l4_agent/intercepts.py           ❌
templates/backend/app/l5_tools/mcp_client.py           ❌
templates/backend/app/l5_tools/errors.py               ❌
templates/backend/app/l5_tools/schemas.py              ❌
templates/backend/app/l6_memory/summary.py             ❌
templates/backend/app/l6_memory/rag_engine.py          ❌
templates/backend/app/l6_memory/knowledge_base.py      ❌
templates/backend/app/l7_orchestrator/workflow.py      ❌
templates/backend/app/l7_orchestrator/router.py        ❌
templates/backend/app/l7_orchestrator/supervisor.py    ❌
templates/backend/app/l7_orchestrator/a2a_client.py    ❌
templates/backend/app/l7_orchestrator/a2a_server.py    ❌
templates/backend/app/l8_api/routes/sessions.py        ❌
templates/backend/app/l8_api/routes/tools.py           ❌
templates/backend/app/l8_api/routes/a2a.py             ❌
templates/backend/app/l8_api/middleware/rate_limit.py  ❌
templates/backend/app/l8_api/middleware/logging.py     ❌
templates/backend/app/l10_infra/errors.py              ❌
templates/backend/app/l10_infra/monitoring.py          ❌
templates/frontend/Dockerfile                          ❌
```

**影响**：按 SKILL.md 工作流生成的 agent 会在运行时 `ImportError`，因为 graph.py/nodes.py 引用了缺失模块（如 `from .checkpointer import ...`）。

### 2.2 generate.py 致命 bug（已修复 ✅）

**原始问题**：
- `L267`：`f-string expression part cannot include a backslash`（Python 3.11 及以下 f-string 表达式内禁止反斜杠）
- `L339/L358/L394`：同样问题
- `L872`：前端模板 `buffer.split('\n')` 反斜杠问题
- 环境缺 `pyyaml`

**修复方式**：
1. 将 f-string 内的 `\n` 移出表达式，预计算 `sub_agent_nodes` / `sub_agent_route_map` / `sub_agent_list` 变量
2. 用 `chr(10)` 替代字符串拼接中的 `\n`
3. 将 `f"{t},"` 类 f-string 改为 `"%s," % t` 格式化
4. 建 venv 安装 pyyaml 验证

**验证结果**：`python3 scripts/generate.py templates/agent-types/research.yaml /tmp/test_agent` ✅ 全流程跑通，输出 90 个文件。

### 2.3 API 代差：旧 API vs 新 API（待修 🔴）

**generate.py 生成的代码**（以 research.yaml 单 agent 为例）：
```python
workflow.add_node("agent", agent_node)
workflow.set_entry_point("agent")      # ❌ LangGraph <0.6 旧 API
```

**模板自带 graph.py**（v1.0 新 API）：
```python
from langgraph.graph import StateGraph, START, END, Command
from langgraph.prebuilt import create_react_agent
# add_edge(START, node) / Command(goto=, update=) / supervisor pattern
```

**后果**：当前 langgraph 1.0+ 已移除 `set_entry_point`，生成的代码**一运行就崩**。generate.py 的 L4/L7 生成函数必须重写为与模板一致的 v1.0 API。

### 2.4 L1-L10 分层过度设计（待修 🟠）

实际生成 90 个文件，按层分布：

```
L1 LLM:         5 文件 (base/factory + openai/anthropic/deepseek/ollama adapters)
L2 Interface:   4 文件 (chat_interface/retry/streaming/token_manager)
L3 Prompt:      4 文件 (prompt_builder/role_templates/system_prompts/output_parsers)
L4 Agent:       4 文件 (graph/nodes/router/state)
L5 Tools:       4 文件 (base_tools/custom_tools/executor/registry)
L6 Memory:      3 文件 (buffer/session_manager/vector_store)
L7 Orchestrator: 3 文件 (aggregator/base + 缺失的 workflow/router/supervisor/a2a)
L8 API:         6 文件 (main/routes/middleware)
L9 UI:          ~30 文件 (React 前端)
L10 Infra:      3 文件 (config/logging + 缺失的 errors/monitoring)
```

**问题**：
- 对一个"从 YAML 生成单个 agent 应用"的工具，10 层架构是给"生产级多 agent 平台"准备的
- 大量层只有 1-3 个文件，且相互依赖缺失（如 L7 引用了不存在的 a2a_client）
- 前端 ~30 文件（React+Vite+TS）与后端体量不匹配，生成后需手工 `npm install` 才能跑

### 2.5 缺少的配套（待修 🟠）

- **无 tests/**：SKILL.md 声称"Deployment & Verification"步骤，但生成物和模板都没有测试
- **无评估模块**：没有 eval/benchmark 入口，无法验证"生成质量"
- **CI 未跑通**：`.github/workflows` 只有 dependabot-auto-merge，没有构建/测试工作流
- **requirements.txt 缺 langchain-mcp-adapters**：L5 的 mcp 相关代码引用了它

---

## 三、合并/删减/添加建议

### 3.1 合并（Reduce）

| 层 | 建议 | 理由 |
|----|------|------|
| L2 Interface | 并入 L4 Agent | chat_interface/streaming 本质是 agent 运行时的一部分，单独分层无收益 |
| L3 Prompt 的 output_parsers | 并入 L4 Agent 的 nodes | 解析逻辑只在 agent 节点内使用 |
| L6 Memory 三个文件 | 合并为 `memory.py` | buffer/session_manager/vector_store 共用一个状态对象即可 |
| L10 Infra | 合并为 `config.py + logging.py` | errors/monitoring 是横切关注点，不需要独立目录 |
| L8 API + L9 UI | 保留（前后端分离是对的） | 但删掉 routes/sessions、routes/tools 等空壳 |

**合并后目标结构**（约 20 个核心文件）：
```
app/
├── main.py              # FastAPI 入口 (L8)
├── config.py            # 配置 (L10)
├── llm/                 # L1: base + factory + 4 adapters
├── agent/               # L2+L3+L4: graph/nodes/state/prompts
├── tools/               # L5: registry/executor/base/custom/mcp_client
├── memory/              # L6: memory.py (buffer+session+vector)
├── orchestrator/        # L7: supervisor.py + a2a.py
└── api/                 # L8: routes/health.py + middleware/auth.py
```

### 3.2 删减（Remove）

1. **删掉缺失的 23 个文件声明**：SKILL.md 先改为描述实际存在的文件，再逐个补齐——不要"文档先行、代码没有"
2. **删掉 ollama_adapter.py 之外的本地推理冗余**：或保留但标注 experimental
3. **删掉前端 React 脚手架**（若目标是"模板"而非"完整应用"）：改为提供 `frontend/README.md` + 最小 HTML demo；若保留 React，则补 Dockerfile 和 CI 构建
4. **删掉 .env.example 中的假 key**：目前是占位符，应改为 `your-key-here` 并加 .env 到 .gitignore

### 3.3 添加（Add）

按优先级：

| 优先级 | 添加项 | 理由 |
|--------|--------|------|
| P0 | **tests/**：pytest 冒烟测试（graph 编译、API 起服务、工具注册） | SKILL.md 的 Verification 步骤需要自动化支撑 |
| P0 | **generate.py 重写 L4/L7**：对齐 LangGraph v1.0 API（`add_edge(START)` + `Command` + supervisor pattern） | 消除 API 代差，让生成代码能跑 |
| P1 | **CI 工作流**：`python -m pytest` + `node build` + 镜像构建 | 三平台同步后需要一个 gate |
| P1 | **examples/**：用 5 个 agent-types 各生成一次，产物入库 | 让"声称的 5 步工作流"可复现 |
| P2 | **eval 脚本**：`scripts/evaluate.py`（工具调用成功率、任务完成率） | 对齐 Anthropic "评测驱动迭代" |
| P2 | **MCP 集成文档**：明确 l5_tools/mcp_client.py 的协议版本（2026-07-28 stateless） | SKILL.md 已写，代码要跟上 |

---

## 四、大厂方案与论文对标

### 4.1 分层架构对标

| 本仓库 | Anthropic (Building Effective Agents) | OpenAI Agents SDK | Google A2A |
|--------|--------------------------------------|-------------------|------------|
| L1-L3 (LLM/接口/提示词) | "增强型 LLM" 构建块 | Agent 的 instructions+model | Agent Card |
| L4 (Agent) | Agent 本体 | Agent | Agent |
| L5 (Tools) | "工具即 ACI（Agent-Computer Interface）" | Tools (function call/MCP) | 工具作为能力声明 |
| L6 (Memory) | 上下文管理（最重要资源） | Sessions | 状态管理 |
| L7 (Orchestrator) | 编排者-工作者 / 路由 / 并行化 | Handoffs（交接）+ Guardrails（护栏） | A2A 协议（Agent-to-Agent） |
| L8 (API) | 无（宿主应用层） | Runner/Tracing | 传输层 |

**关键结论**：Anthropic 六种模式（提示链/路由/并行化/编排者-工作者/评估者-优化器）中，本仓库的"supervisor + sub-agents + aggregator"对应**编排者-工作者**，方向正确；但 Anthropic 明确警告："最成功的实现采用**简单可组合**模式而非复杂框架"——10 层架构违背了这一原则。

### 4.2 多 agent 性能数据（来自调研）

- **Claude Research 多 agent 系统**（2025-06）：协调者-执行者架构，主 agent 并行派发子 agent 搜索，比单 agent Opus 4 **提升 90.2%**，但 token 消耗高达 **15 倍**（Anthropic 官方博客《How We Built Our Multi-Agent Research System》）
- **上下文是最重要的有限资源**：Claude Code 最佳实践第一条
- **OpenAI Swarm → Agents SDK 演进**：Swarm（2024-10，教育性质）→ Agents SDK（2025-03，生产就绪），核心原语：Agent / Handoffs / Guardrails / Tracing——证明"轻量 + 明确原语"优于"重框架"

### 4.3 论文清单（建议 README 引用）

| 论文 | 主题 | 与本仓库关系 |
|------|------|-------------|
| *The Rise and Potential of LLM Based Agents: A Survey* (arXiv 2309.07864, 复旦) | Agent 综述 86 页 | L1-L10 分层的理论依据 |
| *A Survey on LLM based Autonomous Agents* (arXiv 2308.11432, 人大高瓴) | 自主 Agent 架构 | supervisor pattern 出处 |
| *Large Language Model based Multi-Agents: A Survey* (NUS) | 多 agent 综述 | L7 编排器设计参考 |
| *AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation* (arXiv 2308.08155, Microsoft) | 多 agent 对话框架 | 群聊 vs 编排器对比 |
| *The Five Ws of Multi-Agent Communication* | 多 agent 通信拓扑 | a2a 设计参考 |

### 4.4 对 generate.py 重写的具体建议（对齐 v1.0）

```python
# ❌ 现在（generate.py 生成）
workflow.set_entry_point("agent")

# ✅ 目标（与模板 graph.py 一致）
from langgraph.graph import StateGraph, START, END, Command
from langgraph.prebuilt import create_react_agent
workflow.add_edge(START, "agent")
# 多 agent: 用 langgraph-supervisor 或 Command(goto=..., update=...)
```

---

## 五、下一步行动清单（按依赖排序）

1. ✅ **已做**：修复 generate.py 语法错误，venv 装 pyyaml，实跑验证成功
2. ⬜ 重写 generate.py 的 L4/L7 生成函数 → 对齐模板 LangGraph v1.0 API
3. ⬜ 补齐或删除 23 个缺失文件声明，更新 SKILL.md 文件清单
4. ⬜ 合并 L2/L3/L6/L10 层，产出精简版模板结构
5. ⬜ 添加 tests/ + CI 工作流
6. ⬜ 生成 5 个 agent-types 的 examples/ 并验证可启动
7. ⬜ 三平台同步 + 发版 tag

---

*报告生成：agent-dcbd3b02 | 代码：github.com/weed33834/agent-builder-skill (c35006e) 镜像至 gitee/gitcode*
