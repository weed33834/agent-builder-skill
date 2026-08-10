# 深度规格 10：技能与插件（Skills & Plugins）

> 模板：docs/deep-spec/00-template.md
> 依据：Anthropic Agent Skills 规范（SKILL.md 为唯一必需文件：name/description 前置元数据 + 指令正文；描述决定模型何时加载；随用随载不进系统提示）、Claude Code 插件生态、本仓库已有 skill_loader/plugin_manager（l10_infra）。
> 核心结论：**技能 = 打包的指令+资源，按需加载；插件 = 打包的代码能力，动态扩展**。两者都要可管理、可搜索、可安装、可审计。

## 1. 定位与总体架构

**业务价值**：智能体能力不能写死——要能"现学现用"。技能系统管住：**技能打包**（指令+资源文件）、**按需加载**（模型描述驱动，用到才读）、**技能市场**（搜索/安装/分享）、**插件扩展**（动态注册工具/路由/中间件）、**生命周期**（启用停用更新卸载）。

**技能（Skill）vs 插件（Plugin）**：

```
┌─ Skill（技能）───────────────────────────────────────┐
│ 本质：文档+资源包（SKILL.md + 脚本/参考文件）           │
│ 用途：教模型"怎么做"（领域知识/工作流/最佳实践）         │
│ 加载：随用随载——模型看到 description → 决定读取 SKILL.md│
│ 实现：skill_loader 扫描技能目录 → 注入描述 → 按需读全文  │
├─ Plugin（插件）───────────────────────────────────────┤
│ 本质：代码包（Python/JS 模块）                          │
│ 用途：给系统加能力（新工具/新适配器/新路由/事件钩子）     │
│ 加载：进程启动时导入 + 注册（工具/钩子/路由）            │
│ 实现：plugin_manager 扫描插件目录 → importlib 加载 → 注册│
└───────────────────────────────────────────────────────┘
```

**架构位置**：

```
Skill 侧：技能目录（skills/，可多个源）→ skill_loader
  ├─ 扫描索引（name/description/path/version）
  ├─ 描述注入：agent 启动/每轮把已装技能描述列表并入上下文（很小）
  ├─ 按需加载：模型引用某技能 → loader 读 SKILL.md 全文注入（一次）
  └─ 技能内脚本：模型可调用（进工具列表）

Plugin 侧：插件目录（plugins/）→ plugin_manager
  ├─ 加载：importlib 导入插件入口（manifest 声明钩子）
  ├─ 注册：插件向 ToolRegistry/路由/事件总线注册能力
  ├─ 生命周期：enable/disable/reload/uninstall
  └─ 沙箱：插件运行在独立进程/受限环境（可选，防恶意插件）
```

## 2. 资产模型（技能与插件数据模型）

### 2.1 技能包（文件系统 + DB：`skills` 索引）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| id / name | — | ✅ | — | 技能名（目录名） |
| description | string | ✅ | — | **最重要字段**：模型判断何时加载的依据（含触发条件/适用场景） |
| version | string | ✅ | 0.1.0 | 语义化版本 |
| path | string | ✅ | — | 技能目录绝对/相对路径 |
| source | enum | ✅ | local | local(本地) / market(市场安装) / bundled(内置) / imported(导入) |
| metadata | json | 否 | {} | 作者/标签/许可证/依赖 |
| dependencies | list | 否 | [] | 依赖技能/包 |
| files | list | 否 | [] | 文件清单（SKILL.md + 脚本/参考） |
| enabled | bool | ✅ | true | 启用（停用=描述不再注入） |
| usage_count | int | ✅ | 0 | 被模型加载次数（市场热度） |
| installed_at / updated_at | — | ✅ | — | 时间 |
| checksum | string | 否 | — | 内容校验（更新检测） |

**SKILL.md 规范（Anthropic 格式，必读）**：
```
---
name: skill-name
description: 什么时候用、解决什么问题（含触发关键词）
---
# 使用说明（正文：步骤/示例/注意事项/脚本用法）
```
- 正文按需读取：首次引用读全文（可缓存）；描述必须精准（描述不准=模型永远不会用）。

### 2.2 技能市场条目（DB：`skill_market`）

