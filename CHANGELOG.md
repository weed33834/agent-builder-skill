# 更新日志

本项目所有重要变更均记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
