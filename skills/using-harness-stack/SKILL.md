---
name: using-harness-stack
description: Bootstrap doctrine for the harness-stack framework. Loaded automatically at session start to introduce the lifecycle map, golden rules, and how to pick the right hs-* skill. Read this before invoking any hs-* skill for the first time in a session.
---

# Using harness-stack

harness-stack is an agent-first development framework. Humans give direction; agents execute through a fixed catalogue of `hs-*` skills, each owning one phase of the software lifecycle. This document is the entry point — it tells you which skill to reach for, not how each skill works internally.

## Lifecycle map

A non-trivial change moves through these phases. Pick the skill that matches the current phase, not the next one.

| Phase | Trigger | Skill |
|---|---|---|
| **Define** | What/why is unclear | `hs-define-product`, `hs-define-architecture`, `hs-define-api-spec`, `hs-define-frontend-spec`, `hs-define-ui-spec`, `hs-define-test-spec` (one-time, project-wide) |
| **Spec** | Feature or change needs requirements | `hs-spec` (PM view), `hs-design` (engineering view), `hs-test-spec` (QA view) |
| **Plan** | Spec exists, work needs decomposition | `hs-planner` produces an ExecPlan |
| **Build** | ExecPlan ready | `hs-exec-plan` (single agent), `hs-team` (multi-agent), `hs-tdd` (test-first); `hs-followup-scope` decides where mid-flight discoveries go |
| **Verify** | Something is broken or unverified | `hs-debug` (root cause), `hs-user-test` (behaviour-level user-test probes) |
| **Review** | Change is ready for scrutiny | `hs-review-request` (dispatch), `hs-review-receive` (handle findings), `hs-security` (security audit) |
| **Deliberate** | Question is contested or high-risk | `hs-debate` (multi-round), `hs-decide` (one-shot parallel) |
| **Ship** | Code is approved | `hs-commit` → `hs-pr` → `hs-changelog` → `hs-land` → `hs-ship` |
| **Meta** | Manage the framework itself | `hs-docs-init`, `hs-env-init`, `hs-skill-create` |

Trivial work (one-line fix, typo, obvious rename) skips the lifecycle. Use judgment: the skills exist to prevent the failure modes of skipping them, not as ceremony.

## Golden rules

These hold across every skill. Full text in `docs/golden-rules.md`.

1. **AGENTS.md is a map, not a manual** — short entry, deep content lives in skills and docs.
2. **Repository knowledge is the source of truth** — anything an agent cannot read does not exist.
3. **Everything is a skill or subagent** — no out-of-band CLI tools.
4. **Progressive disclosure** — load only what the current task needs.
5. **Evidence required** — "I checked" is not verification; "I ran X, got Y" is.
6. **Anti-rationalization** — skills name the likely excuses up front and refute them.
7. **Platform-agnostic** — read project config, don't assume frameworks.
8. **Incremental delivery** — thin vertical slices over horizontal layers.
9. **Mechanize over document** — if a check can be automated, automate it.
10. **Self-bootstrapping** — harness improves itself through its own skills.
11. **Fix the environment, not the prompt** — repeated mistakes mean tooling needs work.
12. **Context is scarce** — every token loaded has a cost.

## Project facts

- TypeScript runtime packages live under `packages/`, managed via pnpm workspaces.
- `@hs/llm` (`packages/hs-llm/`) is the stateless LLM provider abstraction (api / cli / sdk / mock). Skills that call models go through it.
- All skills and agents use the `hs-` prefix to avoid namespace collisions with other plugins.
- Documentation root is `docs/`. `docs/recipes/` holds cross-cutting how-tos; `docs/references/` holds checklists and patterns.

## How to use this document

- Use the lifecycle map as a decision table when picking a skill.
- When a task spans multiple phases, run the skills in order; do not collapse them.
- The slash command list shown at session start is the authoritative skill catalogue — this document only covers the harness-stack subset and its sequencing.
