# 决策默认值表（未指定即用此默认，绝不反复问）

| 维度 | 默认值 | 说明 |
|---|---|---|
| 框架 | `langgraph` | 生产级；要零依赖用 `bare` |
| 图类型 | `single` | 需多智能体才改 `supervisor` |
| LLM 提供商/模型 | `openai` / `gpt-4o-mini` | 可按成本/能力换 deepseek/claude/qwen 等 |
| 温度 / max_tokens | `0.7` / `4096` | — |
| 工具（enabled） | `web_search, current_time` | 按用途增删，名字必须在通用工具集或 custom 中 |
| 记忆 | `buffer`（会话内） | 需要知识库加 RAG 配置 |
| 安全强制 | 开启 | 提示词注入防御 + PII 脱敏 |
| 流式 | 开 | `/api/chat` SSE |
| 前端 | chat + admin + workspace 三视图 | 模板自带完整前端 |
| 部署 | uvicorn + vite dev | Docker 可选 |

## 通用工具集（tools.enabled 的合法取值）

```
web_search      联网搜索（DuckDuckGo）
web_fetch       抓取网页正文
current_time    当前时间
calculate       数学计算
code_execute    子进程沙箱执行代码
run_code        同 code_execute（别名）
file_read       读文件
file_write      写文件
read_csv        读取 CSV
analyze_data    CSV 描述统计
generate_chart  ASCII 柱状图
```

不在上表中的名字必须通过 `tools.custom` 定义（name/description/parameters），
否则 `validate_config` 直接拒绝。

## 何时升级默认

- 客服/协作类任务 → `orchestration.mode: "supervisor"` + `agents[]`
- 中文场景成本敏感 → `llm.provider: "deepseek"`
- 本地隐私部署 → `llm.provider: "ollama"`
