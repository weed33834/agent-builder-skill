# Phase 4 安全门禁测试清单 — 教官每日任务（Daily Missions）

> 本文档是「教官每日任务」特性上线前的安全门禁用例规格，供 quality-engineer 在 Phase 4 直接落地为 pytest 用例。
> **不含实现代码**，仅定义：请求、前置、期望状态码/行为、映射的 must-fix 与残余项（R1–R5）。
> backend 实现完成即可执行。

## 元信息

- **范围**：mindmirror 新特性「教官每日任务」（TrainingGoal / DailyMission / MissionCompletion / streak，路由 /api/goals、/api/missions/*）。
- **阶段**：本地匿名 token（local anon UUID）阶段。
- **依据**：Phase 1 安全评审 must-fix（P0-2 资源归属 / P0-3 写入禁静默建号 / P1-4 输入校验 / P1-6 幂等+streak 服务端 / P1-7 统一 404）+ 设计补充约束（R1–R5）。
- **独立阻塞（非本清单门禁，需 team-lead 跟踪）**：P0-1 生产真实登录 —— **jwt 路径已落地**（register/login + Bearer 双模 + 密码 pbkdf2 哈希），`validate_production` 对 jwt 已可真实验签；**wx 登录仍待实现**（需 appid/secret 外部凭据，`validate_production` 已显式拒绝 wx）。goals/streak 身份基础在 jwt 模式下成立。
- **路径约定**：完成接口以 team-lead 给定为准 `POST /api/missions/{mission_id}/tasks/{task_id}/complete`。若 backend 最终实现改为 body 传 `{mission_id, task_id}`，请将本文路径参数平移为 JSON body，**断言不变**。

## 0. 测试前置（Fixtures）

- **User A / User B**：各自持合法 UUID token（`X-User-Token`），且均已通过测评流（`POST /api/sessions`，`current_user` 自动建号）在 DB 落库 —— 满足 `RequireUser`，避免 401。
- **A_goal**：A 的 TrainingGoal，合法 `trait_target`（枚举值）、合法 `source_figure`（如 `lincoln`，取自 `data/figures/celebrity.yaml`）。
- **A_mission**：A 名下「当天」DailyMission，含 `tasks` 列表；取其中合法 `task_id = A_task_valid`；另备不在 `tasks` 内的 `A_task_invalid`。
- **B_mission / B_mission_id**：B 名下 DailyMission（A 不拥有）。
- **A_mission_future**：A 名下 `mission_date` 为「明天」（超出 `MISSION_GRACE_DAYS=0`）的 DailyMission。
- **服务器时区**：测试环境显式设为 `Asia/Shanghai`（R3 用例依赖）。
- **频控**：已实现（per-user 内存固定窗口，默认 30/min，单实例；多实例部署须换 Redis 共享存储）。

## 1. 越权 / 资源归属（P0-2 / P1-7 / R1 / R2）

### TC-A1 跨用户完成他人 mission → 404，且不泄露归属
- **前置**：A 已登录；`B_mission_id` 已知（测试中由 B 创建后取得）。
- **请求**：`POST /api/missions/{B_mission_id}/tasks/{A_task_valid}/complete`，Headers `X-User-Token: A`。
- **期望**：
  - 状态码 **404**。
  - body 文案 == 「资源不存在」，且与 TC-A2（真不存在）返回的 body **字节级一致**（证明不区分「不存在」与「非本人」）。
  - DB **不得**新增任何属于 A 或 B 的 `MissionCompletion`（A 无法在 B 的 mission 上写完成记录）。
- **映射**：P0-2、R1、P1-7。

### TC-A2 完成不存在的 mission_id → 404（基线一致性）
- **请求**：`POST /api/missions/{random_uuid_not_exist}/tasks/{A_task_valid}/complete`，`X-User-Token: A`。
- **期望**：404，body == 「资源不存在」；与 TC-A1 的 body 完全一致。
- **映射**：P1-7。

### TC-A3 task_id 不在 mission.tasks 内 → 404
- **前置**：A_mission 存在，`A_task_invalid` 不在其 tasks 列表。
- **请求**：`POST /api/missions/{A_mission_id}/tasks/{A_task_invalid}/complete`，`X-User-Token: A`。
- **期望**：404，body == 「资源不存在」；DB **不**新增 `MissionCompletion`。
- **映射**：R2、P1-6。

### TC-A4 读自己资源正常（正向基线）
- **请求**（均带 `X-User-Token: A`）：
  - `GET /api/goals/me`
  - `GET /api/missions/today`
  - `GET /api/missions/streak`
- **期望**：200；返回体仅含 A 自己的 goal/mission/streak；**不得**出现 B 的任何资源字段。
- **映射**：P0-2（正向）。

### TC-A5 路径参数带他人 id 的资源读 → 404
- **说明**：若任意读接口以资源 id 作路径参数（如 `GET /api/goals/{goal_id}`），用 B 的 goal_id 访问。
- **请求**：`GET /api/goals/{B_goal_id}`，`X-User-Token: A`。
- **期望**：404，body == 「资源不存在」；与不存在 id 的返回一致。
- **映射**：P0-2、P1-7。
- **注**：若最终设计无此类路径参数接口，本用例标记 **N/A** 并记录原因。

## 2. 幂等 / 并发 / streak 服务端计算（P1-6 / R2 / R3）

### TC-B1 重复完成同一任务 → 幂等，streak 仅 +1
- **前置**：A 当天未完成 A_mission 的 A_task_valid；记录完成前 `streak = S0`。
- **请求1**：`POST .../complete`（A_mission_id, A_task_valid），`X-User-Token: A` → 200。
- **请求2**（紧随）：同接口同参数。
- **期望**：
  - 两次均 **200**（幂等，不 409/报错）。
  - 最终 `streak == S0 + 1`（不因第二次 +2）。
  - `MissionCompletion` 表 `(A, A_mission_id)` **唯一一行**（`unique` 约束生效）。
- **映射**：P1-6、R2。

### TC-B2 并发完成同一 mission → 无双计
- **前置**：A 当天未完成；并发发起 N（如 10）个相同 complete 请求（同 mission_id+task_id），`X-User-Token: A`。
- **期望**：
  - 至少一个 200，其余幂等合并（不报错）。
  - `MissionCompletion` 表 `(A, A_mission_id)` **仅 1 行**。
  - 最终 `streak == S0 + 1`（非 +N）。
  - 验证原子 upsert：completion 记录数 == 1 且 streak 增量 == 1。
- **映射**：P1-6。

### TC-B3 非当天 mission（未来日期）→ 拒绝，不顺延 streak
- **前置**：A_mission_future 存在（mission_date 为明天）；`streak = S0`。
- **请求**：`POST .../complete`（A_mission_future_id, 其合法 task_id），`X-User-Token: A`。
- **期望**：
  - 被拒（建议 **400**；关键是不得写入完成记录、不得 +streak）。
  - `streak` 保持 `S0`（不顺延）。
  - DB **无**对应 `MissionCompletion`。
- **映射**：P1-6（`MISSION_GRACE_DAYS=0`）。

### TC-B4 服务器时区显式 Asia/Shanghai（R3）
- **前置**：服务器 TZ = `Asia/Shanghai`；构造场景：客户端本地时间 23:30（属「当天」），但对应 UTC 已跨到次日。
- **请求**：在本地 23:30 时刻 `POST .../complete`（A_mission_id, A_task_valid），`X-User-Token: A`。
- **期望**：
  - `mission_date` / `completed_date` 以 **Asia/Shanghai 当天日期**定稿（与本地 23:30 一致），不按 UTC 跨日。
  - `streak` 不因「本地午夜」错乱重置；跨本地午夜的连续两天完成仍正确累计。
  - 验证：直查 DB 的 `mission.mission_date`、`completion.completed_date` 均为 Asia/Shanghai 日期。
- **映射**：R3。

## 3. 输入校验（P1-4）

### TC-C1 trait_target 非枚举 → 422
- **前置**：A 已登录。
- **请求**：`POST /api/goals`，body `{ "trait_target": "arbitrary_string_not_in_enum", "source_figure": "lincoln" }`，`X-User-Token: A`。
- **期望**：**422**；不落库；错误信息**不**回显用户输入原文（避免反射）。
- **映射**：P1-4。

### TC-C2 source_figure 非 celebrity id → 422
- **请求**：`POST /api/goals`，body `{ "trait_target": "<合法枚举值>", "source_figure": "not_a_real_figure" }`，`X-User-Token: A`。
- **期望**：**422**；不落库。
- **映射**：P1-4。

### TC-C3 多传未知字段 → 按设计 422 或忽略
- **请求**：`POST /api/goals`，body 含合法字段 + 额外未知字段（如 `"foo": "bar"`），`X-User-Token: A`。
- **期望**：依设计二选一 —— (a) **422** 拒绝；(b) 忽略未知字段且未知字段**不**入库/不回显。断言：未知字段不得出现在响应或 DB。
- **映射**：P1-4（纵深）。

### TC-C4 合法输入 → 2xx 且存白名单 id
- **请求**：`POST /api/goals`，body `{ "trait_target": "<合法枚举>", "source_figure": "lincoln" }`，`X-User-Token: A`。
- **期望**：2xx；DB 存 `source_figure = "lincoln"`（白名单 id）；回包可含 `source_figure_name`（须取自 `celebrity.yaml`，**非**用户输入）。
- **映射**：P1-4（正向）。

## 4. 新用户建号路径 / RequireUser（P0-3 / R4）

### TC-D1 裸调 missions 路由（token 合法但无 DB 记录）→ 401
- **前置**：生成一个合法 UUID token，但 DB 中无该用户（未走测评流）。
- **请求**：`POST /api/goals`，`X-User-Token: <合法 UUID 无记录>`。
- **期望**：**401**「身份未注册」；单次返回，无级联/重试死循环。
- **映射**：P0-3、R4。

### TC-D2 token 格式非法 → 401
- **请求**：`POST /api/goals`，`X-User-Token: "not-a-uuid"`。
- **期望**：**401**；不自动建号、不落库。
- **映射**：P0-3。

### TC-D3 缺 token → 401
- **请求**：`POST /api/goals`，无 `X-User-Token`。
- **期望**：**401**。
- **映射**：P0-3。

### TC-D4 正常流无死循环（正向）
- **前置**：全新用户先 `POST /api/sessions`（`current_user` 自动建号落库）。
- **请求链**：`POST /api/sessions`（建号）→ `POST /api/goals`（同 UUID）→ `GET /api/missions/today`。
- **期望**：全部 2xx；`RequireUser` 因用户已存在而放行，无 401 死循环（验证 R4 产品流：bootcamp 经 `report.html` 按钮进入、需先有 result，而 result 来自测评流自动建号）。
- **映射**：P0-3、R4。

## 5. 频控（R5）

> **建议阈值（prod 前须落地为配置；非设计阻塞，但为 prod 门禁）**：
> - `POST /api/goals`：≤ 1 次/分钟/用户
> - `POST .../complete`（同 mission+task）：≤ 1 次/秒/用户（幂等为主，频控为辅）
> - （可选）全局 `/api/missions/*` 合理上限，防刷徽章/streak

### TC-E1 /api/goals 超频 → 429
- **请求**：同一用户 1 分钟内第 2 次 `POST /api/goals`。
- **期望**：**429**（或依实现 throttle）。
- **映射**：R5。

### TC-E2 同任务完成超频 → 被限流（与幂等正交）
- **请求**：同一用户对同 mission+task 在 <1s 内高频重发（远超并发语义）。
- **期望**：被限流（429）或幂等合并；关键：不得产生 >1 的 `streak` 增量。
- **映射**：R5。

## 6. 实现静态核查（非功能，quality + security 共查）

backend 实现后，除运行上述用例外，须静态确认：
- [ ] 所有 missions service 查询带 `WHERE user_id = :uid`；`_get_owned_or_404` 包裹每个按 id 查找（R1）。
- [ ] `MissionCompletion` 含 `unique(user_id, mission_id)` 约束（P1-6 并发门）。
- [ ] 所有 `/api/missions/*` 路由改用 `RequireUser`（非 `current_user` 自动建号）（P0-3）。
- [ ] 服务器时区显式 `Asia/Shanghai`（配置或启动项）（R3）。
- [ ] `source_figure` 回包 `name` 取自 `celebrity.yaml`，无用户可控文本进入 `strict_prompt`（P1-5 复核）。
- [x] 错误信息统一「资源不存在」，无按存在性/归属差异化的分支（P1-7；F1 已修复 /today 例外）。

## 7. 门禁总览（Gate）

- **[P0] 必过（任一失败 → 阻塞上线）**：
  TC-A1、TC-A2、TC-A3、TC-A4、TC-A5（越权/404 统一）、
  TC-B1、TC-B2、TC-B3（幂等/并发/无双计/无补打）、
  TC-D1、TC-D2、TC-D3（RequireUser 401）、
  TC-C1、TC-C2（输入校验 422）、
  §6 静态核查全部 ✓。
- **[P1] 必过（失败需 team-lead 决策；R5 频控 prod 前必须配置）**：
  TC-B4（时区）、TC-C3、TC-C4、TC-D4（建号流）、TC-E1、TC-E2（频控）。
- **独立 prod 阻塞（非本清单门禁，需 team-lead 跟踪）**：P0-1 生产真实登录 —— jwt 已落地（见上）；wx 仍待实现（需外部凭据）。

## 8. 与 R1–R5 映射速查

| 残余项 | 覆盖用例 |
|--------|----------|
| R1 完成前校验 mission 归属 | TC-A1、TC-B1、TC-B2（`_get_owned_or_404`） |
| R2 task_id ∈ mission.tasks | TC-A3、TC-B1、TC-B2 |
| R3 Asia/Shanghai 显式时区 | TC-B4 + §6 静态核查 |
| R4 建号流无死循环 | TC-D1、TC-D4 |
| R5 per-user 频控阈值 | TC-E1、TC-E2 + §6 配置核查 |

---
*作者：security。生成日期依赖执行环境；用例状态以 quality-engineer 执行结果为准。*
