---
name: team
description: Multi-agent implementation workflow. Controller serially orchestrates implementer, spec-reviewer, code-reviewer, and user-test-validator subagents per task with strict review gates. Use when an ExecPlan has multiple tasks and you want full subagent automation rather than controller-driven manual implementation.
---

# Multi-Agent Implementation Team

## Overview

Controller does not write code. Every implementation, every spec check, every code review, every user-test probe happens in a fresh subagent with curated context. The controller's job is to ingest the plan, walk it one task at a time, dispatch the right subagent at the right point, and integrate the results.

Four roles:

- `harness-stack:implementer` — does the work
- `harness-stack:spec-reviewer` — checks the diff against the task spec
- `harness-stack:code-reviewer` — checks production readiness
- `user-test-validator` (via `harness-stack:user-test`) — probes the running system against user-test cases the task is bound to

**Execution is serial.** One task at a time, full impl → spec review → code review → user-test probe → next. Read-only side calls inside a single phase (parallel research subagents, parallel code review of independent files) are permitted; multiple implementers writing concurrently are not. Serial throughput is lower in raw token-rate but the error rate drops dramatically, and on multi-day runs that correctness compounds.

**Core principle:** the controller curates context. Implementers don't read the plan; spec-reviewers don't trust implementer reports; code-reviewers don't substitute for spec-reviewers; user-test-validators don't read the source.

## When to Use

- The plan has multiple tasks (3+) and you want every task to pass a spec compliance gate **and** a code quality gate before moving on.
- The tasks are described well enough that an implementer can act on the brief alone, without ambient session context.
- You want subagent-driven automation: controller doesn't write code, controller doesn't review code.

For small / iterative / exploratory work where the controller needs to make in-flight decisions while implementing, use `harness-stack:exec-plan` instead.

## When NOT to Use

- Plan has 1–2 tasks. Setup and orchestration overhead exceed the benefit.
- The work is exploratory; you don't yet know the right shape. Brainstorm or refine the spec first.
- Tasks depend on mid-implementation decisions only the controller can make in context. Fresh-context dispatch breaks down here.
- `docs/user-tests/<feature>.md` does not exist. Without case IDs, there is nothing for per-task and milestone gates to probe against. Run `/harness-stack:test-spec` first.

## Components

| Role | Subagent (dispatch) | Brief template |
|---|---|---|
| Implementation | `harness-stack:implementer` | `references/implementer.md` |
| Spec compliance | `harness-stack:spec-reviewer` | `references/spec-reviewer.md` |
| Code quality | `harness-stack:code-reviewer` | `references/code-reviewer.md` |
| User-test probing | `user-test-validator` via `/harness-stack:user-test` | brief assembled by the skill |

The subagents own the methodology (how to do the role). The brief templates carry per-dispatch inputs (task text, git range, etc.).

## Step 0 — Plan Ingestion (once)

1. Read the ExecPlan in full.
2. For each task, extract: task ID, full text, scene context, declared file scope, dependencies on prior tasks, **user-test case IDs the task is bound to in the plan's User Test Coverage table**, and any **procedures** the task or surrounding milestone requires.
3. Verify the coverage table is complete: every case declared in `docs/user-tests/<feature>.md` appears in ≥ 1 task row. If not, stop and ask the planner to revise — implementation cannot begin against an incomplete contract.
4. Order the tasks:
   - Respect declared dependencies (a task that depends on another must come later).
   - Within a milestone, order tasks by the smallest reasonable serial chain.
   - If the plan uses milestones, the Milestone Exit Gate (see below) runs before the next milestone's first task dispatches.
5. Create a TodoWrite list with every task in execution order; mark milestone boundaries.
6. Announce the execution order to the user before dispatching the first implementer.

## Step 1..N — Per-Task Loop (serial)

Execution is strictly one task at a time. Each task walks four gates; failures loop back to the appropriate gate without advancing.

