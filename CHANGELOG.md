# 更新日志

本项目所有重要变更均记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-07-21

### Added

- **题库分级扩充**:三镜各 80 题(共 240 题),支持 `fast`(20 题,tier 1)/ `standard`(40 题,tier 1+2)/ `deep`(80 题,全 tier)三版本,通过 URL `?version=` 切换
- **Playwright E2E 全流程测试**:以普通用户视角真实点击走通三镜 × 三版本共 9 组,覆盖全 9 种题型(scale/dilemma/forced_choice/slider/allocation/auction/sort/matrix/iat),含 IAT 词库驱动正确分类作答
- **PWA 离线支持**:Service Worker (`sw.js`) + Web App Manifest (`manifest.webmanifest`),可安装到桌面/移动端
- **Open Graph 分享卡**:`og-card.svg` + 动态注入 `og:title` / `og:description` meta
- **404 页面**:统一 404 模板,与站点视觉一致
- **ECharts 本地化**:vendor 目录托管 echarts.min.js,避免 CDN 依赖
- **首页 SEO 优化**:title / description / og 元数据动态注入
- 新增 `.github/workflows/ci.yml`:最低程度 CI(仅 pytest + ruff,不启用 dependabot 与自动合并)

### Changed

- 题库 `tier` 分层模型:tier=1 进 fast、tier≤2 进 standard、全 tier 进 deep;同 tier 内按题型分组排序减少 section-intro 切换
- 视觉系统从 Glassmorphism 2.0 收敛为「宣纸 × 墨 × 朱墨」古典美学,三镜专属色(旧铜/青石/钢蓝)
- README 同步更新:题数 163→240、API 文档补 `version` 参数、新增 E2E 测试与 PWA 章节

### Fixed

- 修复 `meta[property=og:title]` CSS 选择器在浏览器中无效(改用引号包裹属性值)
- 修复 take.js 中 scale/dilemma 作答后 300ms 延迟导致 E2E 检测时序错位
- 修复 value.yaml tier=1 题目顺序错乱(sort/scale 交错),改为按 (tier, type) 稳定排序
- 修复导航期间 `page.query_selector` 抛 "Execution context was destroyed",改为 try/except + URL 复检
- 修复 `page.goto` 等待 networkidle 超时,统一改用 `domcontentloaded`
- 修复 allocation 按钮 `#alloc-balance` 被 `.alloc-total.ok` 容器遮挡,改用 `force=True` 点击
- 修复 IAT 题型作答卡住:通过 API 预加载题库构建 word→category 映射,直接点正确一侧;并修复进度 N/N 时误跳过最后一词的逻辑
- 修复连续 IAT 题串题:检测 `.iat-area` 的 `data-q` 变化时退出内层循环,让主循环重建词映射

## [0.1.1] - 2026-07-15

### Added

- 重写 README,补全徽章、架构图、目录树、安装与使用文档
- 新增 LICENSE / CONTRIBUTING.md / CODE_OF_CONDUCT.md / SECURITY.md / CHANGELOG.md
- 新增 .github/ 模板(issue/PR 模板)
- 补全 49 位名人 SVG 肖像,延续 machiavelli.svg 风格
- celebrity.yaml 全部 50 条记录添加 image 字段

### Fixed

- 修复 pyproject.toml 缺少 `[build-system]` 和 packages 配置导致 `pip install -e .` 失败
- 修复测试 `ModuleNotFoundError: No module named 'app'`(上一项的下游)
- 修复 6 处 B904:except 子句中 raise 应使用 `from err` 或 `from None`
- 修复 scoring.py 中未使用的 budget 局部变量
- 修正 README 中数据规模与实际不一致(40→50 位名人,32→24 种意识形态)
- 更新 test_daily_missions_gate.py 中 TC-E 系列陈旧注释
- 调整 ruff/mypy 配置,修复 156 + 121 个 lint 警告

## [0.1.0] - 2026-07-15

### Added

- 三面镜子测评框架(名人镜/价值镜/意识镜)
- 9 种答题方法:量表/困境/分配/排序/IAT/滑块/强迫抉择/矩阵/拍卖
- 163 道题(名人镜 54 + 价值镜 54 + 意识镜 55)
- 50 位历史名人库 + 24 种意识形态库
- 行为轨迹采集(耗时/改主意次数/操作轨迹)
- 计分引擎 v3、冲突检测 v2、行为洞察 v2
- JWT 真实登录 + 匿名 UUID 双模鉴权
- 留存飞轮 MVP:教官每日任务、连续打卡、铁血徽章
- 三语 i18n(中/EN/日)
- ECharts 雷达图报告页
- 关系对比(公开摘要 + 维度反差 + 契合度)
- 安全门禁测试套件(TC-A..E + §6 静态核查)
- 生产环境 fail closed 校验
- per-user 限流(R5 防刷)
