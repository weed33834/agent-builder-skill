# 27 AI 安全攻防与红队（AI Security & Red Teaming）

> 定位：大模型/智能体特有的攻击面防御——提示注入、越狱、数据投毒、供应链、模型窃取，以及红队演练与护栏体系。与 17-ai-lessons（工程教训）、13-iam（权限）、16-E（合规审计）互补：本篇聚焦"攻击手法→检测→防御→演练"的完整安全闭环。
> 来源：OWASP LLM Top 10 v2.0（2025）/ OWASP Agentic Applications Top 10（2025.12）/ OWASP GenAI Data Security 21 项风险（2026.3）/ 微软 Agent 治理工具包（Agent OS / Agent Mesh / Agent Runtime）/ promptfoo 红队手册 / 每月 50 万+ 越狱攻击监测数据。

---

## 一、定位与架构

- 威胁模型三层：模型层（越狱/幻觉滥用/模型窃取）→ 应用层（提示注入/不安全输出/过度代理）→ 供应链层（投毒模型/恶意插件/依赖漏洞）
- 防御纵深五道：输入检测 → 沙箱隔离（02-sandbox）→ 输出过滤 → 行为监控 → 审计追溯
- 安全左移：开发期威胁建模 + 红队用例库 + CI 安全门禁（联动 24-测试）
- 运行期防护：实时注入检测 + 敏感操作拦截 + 异常行为熔断
- 红队常态化：季度红队演练 + 外部众测 + 演练报告闭环

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| ThreatCase | case_id / name / threat_type(prompt_injection|jailbreak|data_poisoning|model_extraction|supply_chain|agent_abuse) / attack_vector / severity / tags[] |
| InjectionPattern | pattern_id / name / category(direct|indirect|obfuscated|multimodal|multi_turn) / regex / llm_detector_ref / risk_level |
| DefenseRule | rule_id / name / layer(input|sandbox|output|behavior) / action(block|flag|rewrite|quarantine) / config / enabled |
| RedTeamRun | run_id / name / scope / cases[] / start_time / end_time / status / report_ref |
| SecurityEvent | event_id / type / threat_case_id / user_id / session_id / ts / verdict(blocked|flagged|passed) / evidence |
| Guardrail | guardrail_id / name / trigger_conditions / response_template / escalation / owner |

## 三、配置项全清单

- security.threat_detection.enabled（注入检测总开关）、detector.mode（strict|balanced|lenient）
- security.injection.patterns（正则+LLM 双引擎权重）、injection.block_action（拦截/标记/改写）
- security.jailbreak.known_list（已知越狱模板库）、jailbreak.update_interval（模板更新周期）
- security.output.filter（输出敏感信息过滤）、output.allowed_topics（话题白名单）
- security.agent.abuse_limit（单会话敏感操作次数上限）
- security.redteam.schedule（演练频率：季度/月度）、redteam.auto_generate（AI 自动生成攻击用例）
- security.event.retention（安全事件保留期）、security.audit.level（审计级别）
- security.escalation.flow（告警升级链：标记→告警→人工复核→熔断）

## 四、管理界面（增删改调 + 辅助功能）

- 威胁态势大屏：今日攻击次数/类型分布/拦截率/高危事件 Top
- 威胁用例库：CRUD 威胁用例、导入（OWASP 标准库）、AI 生成变体、分类标签
- 注入检测规则：正则/LLM 检测器配置、规则启停、命中率统计、误报率监控
- 防御规则编排：五层防线可视化编排（输入→沙箱→输出→行为→审计）、动作配置
- 红队演练台：创建演练（范围/用例集）、执行进度、结果报告（命中/绕过明细）、修复跟踪
- 安全事件中心：实时事件流、过滤检索、事件详情（会话+证据）、处置操作（拉黑/解封/告警）
- 护栏管理：敏感操作护栏 CRUD（如"禁止转账类工具调用"）、触发条件配置、升级策略
- 模型安全评估：越狱成功率/注入绕过率/幻觉危险率评分、与基线对比

## 五、运行时嵌入链路

- 输入链路：用户输入 → InjectionDetector（正则引擎 + LLM 分类器双判）→ 命中则拦截/标记/改写 → 进入提示词渲染（01-prompt）
- 工具调用链路：Agent 工具选择（04-tools）→ Guardrail 校验（敏感工具/参数）→ 放行或 HITL 审批（07-workflow）
- 输出链路：模型输出 → OutputFilter（敏感信息/危险指令检测）→ 脱敏或拦截 → 返回前端
- 行为监控：Agent 动作序列实时分析 → 异常模式（循环调用/权限越级/高频敏感操作）→ 熔断
- 沙箱联动：代码执行/文件操作全部进沙箱（02-sandbox），恶意行为被沙箱策略拦截
- 事件上报：所有安全事件写入 SecurityEvent → 审计（13-iam）+ 告警（12-monitor）

## 六、安全与权限

- 红队用例库分级：仅安全管理员可见可改（RBAC 最高级）
- 检测规则变更需审批+审计（防检测绕过：规则泄露给攻击者）
- 安全事件数据加密存储、访问留痕
- 演练环境与生产隔离：演练永不触达真实生产数据
- 告警升级链人工兜底：熔断需人确认，防误伤

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 威胁态势大屏 | ThreatDashboard | GET /api/security/overview | ⬜ |
| 威胁用例库 | ThreatCaseManager | CRUD /api/security/threat-cases + POST /api/security/threat-cases/generate | ⬜ |
| 检测规则管理 | InjectionRuleManager | CRUD /api/security/injection-rules | ⬜ |
| 防御编排 | DefenseOrchestrator | PUT /api/security/defense-layers | ⬜ |
| 红队演练台 | RedTeamConsole | POST /api/security/redteam/run + GET /api/security/redteam/{id}/report | ⬜ |
| 安全事件中心 | SecurityEventCenter | GET /api/security/events + POST /api/security/events/{id}/dispose | ⬜ |
| 护栏管理 | GuardrailManager | CRUD /api/security/guardrails | ⬜ |

验证：① 输入"忽略之前指令"被拦截/标记 ② 图片内嵌文字注入被多模态检测捕获 ③ 越狱模板库命中率≥95% ④ 红队演练报告含绕过明细与修复状态 ⑤ 敏感工具调用触发护栏审批 ⑥ 攻击事件可追溯至具体会话
