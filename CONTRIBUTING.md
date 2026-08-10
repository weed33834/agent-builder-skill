# Contributing / 贡献指南

感谢你对 **Universal Agent Builder** 的兴趣！本项目以「规格驱动 · 拒绝空壳」为第一原则：**界面有按钮、后端有路由、文档有描述，都不算完成——必须三线对齐且真正嵌入运行时链路**。贡献前请先理解这一原则。

## 项目镜像 / Mirrors

本项目同步托管于三个平台，任选其一提交：

- GitHub：https://github.com/weed33834/agent-builder-skill
- Gitee：https://gitee.com/badhope/agent-builder-skill
- GitCode：https://gitcode.com/badhope/agent-builder-skill

> 三个仓库保持同步（main 分支），任意平台提交的 PR/Issue 都会被处理。

## 开发环境 / Development Setup

1. Fork 仓库（任意平台）。
2. Clone：`git clone <你的 fork 地址>`
3. 创建功能分支：`git checkout -b my-feature`
4. 做出你的修改。
5. 运行测试（见下方「测试」）。
6. 提交清晰的 commit message（建议遵循 Conventional Commits）。
7. 发起 Pull Request。

## 测试 / Testing

```bash
# 后端测试（Python 3.11 / 3.12）
cd templates/backend
pip install -r requirements.txt pytest pytest-asyncio
python -m pytest tests -v

# 前端类型检查 + 构建（Node 20+）
cd templates/frontend
npm install
npx tsc --noEmit
npm run build

# 生成器冒烟测试
python scripts/generate.py --output /tmp/smoke --name smoke --type chat
```

CI 会自动执行以上全部测试（见 `.github/workflows/ci.yml`）。

## 规格驱动贡献流程 / Spec-Driven Contribution Flow

本项目所有能力由文档体系驱动。**新增或修改任何功能，必须三线同步**：

1. **功能清单**：在 `docs/feature-checklist.md` 对应 M 模块（或新增模块）登记功能项
2. **深度规格**：在 `docs/deep-spec/` 对应模块按 7 章模板（定位/资产模型/配置清单/管理界面/运行时链路/安全权限/验证方法）写清「怎么做」
3. **验收测试**：在 `docs/acceptance-test.md` 追加对应验收条目（步骤 + 预期结果）
4. **代码实现**：让功能真正嵌入运行时链路（前端组件 + 后端接口 + 核心逻辑）
5. **文档索引**：如涉及新模块，同步 `docs/README.md` 索引与 README.md

> 只改代码不更新规格，或只写规格不落地代码，都会被标记为缺口（⬜）并拒绝合入。

## 代码规范 / Code Style

- **后端**：Python 3.11+，遵循 PEP 8，类型注解完整，函数要有 docstring
- **前端**：TypeScript strict 模式，组件单一职责，样式走现有 CSS 变量体系
- **保持聚焦**：一个 PR 一个主题（功能/修复/文档分开）
- **测试优先**：任何行为变更都需补充或更新测试

## 报告问题 / Reporting Issues

- 使用 [Bug 模板](.github/ISSUE_TEMPLATE/bug_report.md) 报告缺陷，[Feature 模板](.github/ISSUE_TEMPLATE/feature_request.md) 请求功能
- 缺陷报告请附上：复现步骤、环境信息、关联规格模块（M 编号）与验收条目
- **安全漏洞请勿公开提交**，按 [SECURITY.md](SECURITY.md) 私密上报

## 行为准则 / Code of Conduct

所有参与者须遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。请友好、尊重地进行讨论。

## License / 许可

通过贡献，你同意你的贡献将按项目的 Apache License 2.0 授权。
