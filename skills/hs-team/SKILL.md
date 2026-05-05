---
name: hs-team
description: Multi-agent implementation workflow. Controller orchestrates implementer, spec-reviewer, and code-reviewer subagents per task with strict review gates and parallel batches when tasks are independent. Use when an ExecPlan has multiple tasks and you want full subagent automation rather than controller-driven manual implementation.
---

# Multi-Agent Implementation Team

## Overview

Controller does not write code. Every implementation, every spec check, every code review happens in a fresh subagent with curated context. The controller's job is to ingest the plan, slice it into batches, dispatch the right subagent at the right time, and integrate the results.

Three roles:

- `harness-stack:implementer` — does the work
- `harness-stack:spec-reviewer` — checks the diff against the spec
- `harness-stack:code-reviewer` — checks production readiness

Two modes:

- **Serial** — one task at a time, full impl → spec → code → done loop
- **Parallel batch** — N independent tasks fan out simultaneously through each phase, with a strict barrier before moving to the next

**Core principle:** the controller curates context. Implementers don't read the plan; spec-reviewers don't trust implementer reports; code-reviewers don't substitute for spec-reviewers.

## When to Use

- The plan has multiple tasks (3+) and you want every task to pass a spec compliance gate **and** a code quality gate before moving on.
- The tasks are described well enough that an implementer can act on the brief alone, without ambient session context.
- You want subagent-driven automation: controller doesn't write code, controller doesn't review code.

For small / iterative / exploratory work where the controller needs to make in-flight decisions while implementing, use `hs-exec-plan` instead.

## When NOT to Use

- Plan has 1–2 tasks. Setup and orchestration overhead exceed the benefit.
- The work is exploratory; you don't yet know the right shape. Brainstorm or refine the spec first.
- Tasks depend on mid-implementation decisions only the controller can make in context. Fresh-context dispatch breaks down here.

## Components

| Role | Subagent (dispatch) | Brief template |
|---|---|---|
| Implementation | `harness-stack:implementer` | `references/implementer.md` |
| Spec compliance | `harness-stack:spec-reviewer` | `references/spec-reviewer.md` |
| Code quality | `harness-stack:code-reviewer` | `references/code-reviewer.md` |

The subagents own the methodology (how to do the role). The brief templates carry per-dispatch inputs (task text, git range, etc.).

## Step 0 — Plan Ingestion (once)

1. Read the ExecPlan in full.
2. For each task, extract: task ID, full text, scene context, declared file scope, dependencies on prior tasks.
3. Build a batch plan:
   - Tasks whose file scopes intersect → must share a serial batch.
   - Tasks whose file scopes are disjoint **and** which have no logical dependency on each other → can be a parallel batch.
4. Create a TodoWrite list with every task; mark batch boundaries.
5. Announce the batch plan to the user before dispatching the first implementer.

## Step 1..N — Per-Batch Loop

### Serial Mode

```
┌──────────────────────────────────────────────────────────┐
│ dispatch harness-stack:implementer (references/implementer.md) │
│   ↓ status code                                          │
│ DONE                → proceed                            │
│ DONE_WITH_CONCERNS  → review concerns;                   │
│                       correctness/scope issue → re-dispatch │
│                       observation → proceed              │
│ NEEDS_CONTEXT       → fill missing context, re-dispatch  │
│ BLOCKED             → escalate per Round Budget          │
├──────────────────────────────────────────────────────────┤
│ dispatch harness-stack:spec-reviewer (references/spec-reviewer.md) │
│   ↓ verdict                                              │
│ ✅ Spec compliant   → proceed                            │
│ ❌ Issues           → re-dispatch implementer with findings │
│                       loop until ✅                      │
├──────────────────────────────────────────────────────────┤
│ dispatch harness-stack:code-reviewer (references/code-reviewer.md) │
│   ↓ verdict                                              │
│ Approve                                  → mark complete │
│ Approve with fixes (no Critical)         → mark complete │
│ Approve with fixes (Critical present)    → re-dispatch implementer; loop │
│ Request changes                          → re-dispatch implementer; loop │
├──────────────────────────────────────────────────────────┤
│ TodoWrite: mark task complete                            │
└──────────────────────────────────────────────────────────┘
```

### Parallel Batch Mode

Strict barrier per phase — the whole batch progresses together. Healthy tasks wait at each barrier while failing tasks loop back.

