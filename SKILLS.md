# SkillHub · Skill Registry

Every Skill here is a **self-contained, pre-loaded prompt workflow** — read it, and an agent can do the job correctly without back-and-forth. This file is the index.

> Language: English (primary, for searchability). Chinese/Japanese mirrors live in each skill's own README where available.

## Skills

| # | Skill | Location | Status | One-liner |
|---|-------|----------|--------|-----------|
| 1 | **agent-builder** · Universal Agent Builder | [`SKILL.md`](./SKILL.md) | ✅ Flagship | Builds a complete, production-grade AI Agent (backend + frontend + tests) from a one-line requirement |
| — | *(add yours)* | `skills/<name>/SKILL.md` or `SKILL_<name>.md` | 🆕 | — |

## How to add a Skill

1. **Create** `skills/<your-skill>/SKILL.md` (or a top-level `SKILL_<your-skill>.md`).
2. **Frontmatter**: `name` (kebab-case) + English `description` (for indexability).
3. **Depth**: follow the same template as the flagship — **Purpose / Location / Invocation / UI spec / Operations / AI-generation / Acceptance** — plus the default table so it runs without asking.
4. **Register**: add a row in the table above and, if needed, a `README` for the skill in EN/zh/ja.
5. **Smoke-test**: one-line prompt → expected output.

## Conventions

- Every skill **must** run on defaults (no user clarification required) unless genuinely ambiguous.
- Every claimed feature must be **verifiable** (real API / real effect), not a hollow shell.
- English is the primary language for repo metadata, tags, and descriptions; each skill may ship zh/ja mirrors.