| 字段 | 说明 |
|------|------|
| id / name / description / version | 市场元数据 |
| author / license | 作者/协议 |
| downloads / rating / verified | 下载量/评分/官方认证 |
| source_url | 安装来源（Git 仓库/tarball/registry API） |
| installed | 本地是否已装 + 版本比对 |

### 2.3 插件包（DB：`plugins`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id / name | — | ✅ | 插件名（唯一） |
| version | string | ✅ | 版本 |
| entry_point | string | ✅ | 入口模块（如 plugin_xxx.main:register） |
| hooks | list | 否 | 声明的事件钩子（on_tool_call/on_message/on_startup…） |
| registers | list | 否 | 声明注册内容（tools/routes/adapters/middleware） |
| permissions | json | 否 | 申请权限（network/files/tools）——沙箱授权模型 |
| enabled | bool | ✅ | 启用 |
| source | enum | ✅ | local/market/imported |
| status | enum | ✅ | loaded(已加载)/error(加载失败)/disabled |
| error | string | 否 | 加载失败原因 |
| installed_at / updated_at | — | ✅ | 时间 |

### 2.4 事件总线（插件协作机制）

| 事件 | 时机 | 插件可做 |
|------|------|----------|
| on_startup / on_shutdown | 进程生命周期 | 初始化资源/清理 |
| on_message(received) | 用户消息进入 | 预处理/增强/拦截 |
| on_response(generated) | 回复生成前 | 改写/注入/格式转换 |
| on_tool_call / on_tool_result | 工具调用前后 | 监控/改写/审计 |
| on_agent_create / on_agent_destroy | agent 生命周期 | 初始化/清理 |
| on_error | 异常时 | 增强错误处理 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| SKILL_ENABLED | bool | true | 技能系统总开关 | true/false | 热加载 |
| SKILL_DIRS | list | [skills/] | 技能扫描目录（可多个） | 路径列表 | 重启 |
| SKILL_DESC_INJECTION | enum | all | 描述注入范围 | all(全部)/enabled_only(仅启用)/none | 热加载 |
| SKILL_MAX_DESC_TOKENS | int | 500 | 描述总预算（防占窗口） | 100-2000 | 热加载 |
| SKILL_MAX_BODY_TOKENS | int | 4000 | 单技能正文注入上限 | 500-10000 | 热加载 |
| SKILL_BODY_CACHE_TTL | int | 300 | 正文缓存秒数 | 0-3600 | 热加载 |
| SKILL_MARKET_ENABLED | bool | true | 技能市场开关 | true/false | 热加载 |
| SKILL_MARKET_REGISTRY | string | — | 市场 registry 端点 | URL | 重启 |
| SKILL_AUTO_UPDATE | bool | false | 自动更新已装技能 | true/false | 热加载 |
| PLUGIN_ENABLED | bool | true | 插件系统总开关 | true/false | 重启 |
| PLUGIN_DIRS | list | [plugins/] | 插件扫描目录 | 路径列表 | 重启 |
| PLUGIN_SANDBOX | bool | false | 插件沙箱隔离（独立进程） | true/false | 重启 |
| PLUGIN_PERMISSION_ENFORCE | bool | true | 权限申请强制执行 | true/false | 热加载 |
| PLUGIN_MAX_PER_AGENT | int | 10 | 单 agent 插件上限 | 1-100 | 热加载 |

### 3.2 按 agent 配置（agent.yaml）

```yaml
skills:
  enabled: true
  allow: [customer-support-pro, refund-policy]   # 允许的技能白名单
  deny: [crypto-trader]                          # 黑名单
  inject: all                                    # 描述注入策略

plugins:
  allow: [rate-limiter, audit-logger]            # 插件白名单
  deny: []
```

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 技能管理（SkillManager）