```
Phase A — Implementation (all N at once)
  Dispatch N implementers in a single Task() round.
  Wait for all N to return.
  Any BLOCKED / NEEDS_CONTEXT → handle that task per Round Budget;
    rest of the batch waits at the barrier.

Phase B — Spec Review (all N at once)
  Dispatch N spec-reviewers in a single round, one per implementer's output.
  Wait for all N to return.
  Any ❌ → re-dispatch the corresponding implementer with findings
            (returns to Phase A for that task only;
             others wait at the next barrier).
  Repeat until all ✅.

Phase C — Code Review (all N at once)
  Dispatch N code-reviewers in a single round.
  Wait for all N to return.
  Any Critical / Request changes → re-dispatch corresponding implementer;
                                    return to Phase B for affected tasks.
  Repeat until all clear.

Phase D — Integration
  Run the full test suite.
  Verify no merge conflicts between concurrent diffs.
  Mark all batch tasks complete.
```

### 4-Status Code Handling

| Status | Controller action |
|---|---|
| `DONE` | Proceed to spec review. |
| `DONE_WITH_CONCERNS` | Read concerns. Correctness or scope concerns → re-dispatch with a fix instruction. Observation concerns → note and proceed to spec review. |
| `NEEDS_CONTEXT` | Identify the missing context. Re-dispatch the same implementer with that context added to the brief. |
| `BLOCKED` | Diagnose: insufficient context → re-dispatch with more; needs more reasoning → re-dispatch with a more capable model; task too big → split it; plan itself is wrong → escalate to human. **Never re-dispatch under the same conditions.** |

### Review Failure Loop

When spec-reviewer or code-reviewer returns issues:

1. Pass the findings back to the **same implementer** subagent (re-dispatch with the report appended in the Notes section of the brief).
2. The implementer fixes and re-reports.
3. Re-dispatch the relevant reviewer.
4. Repeat until clean. Do not skip the re-review.

The controller never edits the code itself. That defeats the fresh-context invariant.

## Step N+1 — Final Integration Review (once)

After all batches complete:

1. Compute the full `BASE_SHA..HEAD_SHA` covering every task in the plan.
2. Dispatch one more `harness-stack:code-reviewer` with `references/code-reviewer.md` against the **integrated diff**. Per-task reviews didn't see cross-task interactions; this one does.
3. Any Critical / Important findings → fix per the review failure loop, then re-run the final review.
4. Once clean, hand off for commit / PR.

## Round Budget

**3 rounds per task.** If a task is still hitting:

- `BLOCKED` after 3 implementer dispatches, or
- ❌ from spec-reviewer after 3 implementer fix-and-retry rounds, or
- Critical findings from code-reviewer after 3 implementer fix-and-retry rounds,

then **stop dispatching and escalate to the human**. The plan, the spec, or the task scope is the problem; throwing more rounds at it dilutes signal and burns capacity.

## Red Flags

- **Controller writes code.** The moment the controller starts editing files, the workflow has degenerated into manual implementation. Stop and start over.
- **Parallel batch contains intersecting file scopes.** Implementers will stomp on each other. Move them to a serial batch.
- **Code review starts before spec review passes.** Wrong order; re-run spec first.
- **Same `BLOCKED` task re-dispatched without changing context, model, or task split.** Same input, same failure.
- **Skipping the final integration review.** Per-task reviews can't catch cross-task interactions, especially after a parallel batch.
- **Controller fixes review findings instead of looping back to the implementer.** Defeats fresh context.
- **Implementer reads the plan file.** The controller curates the brief; the implementer only sees what was handed in.
- **Round count > 3 on a single task without explicit human override.** If it's still failing, the problem isn't this round.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just patch this one finding myself, it's tiny." | Once the controller writes code, the fresh-context invariant is gone for the rest of the run. Loop back to the implementer. |
| "These two parallel implementers might touch the same file but probably won't conflict." | Probabilistic disjointness is not disjointness. Move to a serial batch. |
| "Spec compliance and code quality overlap; I'll skip spec review for trivial tasks." | Spec compliance is binary and cheap to verify; skipping it lets "wrong feature, well-built" through. |
| "The implementer is on round 4 but it's so close — one more round." | Round budget is a circuit breaker for a reason. Either the spec is wrong, the task is too big, or the model is wrong for this work. Escalate. |
| "Final integration review is redundant; every task already passed code review." | Per-task reviews see one diff at a time. Integration interactions only appear after merge. |

## Verification

Before declaring the workflow complete:

- [ ] Every task in the original plan is marked complete in TodoWrite.
- [ ] Every task passed `harness-stack:spec-reviewer` ✅ at least once.
- [ ] Every task passed `harness-stack:code-reviewer` Approve / Approve with fixes (no Critical) at least once.
- [ ] The final integration review against the full diff returned Approve / Approve with fixes (no Critical).
- [ ] Full test suite passes on the integrated diff.
- [ ] No task hit the round budget cap without explicit human override.
