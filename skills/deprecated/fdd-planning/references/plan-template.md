# plan.md 模板

写到 `.harness-runtime/plans/<slug>/plan.md`。这是一份**活文档**：随工作推进，Progress、Decision Log、Surprises 各小节都保持最新（controller 在每次状态变化时更新它们，好让一个全新读者几秒钟就能接上）。plan 目录已 gitignore——这是工作状态，不是提交进库的 artifact。

---

# Plan: <title>

**Slug:** <plan-slug>
**State:** Planning | Contracting | Executing | Blocked | Done
**Goal:** 2-4 句——这次构建交付什么、为何对用户重要。

## Expected functionality

### Milestone: <name>
- <feature shape> — 一句话
- …

### Milestone: <name>
- …

## Environment setup
- 依赖 / 版本约束
- 所需服务及其如何启动
- 所需环境变量

## Infrastructure (worker boundaries — authoritative)
- **Port range:** <range for new services>
- **Services to USE (already running):** <list>
- **Off-limits services / paths:** <list>  ← worker 绝不可碰这些
- **Concurrency:** <default: one feature at a time>
- **Other boundaries:** <free-form>

## Testing strategy
- Test command: `<cmd>`（规划时已确认可跑）
- User-test surface: <dev server + browser MCP / curl / CLI / fixtures>
- Surface cost tier: cheap | medium | expensive（见 docs/user-test-patterns.md）

## Non-functional requirements
- Performance / Security / Accessibility / Other: …

## Open questions
- 任何未决之事。保持简短——大多数应在接受前解决。

## Captured requirements
<!-- Replay every requirement the user stated, including offhand ones, so the user can
confirm nothing was dropped. One bullet each. -->

---

## Progress

<!-- Live dashboard. The ONLY section that uses checklists. Update at every state
change. Authoritative state of the build lives in features.json / validation-state.json
(via fdd); this is the human-readable narration. -->

**State:** Planning | Executing | Blocked | Done
**Active feature:** (id + started-at, or "none")
**Last handoff:** (timestamp — feature id — outcome)

### Handoff log
<!-- Append-only, newest at bottom. One line per dispatch:
`<ISO ts> <feature-id> <role> <outcome> [<commit-sha>]`
2026-06-05T11:18Z  auth-schema       implementer  DONE        abc123
2026-06-05T11:25Z  auth-schema       scrutiny     pass
2026-06-05T11:31Z  auth-login-endpt  implementer  DONE        def456
-->

## Decision Log
<!-- Every key design decision made while building, with one-line rationale. -->
(None yet)

## Surprises & Discoveries
<!-- Unexpected behaviors, bugs, optimizations found during the build, with evidence. -->
(None yet)