```
┌──────────────────────────────────────────────────────────────────┐
│ dispatch harness-stack:implementer (references/implementer.md)   │
│   ↓ status code                                                  │
│ DONE                → proceed to spec review                     │
│ DONE_WITH_CONCERNS  → review concerns;                           │
│                       correctness/scope issue → re-dispatch      │
│                       observation → proceed to spec review       │
│ NEEDS_CONTEXT       → fill missing context, re-dispatch          │
│ BLOCKED             → escalate per Round Budget                  │
├──────────────────────────────────────────────────────────────────┤
│ dispatch harness-stack:spec-reviewer (references/spec-reviewer.md)│
│   ↓ verdict                                                      │
│ ✅ Spec compliant   → proceed to code review                     │
│ ❌ Issues           → re-dispatch implementer with findings      │
│                       loop until ✅                              │
├──────────────────────────────────────────────────────────────────┤
│ dispatch harness-stack:code-reviewer (references/code-reviewer.md)│
│   ↓ verdict                                                      │
│ Approve                                  → proceed to runtime    │
│ Approve with fixes (no Critical)         → proceed to runtime    │
│ Approve with fixes (Critical present)    → re-dispatch; loop     │
│ Request changes                          → re-dispatch; loop     │
├──────────────────────────────────────────────────────────────────┤
│ invoke /harness-stack:user-test over the case IDs this task covers   │
│   ↓ verdict                                                      │
│ PASS (all cases)                         → mark task complete    │
│ FAIL (≥ 1 case)                          → re-dispatch implementer│
│                                            with the failing case │
│                                            evidence; loop        │
├──────────────────────────────────────────────────────────────────┤
│ TodoWrite: mark task complete; advance to next task              │
└──────────────────────────────────────────────────────────────────┘
```

### Why serial only

Parallel implementers stomp on shared state, duplicate work, and make inconsistent architectural decisions; the coordination overhead eats the throughput gains while burning tokens. Read-only parallelism inside a single phase is still useful (parallel research subagents, parallel code review of independent files); concurrent writers are not.

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

## Milestone Exit Gate (when the plan uses milestones)

Per-task user-test probes catch behaviour problems on the diff just written. A milestone gate catches *interaction* problems — when several tasks together produce a user-observable regression no single task's case set exercised. Run the gate at every milestone boundary, before the next milestone's first task dispatches.

For the milestone just completed:

1. Confirm every task in the milestone reached `harness-stack:spec-reviewer` ✅ and `harness-stack:code-reviewer` approve (no Critical findings), every per-task user-test probe PASS'd, and every task produced an atomic commit on the working branch.
2. Compute the case IDs this milestone is responsible for, as listed in the plan's Exit Gate for that milestone (typically the union of every task's covered cases plus any cross-task journeys the milestone declared).
3. Invoke `/harness-stack:user-test` with: the milestone's diff range (`MILESTONE_BASE_SHA..HEAD_SHA`), the user-test set at `docs/user-tests/<feature>.md`, and the case ID subset for this milestone. The user-test validator runs in a fresh subagent that has never seen the implementation.
4. The validator returns a coverage matrix with PASS / FAIL and evidence per case. Any FAIL → scope follow-up tasks, append them to the plan, dispatch implementers, re-run the gate. Do not proceed to the next milestone until every required case is PASS.
5. Update the plan's Progress section: append a handoff log line, tick off the milestone, record the validator's evidence path.

For flat plans (no milestones), the per-task probe already covered each case; the gate runs once at plan end over the whole user-test set, plus any cross-feature journeys that no single task owns.

## Step N+1 — Final Integration Review (once)

After every task is complete and the final milestone exit gate (or the flat-plan gate above) is green:

