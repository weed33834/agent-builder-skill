# 深度规格 11：评估体系（Evaluation System）

> 模板：docs/deep-spec/00-template.md
> 定位：**没有离线评估的模型不上线**。评估体系回答三件事：改了到底有没有变好（回归）、新功能是否达标（验收）、上线后是否退化（在线监控）。

## 1. 定位与总体架构

**业务价值**：智能体是概率系统，不能靠"感觉变好了"上线。评估系统管住：**评测集**（问题+期望答案+指标）、**评测运行**（批量跑 agent/工作流并打分）、**指标**（质量/延迟/成本/安全）、**报告**（对比/趋势/回归门禁）、**在线评估**（线上流量抽样打分）。

**评估金字塔**：

```
┌─ 在线评估（线上）────────────────────────────────┐
│ 真实流量抽样 → 自动/人工打分 → 漂移与退化告警       │
├─ 验收评估（发布前）───────────────────────────────┤
│ 新功能评测集 → 跑分 → 达标阈值 → 允许发布           │
├─ 回归评估（每次变更）─────────────────────────────┤
│ 全量评测集 vs 基线 → diff → 有退化即阻止            │
├─ 单元/组件评估（开发中）───────────────────────────┤
│ 单工具/单 prompt/单路由 快速验证                     │
└─ 资产层：评测集/评测任务/指标定义/评分器             │
```

**指标类型**：

| 类别 | 指标 | 说明 |
|------|------|------|
| 质量 | 准确率/命中率/格式合规率/相关性 | 有标准答案时 |
| 质量（LLM 判分） | 有用性/忠实度/安全性 1-5 分 | LLM-as-Judge |
| 质量（人工） | 人工评分/勾选缺陷类型 | 抽样 |
| 性能 | 首token延迟/总延迟/吞吐 | 响应时间 |
| 成本 | 单次调用成本/token 数 | 06 计量 |
| 安全 | 有害内容率/越狱成功率/幻觉率 | 安全评测集 |
| 鲁棒 | 同问题多次答案一致性 | 方差 |

## 2. 资产模型（评估数据模型）

### 2.1 评测集（DB：`eval_sets`）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id / name | — | ✅ | — | 评测集名（如"客服回归集-v3"） |
| description | string | 否 | — | 覆盖说明 |
| category | enum | ✅ | general | general/qa/tool_use/rag/agent_workflow/safety/multi_turn |
| items | json | ✅ | [] | 评测项列表（见 2.2） |
| version | int | ✅ | 1 | 版本（编辑+1，历史保留） |
| created_by / created_at | — | ✅ | — | 审计 |
| status | enum | ✅ | ready | ready/draft/archived |

### 2.2 评测项（items 元素）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| id | string | ✅ | 项 ID | case-001 |
| input | string | ✅ | 输入（消息/任务描述） | "我的订单三天没到，怎么办？" |
| expected | string | 条件 | 期望答案/正则/关键词 | 包含"退款/物流单号" |
| expected_type | enum | 条件 | exact(精确)/keyword(关键词)/regex/reference(参考答案,LLM判分)/tool_call(期望工具调用)/workflow(期望工作流路径) | keyword |
| tools_allowed | list | 否 | 允许使用的工具 | [order-query] |
| agent_id / workflow_id | string | 否 | 指定被测对象（默认用默认配置） | — |
| tags | list | 否 | 标签（场景/难度） | [退款, 紧急] |
| weight | float | 否 | 1.0 | 加权（关键用例>1） |
| timeout | int | 否 | 60 | 单条超时 |

### 2.3 评测任务（DB：`eval_runs`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id / name | — | 任务名 |
| eval_set_id / eval_set_version | — | 评测集+版本快照（不可变） |
| target_type / target_id | — | 被测对象（agent/workflow/prompt 版本/模型别名） |
| runner | enum | 引擎：本地/CI/调度 |
| status | — | queued/running/success/failed/partial |
| progress | json | 完成数/总数/失败数 |
| metrics | json | 汇总指标（见 3.3） |
| per_item_results | json | 每项结果（分数/输出/判定依据） |
| baseline_run_id | string | 对比基线运行（diff 用） |
| gate_passed | bool | 是否通过发布门禁 |
| triggered_by | — | 手动/CI/定时 |
| started_at / finished_at | — | 时间 |

### 2.4 评分器（DB：`judges`）

