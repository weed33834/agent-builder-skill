# Agent-Builder

> 生产级 AI Agent 脚手架，按 [Agent Plugins 1.0.0](https://agent-plugins.org) 规范打包——
> 带三道 MCP 硬闸门，AI 无法在没有证据的情况下宣称完成。

English · [日本語](./README.ja.md) · 文档：[SKILL 工作流](./skills/build-agent/SKILL.md) · [路线图](./docs/roadmap/)

## 这是什么

一句话意图 + 一份 `agent.yaml` → 生成**完整可运行的全栈 Agent 工程**：
FastAPI 后端（10 层架构）+ React 前端 + 自带 pytest 测试套件。三道 MCP 闸门强制管线：

| 闸门 | 工具 | 保证 |
|---|---|---|
| 1 | `validate_config` | 坏配置在生成前被拒绝 |
| 2 | `build_agent` | 生成过程可控，绝不覆盖非空目录 |
| 3 | `verify_product` | 产物可导入且测试全绿 |

**差异化**：每个模板 × 框架组合都在 CI 里由
[`scripts/verify_all.py`](scripts/verify_all.py) 验证（生成→导入→pytest）。
你拿到的是 CI 门禁下出生的工程，不是一个 demo。

## 快速开始

### 人类（CLI）

```bash
python scripts/generate.py templates/agent-types/chat.yaml ./my_agent --framework=langgraph
cd my_agent && pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests -q        # 产物自带测试套件
uvicorn app.main:app --reload --port 8000
```

### AI 客户端（插件）

把本仓库放进任何支持 Agent Plugins / MCP 的客户端，自动发现：

- `skills/build-agent/SKILL.md` —— 约 130 行的权威构建工作流
- `mcp.json` —— 三道闸门工具

AI 必须通过全部闸门才能宣称完成。纯 prompt 的 skill 可以被跳过；这些工具不能。

## 仓库结构

```
plugin.json / mcp.json     Agent Plugins 清单
server/builder_server.py   stdio MCP 服务器（3 个硬闸门工具）
skills/build-agent/        SKILL.md + references（默认值/字段字典/API）
scripts/generate.py        配置 -> 完整工程生成器
scripts/verify_all.py      CI 矩阵门禁：12 配置 × 双框架
templates/                 后端 + 前端参考模板
docs/roadmap/              架构愿景归档（非交付标准）
```

## License

Apache-2.0
