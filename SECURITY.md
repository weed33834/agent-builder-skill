# Security Policy / 安全策略

## 报告漏洞 / Reporting a Vulnerability

如发现安全漏洞，请**不要公开**提交 Issue 或 PR，按以下方式私密上报：

1. **邮箱上报**：发送邮件至项目维护者（见 [AUTHORS.md](AUTHORS.md)），标题注明 `[SECURITY]`。
2. **GitHub 私有漏洞报告**：使用 [GitHub 私有漏洞报告](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)（仓库 Security 标签页 → Report a vulnerability）。
3. 请包含：漏洞清晰描述、复现步骤、潜在影响范围。

我们将在 **48 小时内**确认收到，并根据严重程度在 **14 天内**提供修复或缓解方案。

## 安全边界声明 / Security Boundary

本项目涉及 AI 安全（见 `docs/deep-spec/27-ai-security.md`）、权限体系（`13-iam.md`）、沙箱（`02-sandbox.md`）等安全敏感模块。以下问题均在安全范围内：

- 提示注入（直接/间接/多模态隐形注入）
- 越狱与红队绕过
- RBAC 权限绕过、越权访问
- 沙箱逃逸、工具滥用、凭据泄漏
- 多租户数据隔离（`16-enterprise-org.md`）
- 供应链与依赖漏洞

## 支持的版本 / Supported Versions

| 版本 | 支持状态 |
|------|----------|
| main（最新） | ✅ 安全更新 |
| 历史 release | ❌ 仅最新版本获得安全更新 |

## 披露策略 / Disclosure Policy

漏洞修复并发布后，我们将发布安全公告（GitHub Security Advisory），并致谢报告者（除非其要求匿名）。
