# Documentation Index

harness-stack 文档中心。

## Core
- [Golden Rules](golden-rules.md) — 核心原则（必读）
- [State](state.md) — 按项目存放在 `~/.harness-stack/<project>/` 的配置与状态
- [skill-create](../.claude/skills/skill-create/SKILL.md) — 在本仓库新增或修改 skill（仓库内工具，不随插件分发）

## Skills

### Meta-Skills
- [harness-stack:feedback](../skills/feedback/SKILL.md) — 复盘并上报反馈

### Lifecycle Skills
| Phase | Skill | Link |
|-------|-------|------|
| Define | harness-stack:grill-with-docs | [SKILL.md](../skills/engineering/grill-with-docs/SKILL.md) |
| Define | harness-stack:domain-modeling | [SKILL.md](../skills/engineering/domain-modeling/SKILL.md) |
| Define | harness-stack:define-ui-spec | [SKILL.md](../skills/ui/define-ui-spec/SKILL.md) |
| Knowledge | harness-stack:document | [SKILL.md](../skills/engineering/document/SKILL.md) |
| Knowledge | harness-stack:audit-docs | [SKILL.md](../skills/engineering/audit-docs/SKILL.md) |
| Setup | harness-stack:setup-harness-stack | [SKILL.md](../skills/engineering/setup-harness-stack/SKILL.md) |
| Plan | harness-stack:to-spec | [SKILL.md](../skills/engineering/to-spec/SKILL.md) |
| Plan | harness-stack:to-github-issues | [SKILL.md](../skills/engineering/to-github-issues/SKILL.md) |
| Build | harness-stack:implement | [SKILL.md](../skills/engineering/implement/SKILL.md) |
| Build | harness-stack:tdd | [SKILL.md](../skills/engineering/tdd/SKILL.md) |
| Review | harness-stack:code-review | [SKILL.md](../skills/engineering/code-review/SKILL.md) |
| Review | harness-stack:review-request | [SKILL.md](../skills/engineering/review-request/SKILL.md) |
| Review | harness-stack:review-receive | [SKILL.md](../skills/engineering/review-receive/SKILL.md) |
| Deliberate | harness-stack:debate | [SKILL.md](../skills/productivity/debate/SKILL.md) |
| Deliberate | harness-stack:decide | [SKILL.md](../skills/productivity/decide/SKILL.md) |
| Ship | harness-stack:changelog | [SKILL.md](../skills/engineering/changelog/SKILL.md) |
| Ship | harness-stack:git | [SKILL.md](../skills/productivity/git/SKILL.md) |
| Ship | harness-stack:pr-open | [SKILL.md](../skills/engineering/pr-open/SKILL.md) |
| Ship | harness-stack:pr-land | [SKILL.md](../skills/engineering/pr-land/SKILL.md) |

已废弃的 skill 在 [skills/deprecated/](../skills/deprecated/)，不再加载。

### Subagents
- [harness-stack:investigator](../agents/investigator.md) — 只读调查 / 在线调研
- [harness-stack:code-reviewer](../agents/code-reviewer.md) — 代码审查
- [harness-stack:security-auditor](../agents/security-auditor.md) — 安全审计

## References
- [Project Knowledge](project-knowledge.md) — 当前知识、决策记录与交付过程的职责和维护方式
- [Testing Patterns](testing-patterns.md)
- [Security Checklist](security-checklist.md)
- [Performance Checklist](performance-checklist.md)
- [Review Checklist](review-checklist.md)
- [fdd CLI](fdd-cli.md)
- [Calling @hs/llm from a skill](calling-hs-llm-from-a-skill.md)
- [@hs/llm design doc](hs-llm-design.md)
