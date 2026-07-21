# MindMirror 协作规约

本文件描述参与 MindMirror 开发的协作约定,贡献者请在提 PR 前通读。

## 核心约定

- **先规划后实现**:没有确认的需求不脑补代码;关键信息缺失先问,不要猜
- **最小变更**:不顺手重构、不批量改格式;一个 PR 只解决一件事
- **去 AI 味**:拒绝机械化总分总、过度防御代码、无意义的 docstring 重复签名;注释只写"为什么"不写"是什么"
- **失败熔断**:同一 bug 连续失败 2 次立即停止,交人类决策,不要硬试
- **歧义即停**:遇到模糊指令先确认,不要凭直觉往下做

## 技术栈

- Python 3.12+ / FastAPI / SQLAlchemy 2.0 async / aiosqlite / Pydantic v2 / PyYAML / pendulum
- 前端纯 HTML+JS+CSS(无构建步骤),ECharts 雷达图,自研三语 i18n
- 测试:pytest + pytest-asyncio,httpx.ASGITransport 驱动真实端点
- 包管理:uv

## 代码风格

- 行宽 100,Python 3.12 target
- ruff + mypy 双重检查(`uv run ruff check .` / `uv run mypy app/`)
- 类型标注:public API 必须标注,internal helper 可省略
- 异步:所有 DB I/O 必须 async;不要在 async 函数里跑阻塞调用
- 时区:涉及日期统一用 `pendulum` 的 Asia/Shanghai,绝不写 `date.today()` / `datetime.now()`

## 项目结构

```
app/
├── api/routes/     # FastAPI 路由,5 个文件:auth/assessments/sessions/results/missions
├── core/           # 配置/DB/安全/JWT/限流/依赖注入/日志
├── data/           # YAML 题库加载器
├── models/         # SQLAlchemy 2.0 声明式模型,ULID 主键
├── schemas/        # Pydantic v2,9 种答题类型判别联合
├── services/       # 业务层:scoring/conflicts/insights/matchers/missions/...
└── main.py         # 入口
data/               # YAML 题库/名人库/意识形态库/任务模板
static/             # 前端纯 HTML/JS/CSS + SVG 肖像
tests/              # pytest,含安全门禁测试
```

## 安全铁律

- 写/读端点用 `RequireUser` 强制鉴权,**绝不自动建号**
- 跨用户资源访问统一 404,不区分"不存在"与"非本人"(防枚举)
- 答案服务端逐题校验(422),不信任前端
- 生产环境 fail closed:`validate_production()` 拒绝 debug/local/sqlite/默认 secret/wx
- 限流 per-user 60s 固定窗口,超频 429 + Retry-After
- 前端所有动态 HTML 经 `escapeHtml` 转义防 XSS
- 密码哈希用 pbkdf2_hmac(sha256, 20w 轮) + 16 字节 salt,`hmac.compare_digest` 常量时间比较

## 测试约定

- 每个测试文件独立使用临时 sqlite 库,不污染真实库
- `pytest_asyncio` fixture 自动清空所有表保证隔离
- 提交前必须 `uv run pytest tests/` 全过
- 安全门禁测试在 `tests/test_daily_missions_gate.py`,覆盖 TC-A..E + §6 静态核查

### E2E 全流程测试(Playwright)

`scripts/e2e_walkthrough.py` 以普通用户视角真实点击走完全流程,不直接调 API:

```bash
# 1. 先启动开发服务器
uv run fastapi dev app/main.py --host 0.0.0.0 --port 8765

# 2. 首次运行需装浏览器内核
uv run playwright install chromium

# 3. 跑全流程(三镜 × 三版本 = 9 组)
uv run python scripts/e2e_walkthrough.py
```

覆盖:首页渲染 → 进入 take.html → section-intro 点击过渡 → 逐题作答(全 9 种题型)→ 跳转 report.html → 结果页渲染检查。IAT 题型通过 API 预加载题库构建 word→category 映射,直接点正确一侧。任何 console 错误或网络失败都会被记入 `issues` 列表。

提交题库或前端改动前建议跑一遍 E2E,避免引入回归。

## 提交规范

格式:`<type>(<scope>): <subject>`

- type:feat / fix / refactor / docs / test / chore / perf
- scope:auth / sessions / results / missions / scoring / celebrity / etc.
- subject:动词起首,中文英文均可,不超过 50 字

示例:
- `feat(missions): 留存飞轮 MVP — 教官每日任务闭环`
- `fix(security): JWT 校验失败统一 401 不区分原因`

## 题库扩展

新增题目/名人/意识形态时:
1. 编辑 `data/questions/*.yaml` / `data/figures/celebrity.yaml` / `data/ideologies/ideology.yaml`
2. 每题必须标 `tier`(`1`=进 fast/standard/deep,`2`=进 standard/deep,`3`=仅 deep),同 tier 内按题型分组排序
3. 名人图片放 `static/images/celebrities/{id}.svg`,240×240 viewBox,延续 machiavelli.svg 风格
4. YAML 中 `image` 字段路径写 `/images/celebrities/{id}.svg`
5. 跑单元测试 + E2E 全流程(`uv run python scripts/e2e_walkthrough.py`)确认无回归

## 自动化与依赖管理

**本仓库不启用任何机器人自动化**:

- **不启用 Dependabot** —— 依赖更新由维护者手动进行,不接受 dependabot 自动 PR
- **不启用自动合并(auto-merge)** —— 所有 PR 必须人工审查后手动合并
- **不启用自动发布** —— 版本发布由维护者手动打 tag
- **不启用 Stale Bot** —— issue/PR 不会因为闲置被自动关闭

CI 仅保留最低程度的 `.github/workflows/ci.yml`:在 push 和 PR 时运行 `pytest` + `ruff check`,不触发任何额外动作。

## 已知限制

- wx 微信小程序登录未实现(`validate_production` 已拒绝 wx 启动)
- 限流为单实例内存版,多实例部署需迁移 Redis
- 生产部署需切 Postgres + Alembic 迁移
- 名人肖像为程序化生成 SVG,非真实照片(避免版权风险)
