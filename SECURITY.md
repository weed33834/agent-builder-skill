# 安全政策

## 报告漏洞

如果你发现了安全漏洞,请**不要**在公开 issue 中报告。

请通过以下方式私下联系维护者:

- 在 GitHub 提交 [Security Advisory](https://github.com/weed33834/mindmirror/security/advisories/new)
- 或发邮件至仓库维护者邮箱(参见 git commit 历史)

报告时请包含:

1. 漏洞的清晰描述和影响范围
2. 复现步骤(最小可复现示例)
3. 影响的版本(commit hash 或 tag)
4. 如果有,建议的修复方案

## 响应时间

- **首次回复**: 48 小时内确认收到报告
- **评估**: 7 天内给出影响评估和修复计划
- **修复**: 严重漏洞 30 天内发布修复版本

## 已知安全机制

MindMirror 已实现以下安全机制(详见 [AGENTS.md](./AGENTS.md)):

- JWT 认证(HS256,密钥来自 `AUTH_SECRET` 环境变量)
- 密码哈希 pbkdf2_hmac(sha256, 20w 轮)+ 16 字节随机 salt
- `hmac.compare_digest` 常量时间比较防时序攻击
- per-user 60s 固定窗口限流,超频 429
- 答案服务端逐题校验(422),不信任前端
- 跨用户资源访问统一 404 不区分「不存在」与「非本人」(防枚举)
- 前端所有动态 HTML 经 `escapeHtml` 转义防 XSS
- 生产环境 fail closed:`validate_production()` 拒绝 debug/local/sqlite/默认 secret 启动

## 已知限制

- **限流为单实例内存版** —— 多实例部署需迁移 Redis 共享存储
- **wx 微信登录未实现** —— `validate_production` 已显式拒绝 wx 模式启动
- **数据库为 SQLite** —— 生产部署需切换 Postgres + Alembic 迁移

## 支持的版本

仅最新 master 分支接收安全更新。
