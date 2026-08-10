# 架构体检修复：bare 产物可启动 + langgraph v1.0 API 对齐（2026-08-11）

## 目标
延续 agent-builder-skill 项目架构全面体检：修复 generate.py 生成器真实 bug，使 bare 框架产物可启动、langgraph 产物对齐 LangGraph v1.0 API，补齐契约端点测试。

## 关键修复

### 1. bare 框架产物无法启动（核心 bug）
- **根因**：`chat.py`/`orchestrator.py`/`a2a.py`/`main.py` 是静态模板直接 copy，硬编码 langgraph API（`get_graph`/`astream_events`/`ainvoke`），而 bare 框架生成的 `graph.py` 只有 `BareAgentRuntime`，无这些入口。
- **修复（scripts/generate.py）**：
  - bare `graph.py` 模板新增：`ainvoke()`（LangGraph 契约返回 `{"messages": [...]}`）、完整 `stream()` 事件流（agent_message/tool_call/tool_result/done）、模块级 `get_graph()`/`get_graph_config()` 兼容函数（单例 runtime + thread config）。
  - 新增 `_write_bare_chat()`：bare 版 chat.py，用 `runtime.stream()` + AgentEvent 类型转 SSE，替代 `astream_events`。
  - `copy_static_templates()` 增加 framework 参数，bare 时覆盖 chat.py。
  - 新增 `_write_bare_tests()`：bare 产物自带 test_bare_runtime.py（5 条测试）。

### 2. langgraph 生成代码对齐 v1.0 API
- `Command` 从 `langgraph.types` 导入（旧版 `langgraph.graph` 已移除）。
- 单 agent：`router_node` → `_route_from_agent`（模板已升级）。
- 多 agent：`build_multi_agent_graph` → `build_supervisor_graph` + `_route_to_specialist`。
- 补齐 `get_graph_config()` 生成（f-string 花括号转义修复）。

### 3. ToolRegistry 补充（templates/backend/app/l5_tools/registry.py）
- 新增 `get_registry()` 单例工厂（bare 模板引用但缺失）。
- 新增 `get_callables()`：name → async callable 映射（框架无关运行时用），修复 bare 模板 `t.func` 不存在问题。

## 验证结果
- 主模板 pytest：**26 passed**（含 test_contract_endpoints.py 6 条契约测试）。
- bare 产物：生成成功、`app.main` 可导入、路由 3 个、产物内测试 **5 passed**。
- langgraph 产物：生成成功、可导入、路由 4 个。
- multi-agent（supervisor）产物：导入 OK。
- 真实 LLM 调用冒烟：链路通（报 400 缺 key 属预期）。

## 交付
- git 提交：**781825a**，三平台（gitcode/gitee/github）全部对齐。
- 打包：agent-builder-skill.zip 665.8 KB / 225 文件。
- 上传链接：https://jsonproxy.3g.qq.com/urlmapper/1X2Xzt

## 下一步（体检剩余项）
- SKILL.md 与代码一致性、docs(feature-checklist) 与代码对照
- 前端缺口组件（TaskCard/WorkspacePanel/SkillSidebar/NotificationBell/CommandPalette/CanvasView/MemoryPanel）
- 框架适配器 SDK 测试（openai-agents/claude-sdk/adk/autogen）
- M8 Streaming UI 对接 AgentRuntime.stream