| 能力 | 说明 | 接口 |
|------|------|------|
| 技能列表 | 名称/版本/来源/启用状态/加载次数 | GET /admin/skills |
| 搜索筛选 | 关键字/来源/启用状态 | ?q=&source=&enabled= |
| 技能详情 | 描述预览/SKILL.md 正文/文件清单/元数据 | GET /admin/skills/{name} |
| 启停 | 停用后描述不再注入（模型不会主动用） | POST /admin/skills/{name}/toggle |
| 编辑技能 | 改描述（**关键**）/正文/版本 | PUT /admin/skills/{name} |
| 删除 | 卸载本地技能 | DELETE /admin/skills/{name} |
| 从市场安装 | 搜索市场 → 查看详情 → 安装（自动装依赖） | POST /admin/skills/install {market_id} |
| 更新 | 检查更新（checksum/版本比对）→ 一键升级 | POST /admin/skills/{name}/update |
| 本地导入 | 上传技能包（zip/tar.gz 含 SKILL.md） | POST /admin/skills/import |
| 技能测试 | **试运行**：给一段对话上下文 → 模拟"模型是否会加载它" + 加载后注入效果预览 | POST /admin/skills/{name}/test |
| 使用统计 | 各技能被加载次数/场景分布 | GET /admin/skills/stats |

### 4.2 技能市场（SkillMarket）——对标 Claude 技能商店

| 能力 | 说明 | 接口 |
|------|------|------|
| 市场浏览 | 分类（办公/开发/客服/数据分析…）+ 搜索 + 排序（下载/评分） | GET /admin/skills/market |
| 详情 | 描述/版本/作者/评分/依赖/README 预览 | GET /admin/skills/market/{id} |
| 一键安装 | 安装 + 依赖解析 + 校验（SKILL.md 存在、描述合法） | POST /admin/skills/market/{id}/install |
| 发布技能 | 把本地技能打包发布到市场（可选） | POST /admin/skills/{name}/publish |

### 4.3 插件管理（PluginManager）

| 能力 | 说明 | 接口 |
|------|------|------|
| 插件列表 | 名称/版本/状态（loaded/error/disabled）/注册内容 | GET /admin/plugins |
| 插件详情 | 入口/钩子/注册项/权限申请/错误信息 | GET /admin/plugins/{name} |
| 启用/停用 | 停用=卸载注册项（工具从列表移除） | POST /admin/plugins/{name}/toggle |
| 重载 | 修改代码后热重载 | POST /admin/plugins/{name}/reload |
| 安装 | 上传插件包 / 从市场安装 | POST /admin/plugins/install |
| 卸载 | 删除 + 清理注册项 | DELETE /admin/plugins/{name} |
| 权限审批 | 插件申请权限列表 → 管理员批准/拒绝 | POST /admin/plugins/{name}/permissions |
| 插件市场 | 浏览/安装第三方插件 | GET/POST /admin/plugins/market* |
| 事件订阅查看 | 插件实际注册了哪些事件钩子 | GET /admin/plugins/{name}/hooks |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 技能生成器 | 输入技能需求描述 → AI 生成 SKILL.md 骨架（name/description/正文）→ 编辑完善 | 🔶 待补 |
| 技能模板 | 预置模板（客服规范/文档问答/数据分析师…） | 🔶 待补 |
| 批量导入导出 | 技能包批量打包/迁移 | 🔶 待补 |
| 冲突检测 | 技能名冲突/描述重叠检测（防模型混淆） | 🔶 待补 |
| 插件安全扫描 | 安装前静态扫描（可疑导入/危险调用） | ⬜ |

## 5. 运行时嵌入（真正被调用）

### 5.1 技能按需加载链路（核心：不占窗口）

```
启动/热加载：skill_loader.scan(SKILL_DIRS)
  → 索引表 {name: {description, path, version, enabled}}
  → 构建描述列表（占 SKILL_MAX_DESC_TOKENS 预算，通常 <500 token）

每轮请求 ContextManager.assemble（03）：
  → skills 区块 = 描述列表注入（agent 白名单过滤后的 enabled 技能）

模型推理：看到技能描述 → 判断本任务需要 → 在回复/工具调用中
  → 触发 SkillLoader.load(name)
      ├─ 读 SKILL.md 全文（缓存 TTL 300s）
      ├─ 按 SKILL_MAX_BODY_TOKENS 截断注入（作为 system 附加段）
      ├─ 技能内脚本 → 注册为工具（技能目录下 executable）
      └─ 注入完成后本轮继续推理
```

