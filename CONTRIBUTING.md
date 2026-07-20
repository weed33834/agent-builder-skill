# 贡献指南

感谢你愿意为 MindMirror 投入时间。在提 PR 之前,请先读完本文件。

## 行为准则

参与本项目即代表你同意遵守 [Code of Conduct](./CODE_OF_CONDUCT.md)。请在所有交流中保持尊重、包容。

## 提 issue 前先做的事

- 翻一遍 [已知问题](https://github.com/weed33834/mindmirror/issues)和 [AGENTS.md](./AGENTS.md) 中的「已知限制」章节,确认问题没被记录过
- 如果是 bug,先在本地 `uv run pytest tests/` 跑一遍测试,确认不是环境问题
- 如果是题库/名人/意识形态数据问题,直接提 PR 修改 YAML 比提 issue 更快

## 提 PR 的流程

1. **fork + clone** —— fork 到自己账号,clone 到本地
2. **建分支** —— `feat/xxx` 或 `fix/xxx`,不要在 master 上直接改
3. **改代码** —— 遵循 [AGENTS.md](./AGENTS.md) 的协作约定
4. **跑测试** —— `uv run pytest tests/` 必须全过;`uv run ruff check .` 和 `uv run mypy app/` 必须无报错
5. **写提交信息** —— 格式见 [AGENTS.md](./AGENTS.md) 的「提交规范」章节
6. **提 PR** —— 用 [PR 模板](./.github/PULL_REQUEST_TEMPLATE.md) 描述改动

## 改动类型对应的检查清单

### Bug 修复

- [ ] 添加或更新测试用例覆盖 bug 场景
- [ ] 如果是安全相关 bug,先按 [SECURITY.md](./SECURITY.md) 私下报告,不要直接公开提 issue

### 新功能

- [ ] 在 [AGENTS.md](./AGENTS.md) 的「项目结构」中找到对应模块
- [ ] 加测试,不只是「能跑就行」
- [ ] 更新 README(如果用户可见行为变化)

### 题库 / 名人 / 意识形态数据

- [ ] 编辑 `data/questions/*.yaml` / `data/figures/celebrity.yaml` / `data/ideologies/ideology.yaml`
- [ ] 新增名人需同步添加 `static/images/celebrities/{id}.svg`(240×240,延续 [machiavelli.svg](./static/images/celebrities/machiavelli.svg) 风格)
- [ ] YAML 中 `image` 字段路径写 `/images/celebrities/{id}.svg`
- [ ] 跑测试确认 matchers 能正确取到新数据

### 文档

- [ ] 中文为主,英文为辅(可选)
- [ ] 不要用机翻腔;读起来要像人写的

## 开发环境

```bash
# 装依赖
uv sync --extra dev

# 启动开发服务器(自动重载)
uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000

# 跑测试
uv run pytest tests/

# 静态检查
uv run ruff check .
uv run mypy app/
```

## 不接受的贡献

- **真实名人肖像** —— 出于版权风险,所有名人图片必须为程序化生成 SVG,不接受 JPG/PNG/WebP 等真实照片
- **wx 微信登录实现** —— 需要真实 appid/secret 外部凭据,无法在开源仓库内完成;如有需求请自行 fork 实现
- **批量重构** —— 单个 PR 不应跨多个模块重构,拆成多个 PR
- **AI 生成的无意义注释/docstring** —— 注释只写「为什么」,不重复函数签名
