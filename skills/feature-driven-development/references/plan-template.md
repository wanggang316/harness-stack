# plan.md Template

Write to `.harness-runtime/plans/<slug>/plan.md`. This is a **living document**: the
Progress, Decision Log, and Surprises sections are kept current as work proceeds (the
controller updates them at every state change so a fresh reader can pick up in seconds).
The plan dir is gitignored — this is working state, not a committed artifact.

---

# Plan: <title>

**Slug:** <plan-slug>
**State:** Planning | Contracting | Executing | Blocked | Done
**Goal:** 2-4 sentences — what this build delivers and why it matters to a user.

## Expected functionality

### Milestone: <name>
- <feature shape> — one line
- …

### Milestone: <name>
- …

## Environment setup
- Dependencies / version constraints
- Required services and how they start
- Required env vars

## Infrastructure (worker boundaries — authoritative)
- **Port range:** <range for new services>
- **Services to USE (already running):** <list>
- **Off-limits services / paths:** <list>  ← workers must NEVER touch these
- **Concurrency:** <default: one feature at a time>
- **Other boundaries:** <free-form>

## Testing strategy
- Test command: `<cmd>` (verified working at planning time)
- User-test surface: <dev server + browser MCP / curl / CLI / fixtures>
- Surface cost tier: cheap | medium | expensive (see docs/user-test-patterns.md)

## Non-functional requirements
- Performance / Security / Accessibility / Other: …

## Open questions
- Anything unresolved. Keep short — most should be resolved before acceptance.

## Captured requirements
<!-- Replay every requirement the user stated, including offhand ones, so the user can
confirm nothing was dropped. One bullet each. -->

---

## Progress

<!-- Live dashboard. The ONLY section that uses checklists. Update at every state
change. Authoritative state of the build lives in features.json / validation-state.json
(via hs-plan); this is the human-readable narration. -->

**State:** Planning | Executing | Blocked | Done
**Active feature:** (id + started-at, or "none")
**Last handoff:** (timestamp — feature id — outcome)

### Handoff log
<!-- Append-only, newest at bottom. One line per dispatch:
`<ISO ts> <feature-id> <role> <outcome> [<commit-sha>]`
2026-06-05T11:18Z  auth-schema       implementer  DONE        abc123
2026-06-05T11:25Z  auth-schema       spec-review  pass
2026-06-05T11:31Z  auth-login-endpt  implementer  DONE        def456
-->

## Decision Log
<!-- Every key design decision made while building, with one-line rationale. -->
(None yet)

## Surprises & Discoveries
<!-- Unexpected behaviors, bugs, optimizations found during the build, with evidence. -->
(None yet)
