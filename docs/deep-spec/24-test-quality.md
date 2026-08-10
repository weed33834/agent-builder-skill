# 24 测试与质量保障（Testing & Quality Assurance）

> 定位：LLM 应用是"黑盒概率系统"，传统确定性测试不够，需要专有测试金字塔与评估体系。与 11-eval（评估体系）互补：11 管"模型输出质量评估"，本篇管"工程测试全流程"——单元/功能/回归/性能/混沌/安全测试 + CI/CD 门禁。
> 来源：LLM 应用测试策略（单元/功能/回归/性能分层）/ DeepEval / Langfuse 评估 / 混沌工程（Netflix）/ 提示词安全测评基准。

---

## 一、定位与架构

- 核心挑战：非确定性输出（同样的输入每次结果可能不同）、黑盒不可调试、缺陷无法归因到代码行
- 测试金字塔（LLM 版）：单元测试（每个节点/Prompt）→ 功能测试（每个工作流）→ 回归测试（标准用例集迭代比对）→ 系统测试（性能/可靠性/混沌/安全）
- 三层评估指标：基础指标（精确匹配/语义相似度）→ 内容质量指标（相关性/忠实度/召回率）→ 高级指标（安全/公平/毒性）
- 测试数据三件套：黄金标准数据（人工标注 30%）+ 对抗样本库 + 动态补充（真实 query）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| TestCase | case_id / suite_id / input / expected / type(golden|adversarial|live) / tags / model / prompt_version / created_by |
| TestSuite | suite_id / name / target(agent|workflow|prompt|tool) / cases[] / schedule / env |
| TestRun | run_id / suite_id / status / started_at / finished_at / results[] / triggered_by(manual|ci|cron) |
| TestResult | result_id / run_id / case_id / output / metrics{semantic_sim,faithfulness,relevancy} / pass / score / latency / cost / error |
| EvalMetric | metric_id / name / type(rule|llm_judge|embedding) / params / threshold |
| QualityGate | gate_id / stage / metrics[] / thresholds / action(pass|warn|block) |

## 三、配置项全清单

- test.env.isolation（测试环境隔离：独立数据库/模型沙箱）
- test.llm_judge.model（LLM 判分器模型，默认便宜模型）
- test.llm_judge.temperature（判分温度 ≤0.3）
- test.suite.schedule（回归套件定时运行）
- test.ci.gates（CI 门禁：质量分/覆盖率/延迟阈值）
- test.golden.ratio（黄金样本占比）
- test.adversarial.noise（对抗样本噪声等级）
- test.chaos.scenarios（混沌场景清单：断网/模型超时/下游 5xx/资源耗尽）

## 四、管理界面（增删改调 + 辅助功能）

- 测试套件管理：套件 CRUD + 用例批量导入（JSON/CSV）+ 用例编辑器（输入/预期/标签）
- 用例库：黄金样本/对抗样本分库管理 + 从线上对话一键沉淀为用例
- 测试运行器：手动触发/定时触发/CI 触发、进度条、取消、重跑失败项
- 结果报告：通过率/质量分/失败用例明细（输出+指标+错误）+ 前后版本对比
- 回归趋势：历次运行指标趋势图、突变检测、基线对比
- 混沌测试控制台：场景选择 + 受控注入（断网/延迟/故障）+ 恢复验证
- 安全测试：提示词注入攻击用例库（指令劫持/越权/越狱）+ 一键扫描
- 质量门禁配置：各阶段阈值 + 动作（警告/拦截发布）

## 五、运行时嵌入链路

- CI/CD 流水线：代码提交 → 单元测试 → 集成测试 → 质量门禁 → 构建 → 部署（复用 14-生命周期发布门禁）
- 回归调度：定时跑黄金套件 → 指标与基线对比 → 突变告警
- 在线质量：生产流量抽样（复用 11-eval 在线评估）→ 失败回流为用例
- 判分器：LLM-as-a-Judge（结构输出打分）+ 规则指标（BLEU/ROUGE/语义相似）+ 人工复核
- 发布拦截：质量分低于阈值 → 阻止发布/回滚

## 六、安全与权限

- 测试数据安全：测试集可能含敏感数据 → 脱敏/权限隔离
- 用例审批：黄金样本变更需审核（防止测试作弊/刷分）
- 混沌测试权限：仅管理员可执行（生产故障注入）
- 审计：测试运行记录 + 门禁拦截记录

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 套件/用例管理 | TestSuiteManager | CRUD /api/testsuites + /api/testcases | ⬜ |
| 测试运行器 | TestRunner | POST /api/testruns + GET 进度 | ⬜ |
| 结果报告 | TestReportPage | GET /api/testruns/{id}/results | ⬜ |
| 回归趋势 | RegressionChart | GET /api/testruns/trend | ⬜ |
| 混沌控制台 | ChaosConsole | POST /api/chaos/inject | ⬜ |
| 质量门禁 | QualityGateConfig | CRUD /api/qualitygates | ⬜ |

验证：① 创建套件→运行→报告展示 ② 故意改坏 Prompt→回归分数下降→门禁拦截 ③ 注入断网场景→验证降级 ④ 注入攻击用例→扫描报告 ⑤ 失败用例一键回流用例库
