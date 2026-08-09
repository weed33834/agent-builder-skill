# Agent 类型模板

本目录包含 5 种预定义的 Agent 类型模板，每种模板对应一个 YAML 配置文件。

## 模板列表

| 模板文件 | Agent 类型 | 适用场景 | 复杂度 |
|----------|------------|----------|--------|
| `chat.yaml` | 聊天助手 | 通用对话、简单问答 | ★☆☆☆☆ |
| `research.yaml` | 研究助手 | 搜索、总结、分析信息 | ★★★☆☆ |
| `coding.yaml` | 编码助手 | 编写代码、审查、调试 | ★★★☆☆ |
| `customer_service.yaml` | 客服系统 | 多 Agent 协作客服 | ★★★★★ |
| `data_analysis.yaml` | 数据分析 | 数据上传、分析、可视化 | ★★★★☆ |

## 使用方式

```bash
# 使用模板生成 Agent
python scripts/generate.py templates/agent-types/research.yaml ./my_agent
```

## 自定义

复制任一模板，修改配置项即可创建自定义 Agent 类型。