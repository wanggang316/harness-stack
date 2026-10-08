# plan.md 模板

写到 `.harness-runtime/plans/<slug>/plan.md`。范围与决策随工作更新；机器进度从 `fdd progress` 读取，时间与交接事件由 `fdd log` 写入，避免人工维护重复状态。plan 目录已 gitignore——这是工作状态，不是提交进库的 artifact。

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
- **Implementation concurrency:** <default 1; isolated worktrees, dependencies, integration order if parallel>
- **Build slots:** <default 1; adjust from measured load>
- **Shared lanes:** <GUI/device/account identity, owner and coordination mechanism>
- **Preflight:** <project command/checks, readiness signal, recovery owner>
- **Worker lifecycle:** <host wait mechanism, stage budgets, log/artifact paths; no assumed watchdog>
- **Other boundaries:** <free-form>

## Testing strategy
- Feature self-verification: `<cmd>`（规划时已确认可跑）
- Repair reproducer: <smallest failing probe and affected regression scope>
- Milestone sweep: <commands, build identity, environment/fixture isolation>
- First usable build: <short real-use checklist; identify any agreed human-only gate>
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

运行 `fdd progress --plan <plan-slug>` 获取实时状态。`events.jsonl` 保存系统时间戳、attempt 和结果引用；此处不复制 handoff log，不手写估计时间。

## Backlog

<!-- Out-of-scope discoveries: source/finding id, impact, reason for deferral,
follow-up owner or destination. In-scope acceptance gaps remain active work. -->
(None yet)

## Decision Log
<!-- Every key design decision made while building, with one-line rationale. -->
(None yet)

## Surprises & Discoveries
<!-- Unexpected behaviors, bugs, optimizations found during the build, with evidence. -->
(None yet)
