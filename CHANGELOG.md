# Changelog

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。
本项目于 0.0.1 重新出发；此前的历史版本已废弃并归档。

## [0.0.1] - 2026-08-22

重构起点。定位从"2300+ 行单体 Skill"转型为 **Agent Plugins 1.0.0 插件**：
给开发者的生产级 Agent 脚手架 + 给 AI 的可强制执行工作流。

### Added
- **插件化结构**：`plugin.json` + `mcp.json` + `skills/build-agent/SKILL.md`（~130 行权威工作流）
- **三道 MCP 硬闸门** `server/builder_server.py`（stdio JSON-RPC，零第三方依赖）：
  - `validate_config` —— agent.yaml 校验不过就拒绝生成（必填字段/framework 枚举/工具白名单/supervisor 组合）
  - `build_agent` —— 封装生成器；非空目录拒绝覆盖（防误删），生成前强制先过 validate
  - `verify_product` —— 交付闸门：产物必须 import 成功且自带 pytest 套件全绿
- 服务器单元测试 16 条（含 stdio 协议回环与真实产物的端到端闸门链路）
- CI 新增插件合规与服务器测试 job

### Changed
- SKILL.md 从 2324 行瘦身至 ~130 行；旧架构规格全文归档至 `docs/roadmap/`
  （愿景文档，不再是交付验收标准）；删除"手写代码模式"，generate.py 为唯一产出通道
- README 重写为诚实定位：生产级 Agent 脚手架，卖点为 CI 门禁下的 12 模板 × 双框架验证矩阵
- requirements.txt 全部依赖采用兼容区间（下界 = verify_all.py 验证过的组合）
- L2 重试改用 tenacity、关键词提取改用 jieba.analyse，删除手写实现