### 5.2 技能执行链路（技能含脚本时）

```
模型调用技能脚本（如 skill_analyze_csv 的 analyze.py）
  → ToolRegistry 发现 source=skill:name
  → 沙箱执行（02 联动：技能脚本默认 sandboxed=true）
  → 结果回喂模型（来源标注）
```

### 5.3 插件加载链路（进程启动时）

```
启动：plugin_manager.load(PLUGIN_DIRS)
  ├─ 逐个读 manifest（入口/hooks/registers/permissions）
  ├─ 权限校验：申请项 ⊆ 管理员已批准集合，否则拒绝加载（记录 pending）
  ├─ importlib.import(entry_point) → 执行 register(api)
  │    api 提供：register_tool / register_route / on(event) / settings
  ├─ 注册成功 → status=loaded → 能力立即生效
  ├─ 失败 → status=error + 错误记录（不阻塞主进程）
  └─ 停用/卸载：调用 unregister 钩子 → 移除注册项
```

### 5.4 事件总线调用链（插件增强对话）

```
用户消息 → EventBus.emit(on_message, msg)
  ├─ 插件 A 改写消息（如补全格式）
  ├─ 插件 B 记录审计
  └─ 返回处理后的消息 → 进入对话管线
回复生成 → EventBus.emit(on_response, reply) → 插件可改写 → 返回用户
```

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| 技能加载失败 | 跳过该技能 + 告警（模型将失去该能力但对话继续） |
| 描述列表超预算 | 按使用频率截断最不常用技能（保核心） |
| 插件加载失败 | status=error 隔离（不影响其他插件/主服务） |
| 恶意插件行为 | 权限强制 + 沙箱进程隔离 + 事件风暴限流 |
| 市场不可达 | 本地技能照常；市场页显示离线 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 技能可信度 | 市场安装校验（签名/checksum）；本地导入扫描内容（SKILL.md 注入指令检测） |
| 插件权限 | 最小权限申请制：network/files/tools 逐项审批；未批准不加载 |
| 插件隔离 | PLUGIN_SANDBOX=true 时插件跑独立进程（崩溃不拖垮主服务） |
| 审计 | 技能加载/安装/更新、插件启停/重载/权限审批全审计 |
| 防滥用 | 技能描述注入总量限制；插件事件钩子超时限制（防死循环） |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 技能列表/详情/启停 | /admin/skills* | 新组件 SkillManager.tsx | 🔶 skill_loader 已有 | 前端组件 |
| 技能编辑 | PUT /admin/skills/{name} | SkillManager | 🔶 | — |
| 技能删除/导入 | DELETE /admin/skills/{name}、/import | SkillManager | 🔶 | 打包校验 |
| 市场浏览/安装/更新 | /admin/skills/market* | SkillManager 子页 | ⬜ | registry 后端 |
| 技能测试 | POST /admin/skills/{name}/test | SkillManager | ⬜ | 模拟加载 |
| 插件 CRUD/启停/重载 | /admin/plugins* | 新组件 PluginManager.tsx | 🔶 plugin_manager 已有 | 前端组件 |
| 权限审批 | POST /admin/plugins/{name}/permissions | PluginManager | 🔶 | 审批流 |
| 插件市场 | /admin/plugins/market* | PluginManager | ⬜ | — |
| 技能生成器 | POST /admin/skills/generate | SkillManager | ⬜ | LLM 生成 |
| 使用统计 | GET /admin/skills/stats | SkillManager | ⬜ | 埋点 |

**验证方法**：
1. 写一个最小技能（SKILL.md 描述"当用户问退款政策时使用"）→ 启用 → 对话问退款 → 模型应加载该技能并按正文回答（按需加载生效）。
2. 管理台停用该技能 → 同样问题 → 模型不再使用（启停生效）。
3. 从市场安装一个技能 → 出现在列表 + 可用（安装链路通）。
4. 写一个插件（注册一个 hello 工具 + on_message 钩子）→ 加载 → 对话中可调用 hello（插件注册生效）。
5. 插件申请 network 权限但管理员拒绝 → 插件加载失败且记录原因（权限强制生效）。