1. Compute the full `BASE_SHA..HEAD_SHA` covering every task in the plan.
2. Dispatch one more `harness-stack:code-reviewer` with `references/code-reviewer.md` against the **integrated diff**. Per-task reviews didn't see cross-task interactions; this one does.
3. **Case Coverage Gate.** Confirm every case in `docs/user-tests/<feature>.md` has at least one PASS entry across the gate transcripts. Any case never probed → run `/harness-stack:user-test` over the remaining IDs before merging.
4. Any Critical / Important findings → fix per the review failure loop, then re-run the final review.
5. Once clean, hand off for commit / PR.

## Round Budget

**3 rounds per task.** If a task is still hitting:

- `BLOCKED` after 3 implementer dispatches, or
- ❌ from spec-reviewer after 3 implementer fix-and-retry rounds, or
- Critical findings from code-reviewer after 3 implementer fix-and-retry rounds,

then **stop dispatching and escalate to the human**. The plan, the spec, or the task scope is the problem; throwing more rounds at it dilutes signal and burns capacity.

## Red Flags

- **Controller writes code.** The moment the controller starts editing files, the workflow has degenerated into manual implementation. Stop and start over.
- **Multiple implementers dispatched concurrently.** Serial only. Implementers stomp on shared state and produce inconsistent decisions.
- **Code review starts before spec review passes.** Wrong order; re-run spec first.
- **Runtime probe skipped for a task because "the test suite passed".** Static suites don't run the application. Per-task probe is mandatory.
- **Same `BLOCKED` task re-dispatched without changing context, model, or task split.** Same input, same failure.
- **Skipping the final integration review.** Per-task reviews can't catch cross-task interactions.
- **Skipping the milestone exit gate.** Per-task probes catch single-task regressions; milestone gate catches cross-task ones. Both are required.
- **Implementer reports DONE without an atomic commit / with a dirty tree.** Treat as BLOCKED; the next worker cannot inherit a clean slate.
- **Plan's User Test Coverage table is incomplete.** Cases without a covering task = unprobed behaviour at merge time. Send the plan back to the planner.
- **Controller fixes review findings instead of looping back to the implementer.** Defeats fresh context.
- **Implementer reads the plan file.** The controller curates the brief; the implementer only sees what was handed in.
- **Round count > 3 on a single task without explicit human override.** If it's still failing, the problem isn't this round.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just patch this one finding myself, it's tiny." | Once the controller writes code, the fresh-context invariant is gone for the rest of the run. Loop back to the implementer. |
| "Running two implementers in parallel will save half the wall-clock time." | The error rate jumps and the rework eats the savings. Serial is the load-bearing choice. |
| "Spec compliance and code quality overlap; I'll skip spec review for trivial tasks." | Spec compliance is binary and cheap to verify; skipping it lets "wrong feature, well-built" through. |
| "The unit tests pass, I'll skip the user-test probe." | Unit tests assert against the code's own expectations. The user-test probe asserts against the user-test contract from outside the system. They catch different bugs. |
| "The implementer is on round 4 but it's so close — one more round." | Round budget is a circuit breaker for a reason. Either the spec is wrong, the task is too big, or the model is wrong for this work. Escalate. |
| "Final integration review is redundant; every task already passed code review." | Per-task reviews see one diff at a time. Integration interactions only appear after merge. |

## Verification

Before declaring the workflow complete:

- [ ] Every task in the original plan is marked complete in TodoWrite.
- [ ] Every task passed `harness-stack:spec-reviewer` ✅ at least once.
- [ ] Every task passed `harness-stack:code-reviewer` Approve / Approve with fixes (no Critical) at least once.
- [ ] Every task ended with an atomic commit on the working branch and a clean tree.
- [ ] Every task's per-task user-test probe returned PASS for its covered case IDs.
- [ ] Every milestone exit gate returned PASS for its declared case subset (or, for flat plans, the single gate at plan end did).
- [ ] Every case in `docs/user-tests/<feature>.md` has at least one PASS across the gate transcripts.
- [ ] The final integration review against the full diff returned Approve / Approve with fixes (no Critical).
- [ ] Full test suite passes on the integrated diff.
- [ ] No task hit the round budget cap without explicit human override.
