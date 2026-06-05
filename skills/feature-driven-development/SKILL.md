---
name: feature-driven-development
description: The main flow for building new features. Contract-first orchestration — capture a plan, define testable assertions, decompose into features, then drive a milestone-gated execution loop using fresh-context implementer/reviewer/validator subagents. Use when a change touches multiple files, has multiple acceptance criteria, or spans more than one feature.
---

# Feature-Driven Development (FDD)

You are about to enter **FDD mode**: the architect and manager of a contract-first,
multi-agent build. **You do not write implementation code — you design the build,
define what "done" means, and drive fresh-context subagents to deliver it.**

User goal (when passed via `$ARGUMENTS`): `$ARGUMENTS`

## Overview

FDD keeps the volatile state of a build — the plan, the definition of done, the
work list — in a **gitignored runtime tree**, one directory per plan, and leans on
the `hs-plan` CLI for all mechanical bookkeeping. The controller curates context
and orchestrates; reused subagents do the work.

Reused subagents (no new agent types):

- `harness-stack:implementer` — implements one feature
- `harness-stack:spec-reviewer` — checks the diff against the feature spec
- `harness-stack:code-reviewer` — checks production readiness
- `user-test-validator` (via `harness-stack:user-test`) — probes the running system against contract assertions

**Core principle:** the controller curates context. Implementers don't read the
plan; spec-reviewers don't trust implementer reports; code-reviewers don't
substitute for spec-reviewers; user-test-validators don't read the source.

## The two locations

| Location | Holds | Versioned? |
|---|---|---|
| `.harness-runtime/plans/<slug>/` | per-plan state: `plan.md`, `validation-contract.md`, `validation-state.json`, `features.json` (+ `handoffs/`, `sealed-milestones.json`) | **No — gitignored** |
| `docs/` | project Library: conventions + memory (`product-spec.md`, `architecture.md`, `api-spec.md`, `frontend-spec.md`, `design-docs/`, `references/`, `golden-rules.md`, `user-test-patterns.md`, `user-tests/_shared/`) | Yes |

Requirement and plan documents go stale fast, so they live in the runtime tree, not
`docs/`. **Code is the source of truth** for what a feature actually does and how it
is built; the Library records durable conventions, not per-feature detail.

## When to Use

- The request touches many files, has multiple acceptance criteria, or spans more than one feature.
- You want every feature to pass a spec gate **and** a code-quality gate **and** a runtime probe before the next one starts.
- The work is well-formed enough to decompose into independently-implementable features.

## When NOT to Use

- A single-file or trivial change — just do it (or use `harness-stack:tdd` for one logic change).
- Pure exploration where the shape is unknown — clarify first; reach for `harness-stack:debate`/`harness-stack:decide`, or write a `harness-stack:design` doc.
- The solution is genuinely ambiguous and needs a technical design argued out first — write that design doc, then run FDD against it.

## You do not implement

You are the architect. **You never write implementation code and never run the build yourself.**

When the user asks you mid-flow to fix/build/change something, follow *Handling
mid-flow user requests* in `references/execution.md`. In short: understand the change
(investigate via read-only subagents), get confirmation, propagate it to shared
state (`plan.md` + the contract + `docs/` Library where durable), decompose into
features, then resume the loop and let implementers build.

Your tools: `Read`/`LS`/`Glob` for structure only; `Edit`/`Write` **only** for plan
artifacts under `.harness-runtime/plans/<slug>/` and durable `docs/` Library updates,
**never** for implementation code; `Bash` for `hs-plan` calls and light checks; `Task`
as your primary tool; `AskUserQuestion` for clarification (heavy in Phase 1, light later).

## Requirement tracking

Every requirement the user states — even in passing, even once — must be captured and
tracked. In Phase 1, replay every captured requirement before proposing the plan. When
the user raises a new requirement or change mid-flow, treat the offhand mention exactly
like a formal one and propagate it (see `references/execution.md`). **Every file that
records an old truth must be updated to the new truth before an implementer resumes.**

## Workflow

Four phases, in order. Read the referenced file when you enter each phase.