| 字段 | 类型 | 说明 |
|------|------|------|
| id / name | — | 评分器名（如"客服质量判官"） |
| judge_type | enum | llm_as_judge(模型判分)/rule(规则匹配)/regex/exact/human(人工)/hybrid |
| model_alias | string | LLM 判分用模型（06 别名） |
| rubric | text | 评分标准（1-5 分维度+打分指引，LLM 判分核心） |
| pass_threshold | float | 通过阈值（如 4.0/5） |
| enabled | bool | 启用 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| EVAL_ENABLED | bool | true | 评估总开关 | true/false | 热加载 |
| EVAL_DEFAULT_JUDGE | string | default-judge | 默认评分器 | 已注册 judge | 热加载 |
| EVAL_CONCURRENCY | int | 4 | 并发跑评测项 | 1-16 | 热加载 |
| EVAL_ITEM_TIMEOUT | int | 60 | 单条超时 | 10-600 | 热加载 |
| EVAL_RUN_RETENTION_DAYS | int | 180 | 运行记录保留 | 30-3650 | 热加载 |
| EVAL_GATE_ENABLED | bool | false | 发布门禁开关（CI 用） | true/false | 热加载 |
| EVAL_GATE_REGRESSION_ALLOWED | float | 0.05 | 允许最大退化幅度（如 5%） | 0-0.5 | 热加载 |
| EVAL_ONLINE_SAMPLING | float | 0.01 | 在线流量抽样比例 | 0-1 | 热加载 |
| EVAL_ONLINE_HUMAN_REVIEW | bool | true | 抽样是否进人工复核队列 | true/false | 热加载 |
| EVAL_RAG_EVAL_RETRIEVAL_K | int | 5 | RAG 检索评估 top_k | 1-20 | 热加载 |

### 3.2 评测集/评测项配置（表单同构）——见 2.1/2.2，全部可界面配置。

### 3.3 指标定义（指标 = 名称 + 计算口径）

| 指标 | 口径 |
|------|------|
| pass_rate | 通过项数/总项数（含 weight） |
| avg_score | LLM 判分均值（1-5） |
| tool_accuracy | 期望工具调用命中率 |
| rag_recall@k | 正确文档在 top-k 命中率 |
| latency_p50/p95 | 响应延迟分位 |
| cost_per_case | 总成本/项数 |
| safety_violation_rate | 安全用例违规率 |
| consistency | 同输入重复 3 次的答案语义相似度 |

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 评测集管理（EvalSetPanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 评测集列表 | 名称/版本/项数/最近运行/通过率 | GET /admin/evaluations |
| 评测项编辑 | 批量新增/导入 CSV/单个编辑/删除/复选操作 | GET/POST/PUT/DELETE /admin/evaluations/{id}/items |
| 评测项导入 | CSV/JSON 批量导入（input/expected/tags） | POST /admin/evaluations/{id}/import |
| 版本管理 | 编辑即新版本，历史可回滚 | POST /admin/evaluations/{id}/rollback |
| 评测集导出 | 导出 JSON 迁移 | GET /admin/evaluations/{id}/export |

### 4.2 评测运行（EvalRunner）

| 能力 | 说明 | 接口 |
|------|------|------|
| 发起评测 | 选评测集+目标（agent/工作流/模型）+评分器 → 排队运行 | POST /admin/evaluations/run |
| 进度展示 | 实时进度条/完成数/失败数/当前项 | GET /admin/evaluations/runs/{id} |
| 运行详情 | 每项：输入/输出/判定/得分/耗时/成本 | GET /admin/evaluations/runs/{id}/items |
| 失败项重跑 | 只重跑失败/超时的项 | POST /admin/evaluations/runs/{id}/retry-failed |
| 对比报告 | 本次 vs 基线（diff：哪些项变好/变差） | GET /admin/evaluations/runs/{id}/compare |
| 发布门禁 | 显示 pass/fail + 退化项清单（CI 联动） | GET /admin/evaluations/runs/{id}/gate |

### 4.3 评分器管理（JudgePanel）

| 能力 | 说明 | 接口 |
|------|------|------|
| 评分器列表 | 类型/模型/阈值/启用 | GET /admin/evaluations/judges |
| 新建/编辑 | rubric 编辑（评分标准提示词）+ 阈值 | POST/PUT /admin/evaluations/judges |
| 评分器校准 | **试评**：给示例输出 → 看判分是否合理（防判官瞎评） | POST /admin/evaluations/judges/{id}/calibrate |
| 一致性验证 | 同一输出判 3 次看方差 | POST /admin/evaluations/judges/{id}/consistency |

### 4.4 在线评估（OnlineEval）

| 能力 | 说明 | 接口 |
|------|------|------|
| 抽样队列 | 线上真实对话抽样（EVAL_ONLINE_SAMPLING 比例） | GET /admin/evaluations/online |
| 人工复核 | 打分界面（1-5 + 缺陷类型勾选 + 备注） | POST /admin/evaluations/online/{id}/review |
| 在线分数趋势 | 每日平均分/通过率曲线（退化即告警） | GET /admin/evaluations/online/trend |
| 退化告警 | 连续 N 日下降 → 告警（联动 12-monitor） | POST /admin/evaluations/online/alerts |

