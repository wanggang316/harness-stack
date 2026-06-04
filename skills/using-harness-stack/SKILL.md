---
name: using-harness-stack
description: Bootstrap doctrine for the harness-stack framework. Loaded automatically at session start to introduce the lifecycle map, golden rules, and how to pick the right harness-stack:* skill. Read this before invoking any harness-stack:* skill for the first time in a session.
---

# Using harness-stack

harness-stack is an agent-first development framework. Humans give direction; agents execute through a fixed catalogue of `harness-stack:*` skills, each owning one phase of the software lifecycle. This document is the entry point — it tells you which skill to reach for, not how each skill works internally.

## Lifecycle map

A non-trivial change moves through these phases. Pick the skill that matches the current phase, not the next one.

| Phase | Trigger | Skill |
|---|---|---|
| **Define** | What/why is unclear | `harness-stack:define-product`, `harness-stack:define-architecture`, `harness-stack:define-api-spec`, `harness-stack:define-frontend-spec`, `harness-stack:define-ui-spec` (one-time, project-wide) |
| **Design** (optional) | Solution is ambiguous; the technical approach should be argued first | `harness-stack:design` — a standalone technical doc → `docs/design-docs/`. Not a step in the main flow; FDD reads it if present. |
| **Build** (main flow) | Any non-trivial change | `harness-stack:feature-driven-development` — contract-first: plan → validation-contract → features → milestone-gated execution loop. Subsumes the old spec/planner/exec-plan/team; uses `harness-stack:test-spec` (Phase 2) and `harness-stack:user-test` (Phase 4) internally. `harness-stack:tdd` (test-first) inside an implementer's task. |
| **Verify** | Something is broken or unverified | `harness-stack:debug` (root cause), `harness-stack:user-test` (probe the running system against contract assertions; writes `validation-state.json`) |
| **Review** | Change is ready for scrutiny | `harness-stack:review-request` (dispatch), `harness-stack:review-receive` (handle findings), `harness-stack:security` (security audit) |
| **Deliberate** | Question is contested or high-risk | `harness-stack:debate` (multi-round), `harness-stack:decide` (one-shot parallel) |
| **Ship** | Code is approved | `harness-stack:commit` → `harness-stack:pr` → `harness-stack:changelog` → `harness-stack:land` → `harness-stack:ship` |
| **Meta** | Manage the framework itself | `harness-stack:docs-init`, `harness-stack:env-init`, `harness-stack:skill-create` |

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
- `@hs/plan` (`packages/hs-plan/`, bin `hs-plan`) is the deterministic bookkeeping CLI for feature-driven development. The FDD skill delegates all per-plan state transitions to it.
- All skills and agents are addressed through the `harness-stack:` plugin namespace (e.g. `harness-stack:feature-driven-development`, `harness-stack:code-reviewer`); the plugin name provides collision isolation, so individual skills and agents carry no extra prefix.
- `docs/` is the project **Library**: durable conventions + memory (architecture, design-docs, references, golden-rules, testing conventions). **Code is the source of truth** for specific requirements and implementation.
- Per-plan FDD state (plan, validation-contract, features) lives in `.harness-runtime/plans/<slug>/` — **gitignored**, never in `docs/`.

## How to use this document

- Use the lifecycle map as a decision table when picking a skill.
- When a task spans multiple phases, run the skills in order; do not collapse them.
- The slash command list shown at session start is the authoritative skill catalogue — this document only covers the harness-stack subset and its sequencing.
