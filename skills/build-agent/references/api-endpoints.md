# 生成产物 API 一览

生成工程的后端路由（FastAPI，`/docs` 有完整 Swagger）。

## 核心

```
GET  /api/health                 健康检查
GET  /api/config                 当前 Agent 配置
POST /api/chat                   对话（SSE 流式；body.mode 支持 web_search/deep_think/kb_id/sandbox）
POST /api/chat/reset             重置会话
GET  /api/sessions               会话管理（分组/收藏/导出/附件）
GET  /api/tools                  已启用工具列表
```

## 任务与工作台

```
GET/POST /api/tasks              长任务跟踪（进度/重试/取消）
GET/POST /api/workspaces         工作区隔离
GET/POST /api/skills             能力库（专家/技能/连接器 CRUD + AI 生成）
GET     /api/notifications       通知（未读角标/已读）
GET/POST /api/canvas             编排画布
```

## 沙箱与工具扩展

```
GET/POST/PUT/DELETE /api/sandbox/envs   沙箱环境管理（本地/云端、启停、默认）
POST /api/sandbox/run            沙箱内执行代码
POST /api/tools/mcp/connect      连接外部 MCP 服务器并导入工具
GET  /api/mcp/tools | /status    MCP 工具发现与状态
```

## 开放协议

```
GET  /.well-known/agent.json     A2A Agent Card 能力声明
POST /a2a/rpc                    A2A JSON-RPC 2.0 任务端点
GET/POST /api/a2a/tasks          A2A 任务内省/批量轮询/取消
```

## 安全与管理

```
POST /api/security/scan|redact   注入检测 / PII 脱敏试跑
GET  /api/admin/*                管理台：提示词版本/模型 key 池/评估/监控/用量/备份/IAM 等
GET  /metrics                    Prometheus 指标
POST /api/voice/transcribe       语音转写
POST /api/nlp/keywords|summary   中文分词关键词(jieba.analyse)与摘要
```

> 前端 `frontend/src/l8_api/api.ts` 与上述契约一一对应；
> 端到端可达性由 CI 的 verify_all.py 冒烟步骤保证。