### 4.5 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 评测集生成器 | 用历史对话/文档自动生成评测项（LLM 生成 input+expected） | 🔶 待补 |
| 报告导出 | 评估报告导出（Markdown/PDF/HTML） | 🔶 待补 |
| CI 集成 | 门禁结果回写 CI（ci.yml 已含评测步骤） | 🔶 后端已有 evaluate.py |
| 测试集管理 | 单元级（工具/函数）测试与评测集联动 | ⬜ |

## 5. 运行时嵌入（真正被调用）

### 5.1 评测执行链路

```
触发（管理台/CI/定时）
  → EvalRunner.start(run)
      ├─ 1. 快照：评测集版本 + 目标配置（被测 agent/工作流/模型版本）
      ├─ 2. 逐项执行（并发 EVAL_CONCURRENCY）：
      │     输入 → 对话管线（与真实一致）→ 输出
      │     超时/异常 → 记录 failed
      ├─ 3. 评分（按 expected_type 分发）：
      │     keyword/exact/regex → 规则判定（秒级）
      │     reference → LLM 判分（rubric + 参考答案）
      │     tool_call → 检查输出中的工具调用是否符合期望
      │     workflow → 检查运行轨迹是否走了期望路径
      ├─ 4. 汇总指标（pass_rate/avg_score/latency/cost…）
      ├─ 5. 对比基线（baseline_run_id）→ 差异清单
      ├─ 6. 门禁判定：退化 > EVAL_GATE_REGRESSION_ALLOWED → fail
      └─ 7. 结果落库 + 通知（CI 回传 / 管理台展示）
```

### 5.2 在线评估链路

```
线上每请求：random() < EVAL_ONLINE_SAMPLING → 打标 sampled
  → 请求结束 → 送在线评分（自动 LLM 判分 + 可选人工复核）
  → 每日聚合 → 趋势图 → 连续退化 → 告警
```

### 5.3 与发布流程联动（CI/CD，M9）

```
git push → CI：
  ├─ lint + 单测
  ├─ 构建
  ├─ 评估门禁（关键评测集跑分 vs 基线）
  │    ├─ 退化超限 → 阻止合并
  │    └─ 通过 → 发布
  └─ 结果回写 PR 评论
```

### 5.4 失败降级

| 场景 | 降级 |
|------|------|
| LLM 判分不可用 | 降级为规则判分（keyword/exact）；仍无 → 标记待人工 |
| 单条超时 | 标记 failed（不计入通过率但单独列出） |
| 被测对象故障 | 跳过该目标 + 记录 infra 错误 |
| 并发过高 | 排队（队列可视化） |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：评测集/评分器/运行全量；开发者：跑评测+看结果；用户：不可见 |
| 数据 | 评测集可能含敏感问答 → 按可见性分级；评测输出保留策略 |
| 防作弊 | 评测集与训练/提示隔离（防止评测项被模型见过）；门禁判定不可绕过 |
| 审计 | 评测运行/门禁通过/评分器修改全审计 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 评测集 CRUD | /admin/evaluations（GET/POST） | admin/EvaluationPanel.tsx（待建） | 🔶 evaluate.py 已有 | 前端组件 |
| 评测项增删/导入 | /admin/evaluations/{id}/items*、/import | EvaluationPanel | 🔶 | — |
| 发起评测/进度/详情 | /admin/evaluations/run* | EvaluationPanel | 🔶 | runner 落库 |
| 对比报告/门禁 | /admin/evaluations/runs/{id}/compare、/gate | EvaluationPanel | 🔶 | 基线对比 |
| 评分器管理/校准 | /admin/evaluations/judges* | EvaluationPanel 子页 | 🔶 | — |
| 在线抽样/人工复核 | /admin/evaluations/online* | 新组件 OnlineEval.tsx | ⬜ | 抽样埋点 |
| 趋势/告警 | /admin/evaluations/online/trend | OnlineEval | ⬜ | 聚合+12 联动 |
| 评测集生成器 | POST /admin/evaluations/generate | EvaluationPanel | ⬜ | LLM 生成 |
| 报告导出 | GET /admin/evaluations/runs/{id}/export | EvaluationPanel | 🔶 | 模板 |

**验证方法**：
1. 建评测集（5 条客服问答，keyword 判定）→ 发起评测 → pass_rate 与逐项结果展示（评测链路通）。
2. 故意改差一个 prompt → 重跑 → 对比基线显示该项退化 + 门禁 fail（回归门禁生效）。
3. 建 reference 类型评测项 + LLM 判分器 → 校准页验证判分合理性（判官生效）。
4. 导入 CSV 评测项（100 条）→ 跑批 → 进度与失败项重跑（批量生效）。
5. 开启在线抽样 → 真实对话进人工复核队列 → 打分 → 趋势图出现（在线评估生效）。