| Phase | Reference | Output |
|---|---|---|
| 1. Plan | `references/planning.md` (template: `references/plan-template.md`) | accepted `plan.md` |
| 2. Contract | invoke `harness-stack:test-spec` (authors the contract) | `validation-contract.md` → `hs-plan init-state` writes `validation-state.json` |
| 3. Features | `references/features.md` | `features.json`, passing `hs-plan contract-coverage` |
| 4. Execution | `references/execution.md` (+ `references/handoff-handling.md`) | green plan: every assertion `passed`, every milestone sealed, final integration review clean |

Trivial work skips the lifecycle. Do not skip Phase 1 — planning quality is amplified
by every later phase.

### Phase 1 — Plan
Init the plan dir (`hs-plan init <slug>`), understand requirements with the user,
investigate the codebase via read-only subagents, agree milestones (vertical slices),
and write the accepted proposal to `plan.md`. Get explicit acceptance before Phase 2.
Full procedure: `references/planning.md`.

### Phase 2 — Contract
Invoke `harness-stack:test-spec`, pointed at this plan, to author
`validation-contract.md` — the testable, user-observable assertions (`VAL-<AREA>-NNN`)
that define done. It runs the adversarial multi-agent authoring pass and finishes with
`hs-plan init-state` to seed `validation-state.json` (all assertions `pending`). This
is the contract-first TDD gate: **no `features.json` until the contract exists.**

### Phase 3 — Features
Decompose the milestones into `features.json`, each feature `fulfills`-bound to the
assertions it makes testable. Order foundational features first. Finish with
`hs-plan contract-coverage` reporting OK (each assertion claimed by exactly one
feature). Full procedure: `references/features.md`.

### Phase 4 — Execution
Drive the loop: `hs-plan next-feature` → dispatch `implementer` → spec-review →
code-review → (for completing features) `user-test` probe → handoff decision tree →
at milestone boundaries run the validator pair and `hs-plan seal-milestone` → final
integration review → `hs-plan gate`. Full procedure: `references/execution.md`;
handoff routing: `references/handoff-handling.md`.

## Decoupled: design

`harness-stack:design` is **not** part of this flow. It is a standalone, human-invoked
tool for writing a technical implementation doc to `docs/design-docs/`. FDD reads an
existing design doc if one is present, but never invokes `design` and never requires one.

## Getting started

1. Confirm to the user you've entered FDD mode; restate the goal in one sentence for correction.
2. `hs-plan init <slug>` to create the plan dir.
3. Read `references/planning.md` and begin Phase 1. Do not jump ahead to features or execution.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just write this one feature myself, it's small." | Once the controller writes code, the fresh-context invariant is gone for the rest of the run. Dispatch an implementer. |
| "I'll skip the contract and go straight to features." | Without the contract there is nothing for `fulfills` to bind to and nothing for the gate to check. Contract first, always. |
| "Requirements live in code, so I don't need a plan." | Code is truth for *what is built*; the plan is how you decide *what to build* and track that nothing was dropped. Both exist. |
| "I'll keep the plan in docs/ so it's versioned." | Plans go stale and rot the Library. Per-plan state is gitignored on purpose; durable conventions go to docs/. |
| "This needs a design doc, so I'll run design as Phase 0." | design is decoupled. If the solution is ambiguous, write the design doc first as a separate step, then run FDD. |

## Red Flags

- Controller edits implementation code (any file outside `.harness-runtime/plans/<slug>/` or `docs/`).
- `features.json` written before `validation-contract.md` exists.
- Plan/contract/state authored into `docs/` instead of `.harness-runtime/`.
- Bookkeeping done by hand-editing JSON instead of `hs-plan` (drift; lost invariants).
- Phase 1 skipped or rushed; jumping straight to execution.
- Treating `design` as a required flow step.

## Verification

- [ ] `.harness-runtime/plans/<slug>/` holds `plan.md`, `validation-contract.md`, `validation-state.json`, `features.json`.
- [ ] `hs-plan contract-coverage` reports OK before execution starts.
- [ ] Every feature passed spec-review, code-review, and (if it `fulfills` assertions) a runtime probe.
- [ ] Every milestone is sealed; `hs-plan gate` reports all assertions `passed`.
- [ ] No implementation code was written by the controller.
