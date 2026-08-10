## 描述 / Description

请清晰描述本次 PR 做了什么，解决了什么问题。

Closes #(issue number)

## 变更类型 / Type of Change

- [ ] 🐛 Bug fix / 缺陷修复
- [ ] ✨ New feature / 新功能
- [ ] 📚 Documentation / 文档（README / deep-spec / 辅助文件）
- [ ] 🔧 Refactor / 重构
- [ ] 🧪 Test / 测试
- [ ] ⚙️ CI / 构建配置
- [ ] 其他（请说明）：

## 规格对齐 / Spec Alignment（重要）

本项目为**规格驱动**，请确认本次变更与文档体系三线同步：

- [ ] 关联深度规格：`docs/deep-spec/XX-*.md`（模块编号）
- [ ] 功能清单：`docs/feature-checklist.md` 对应 M 编号已更新（如涉及）
- [ ] 验收测试：`docs/acceptance-test.md` 对应条目已更新/新增（如涉及）
- [ ] README / docs/README.md 索引已同步（如涉及）

## 测试 / Testing

- [ ] 后端：`python -m pytest templates/backend/tests -v` 通过
- [ ] 前端：`npx tsc --noEmit` 与 `npm run build` 通过
- [ ] 生成器：`python scripts/generate.py --name smoke --type chat` 冒烟通过
- [ ] 补充/更新了单元测试

## 检查清单 / Checklist

- [ ] 我的代码遵循本仓库的代码风格
- [ ] 我已在 CHANGELOG.md 的 [Unreleased] 中添加变更说明
- [ ] 我阅读并遵守了 CONTRIBUTING.md 与 CODE_OF_CONDUCT.md
