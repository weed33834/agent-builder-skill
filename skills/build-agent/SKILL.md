---
name: build-agent
description: Build a complete, runnable full-stack AI agent (FastAPI backend + React frontend + tests) from a one-line requirement. Use when the user wants to create, build, or generate an AI agent application.
---

# Build Agent

给一句话需求，产出**可运行、带测试、CI 验证过**的全栈 Agent 工程。
本 Skill 是唯一权威路径；不要手写代码替代生成器，不要跳过验证闸门。

## 核心决策规则

- **用户没讲的 → 用默认值表**（见 `references/defaults.md`），不追问、不卡壳。
- **只有"不问就会做错方向"才问**：一次一个问题，附推荐项。
- **产出前必须过三道 MCP 闸门**（validate → build → verify），任何一道失败 = 未完成。

## 工作流（按序执行，不可跳步）

### 第 1 步 · 判定与澄清

- 用户想改已有代码 / 只想聊概念 → 不用本 Skill。
- 信息足够 → 直接进第 2 步；不足 → 澄清优先级：
  ① Agent 用途 → ② LLM 偏好 → ③ 是否需要多智能体。

### 第 2 步 · 写 `agent.yaml`

按字段字典（`references/field-dictionary.md`）+ 默认值表生成配置。
最小可用示例：

```yaml
agent:
  name: "MyAgent"
  type: "chat"
  description: "一句话描述这个 Agent 做什么"

llm:
  provider: "openai"
  model: "gpt-4o-mini"

tools:
  enabled: [web_search, current_time]

prompt:
  system_prompt: "你是一个乐于助人的助手。"
```

规则：
- `tools.enabled` 中每个名字必须属于通用工具集
  （web_search / web_fetch / current_time / calculate / code_execute / run_code /
   file_read / file_write / read_csv / analyze_data / generate_chart）
  或在本文件 `tools.custom` 中定义 —— 否则 `validate_config` 会拒绝。
- `framework`: `langgraph`（默认，生产级）| `bare`（零框架依赖）。
- 多智能体：`orchestration.mode: "supervisor"` + `agents[]`。

### 第 3 步 · 硬闸门一：`validate_config`

调用 agent-builder MCP 工具：

```
validate_config(config=<yaml 文本>)
```

- 返回 `ok: true` → 继续。
- 返回 `errors[]` → 修复 yaml 后重跑。**不要带着错误强行生成。**

### 第 4 步 · 硬闸门二：`build_agent`

```
build_agent(config_path=<yaml 绝对路径>, output_dir=<绝对路径>, framework="langgraph")
```

- 目标目录非空时会被拒绝（防误覆盖）；确要覆盖需显式 `force=true` 并向用户说明。
- 成功返回产物统计与下一步启动命令。

### 第 5 步 · 硬闸门三：`verify_product`

```
verify_product(output_dir=<产物绝对路径>)
```

- 通过标准：`import_ok: true` 且 pytest 失败数为 0。
- 未通过 → 读失败输出、修复配置、重新 build + verify。
- **此闸门不过，禁止向用户宣称完成。**

### 第 6 步 · 交付

向用户提供（固定四行格式）：

```
cd <output_dir>
pip install -r requirements.txt
# 编辑 .env 填入 LLM API Key
uvicorn app.main:app --reload --port 8000        # 后端 :8000/docs
cd frontend && npm install && npm run dev        # 前端 :5173
```

并附一段话说明：用了哪些默认值、启用了哪些工具、测试结果数字。

## 交付物完整性（Core 级）

生成的工程必须满足以下 Core 项，全部由 `verify_product` 自动检查：

| 项 | 标准 |
|---|---|
| 可导入 | `import app.main` 无错 |
| 测试 | 产物自带 pytest 套件全部通过 |
| 双框架 | bare / langgraph 均可生成并启动 |
| 安全 | 提示词注入防御 + PII 脱敏默认开启 |

更多能力（管理台/知识库/沙箱/多租户等）已内置在模板中，属于增量探索项，
完整愿景见 `docs/roadmap/`——它们不是单次交付的验收条件。

## 故障排查

| 症状 | 处理 |
|---|---|
| validate 报未知工具名 | 改名或移入 `tools.custom` |
| build 报目录非空 | 换目录或经用户确认后 `force=true` |
| verify 时 pytest 失败 | 把失败测试输出原样带给用户，不要隐瞒 |
| Windows 控制台乱码 | 生成器已强制 UTF-8 输出；若仍异常设 `PYTHONIOENCODING=utf-8` |
| 无 API Key 起服务 | `/api/health` 可用即视为部署成功；对话功能需填 Key |

## 参考文档

- `references/defaults.md` — 决策默认值表
- `references/field-dictionary.md` — agent.yaml 字段字典
- `references/api-endpoints.md` — 生成产物的 API 一览
- `docs/framework-selection.md` — 六框架选型矩阵
- `docs/roadmap/` — 架构全景与远期规划（非交付标准）
