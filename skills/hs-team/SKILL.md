---
name: hs-team
description: Multi-agent implementation workflow. Controller serially orchestrates implementer, spec-reviewer, code-reviewer, and user-test-validator subagents per task with strict review gates. Use when an ExecPlan has multiple tasks and you want full subagent automation rather than controller-driven manual implementation.
---

# Multi-Agent Implementation Team

## Overview

Controller does not write code. Every implementation, every spec check, every code review, every user-test probe happens in a fresh subagent with curated context. The controller's job is to ingest the plan, walk it one task at a time, dispatch the right subagent at the right point, and integrate the results.

Four roles:

- `harness-stack:implementer` — does the work
- `harness-stack:spec-reviewer` — checks the diff against the task spec
- `harness-stack:code-reviewer` — checks production readiness
- `user-test-validator` (via `hs-user-test`) — probes the running system against user-test cases the task is bound to

**Execution is serial.** One task at a time, full impl → spec review → code review → user-test probe → next. Read-only side calls inside a single phase (parallel research subagents, parallel code review of independent files) are permitted; multiple implementers writing concurrently are not. Serial throughput is lower in raw token-rate but the error rate drops dramatically, and on multi-day runs that correctness compounds.

**Core principle:** the controller curates context. Implementers don't read the plan; spec-reviewers don't trust implementer reports; code-reviewers don't substitute for spec-reviewers; user-test-validators don't read the source.

## When to Use

- The plan has multiple tasks (3+) and you want every task to pass a spec compliance gate **and** a code quality gate before moving on.
- The tasks are described well enough that an implementer can act on the brief alone, without ambient session context.
- You want subagent-driven automation: controller doesn't write code, controller doesn't review code.

For small / iterative / exploratory work where the controller needs to make in-flight decisions while implementing, use `hs-exec-plan` instead.

## When NOT to Use

- Plan has 1–2 tasks. Setup and orchestration overhead exceed the benefit.
- The work is exploratory; you don't yet know the right shape. Brainstorm or refine the spec first.
- Tasks depend on mid-implementation decisions only the controller can make in context. Fresh-context dispatch breaks down here.
- `docs/user-tests/<feature>.md` does not exist. Without case IDs, there is nothing for per-task and milestone gates to probe against. Run `/hs-test-spec` first.

## Components

| Role | Subagent (dispatch) | Brief template |
|---|---|---|
| Implementation | `harness-stack:implementer` | `references/implementer.md` |
| Spec compliance | `harness-stack:spec-reviewer` | `references/spec-reviewer.md` |
| Code quality | `harness-stack:code-reviewer` | `references/code-reviewer.md` |
| User-test probing | `user-test-validator` via `/hs-user-test` | brief assembled by the skill |

The subagents own the methodology (how to do the role). The brief templates carry per-dispatch inputs (task text, git range, etc.).

## Step 0 — Plan Ingestion (once)

State is held in two JSON files (see `docs/references/orchestration-state-schema.md`):

- `docs/runs/<plan>/state/features.json` — per-task lifecycle, dependencies, fulfills, dismissed log, decisions log
- `docs/runs/<plan>/state/validation-state.json` — per-case verification status

If those files do not yet exist, generate them now from the ExecPlan and `docs/user-tests/<feature>.md`. If they already exist (resuming), use them as the source of truth — the ExecPlan markdown is narration; the JSON is state.

1. Read the ExecPlan in full.
2. For each task, extract from the User Test Coverage table the `fulfills` set, along with: task ID, full text, scene context, declared file scope, declared dependencies, and any `procedures` the task or surrounding milestone requires.
3. **Coverage validation** (hard gate):
   - The union of every task's `fulfills` set MUST equal the full case set in `docs/user-tests/<feature>.md` — no gaps, no orphan cases.
   - No case may appear in two tasks' `fulfills` (no double-claim).
   - Only leaf tasks (no children) may claim cases.
   - If any rule is violated, stop and ask the planner to revise. Implementation cannot begin against an incomplete contract.
4. **Write or merge state files:**
   - `features.json`: one entry per task with `status: pending`, `depends_on`, `fulfills`, `preconditions`, `expected_behavior`, `verification_steps`. The last three come from the planner's per-task block in the ExecPlan; if missing, stop and ask the planner to add them.
   - `validation-state.json`: one entry per user-test case with `status: pending` and `fulfilled_by_task` set from the coverage check above.
   - When resuming, do not overwrite existing entries — only add new ones.
5. Order the tasks:
   - Respect declared dependencies (a task that depends on another must come later).
   - Within a milestone, order tasks by the smallest reasonable serial chain.
   - If the plan uses milestones, the Milestone Exit Gate (see below) runs before the next milestone's first task dispatches.
6. Create a TodoWrite list with every task in execution order; mark milestone boundaries.
7. Announce the execution order to the user before dispatching the first implementer.

## Step 1..N — Per-Task Loop (serial)

Execution is strictly one task at a time. Each task walks four gates; failures loop back to the appropriate gate without advancing. After every gate transition, mutate `features.json` (status changes) and after every probe run, mutate `validation-state.json` (case statuses).

```
┌────────────────────────────────────────────────────────────────────────┐
│ features.json: set task status=in-progress, started_at=now             │
├────────────────────────────────────────────────────────────────────────┤
│ dispatch harness-stack:implementer (references/implementer.md)         │
│   ↓ Status code + Escalate flag                                        │
│ Escalate=true (any status)  → §Direction Escalation; do NOT advance    │
│ DONE                        → process handoff three-way split; proceed │
│ DONE_WITH_CONCERNS          → review concerns;                         │
│                               correctness/scope issue → re-dispatch    │
│                               observation → proceed                    │
│ NEEDS_CONTEXT               → fill missing context, re-dispatch        │
│ BLOCKED                     → §Round Budget                            │
├────────────────────────────────────────────────────────────────────────┤
│ §Process handoff three-way split:                                      │
│   - "What was left undone"  → re-dispatch implementer with the         │
│                                remaining items (still inside scope)    │
│   - "Discovered issues"     → for each, invoke /hs-followup-scope and  │
│                                apply the returned decision; record in  │
│                                features.json. None of these block the  │
│                                current task from advancing.            │
│   - Anything dismissed      → append to features.json dismissed[]      │
│                                with ≥ 20-char justification            │
├────────────────────────────────────────────────────────────────────────┤
│ dispatch harness-stack:spec-reviewer (references/spec-reviewer.md)     │
│   ↓ verdict                                                            │
│ ✅ Spec compliant           → proceed to code review                   │
│ ❌ Issues                   → re-dispatch implementer; loop until ✅   │
├────────────────────────────────────────────────────────────────────────┤
│ dispatch harness-stack:code-reviewer (references/code-reviewer.md)     │
│   ↓ verdict                                                            │
│ Approve                                  → proceed to user-test probe  │
│ Approve with fixes (no Critical)         → proceed to user-test probe  │
│ Approve with fixes (Critical present)    → re-dispatch implementer     │
│ Request changes                          → re-dispatch implementer     │
├────────────────────────────────────────────────────────────────────────┤
│ invoke /hs-user-test over the case IDs this task covers (its fulfills) │
│   ↓ verdict + per-case pattern (systemic | isolated)                   │
│ PASS (all cases)            → features.json: status=completed,         │
│                                commit=<sha>, completed_at=now          │
│ FAIL (≥ 1 case)             → for each FAIL, invoke /hs-followup-scope │
│                                with the case ID, pattern, and current  │
│                                task. Apply the returned decision:      │
│                                  merge → re-dispatch implementer       │
│                                  new-feature-top → write to            │
│                                    features.json, do NOT mark current  │
│                                    task completed yet; current task    │
│                                    blocks on the new feature           │
│                                  misc-bucket → write to features.json, │
│                                    current task may still complete     │
│                                    (small + non-blocking by definition)│
│                                  escalate → §Direction Escalation      │
├────────────────────────────────────────────────────────────────────────┤
│ TodoWrite: mark task complete; advance to next task                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Why serial only

Parallel implementers stomp on shared state, duplicate work, and make inconsistent architectural decisions; the coordination overhead eats the throughput gains while burning tokens. Read-only parallelism inside a single phase is still useful (parallel research subagents, parallel code review of independent files); concurrent writers are not.

### Direction Escalation (Escalate flag on the implementer report)

When an implementer returns `Escalate: true` regardless of `Status`, the controller MUST:

1. Stop the per-task loop. Do not dispatch the next gate, do not start the next task.
2. Read the `Escalate reason`.
3. Re-enter planning via `/hs-design` or `/hs-planner` with the reason as input. The plan may need re-shaping; the next task may need to be redefined.
4. If a human is in the loop, surface the escalation via the AskUser 1–4 constraint (see §AskUser constraint below) — typical options: `[continue as-is, re-plan from here, split this task, cancel this milestone]`.
5. Record the resolution in `features.json` `decisions[]`.

A clean atomic commit + `Escalate: true` is a valid combination: the increment lands, but the direction is wrong for the next step.

### AskUser constraint

When the controller must ask the human a question — escalation, ambiguous follow-up scope, unresolvable conflict between cases — the question MUST:

- be a **multiple-choice question with 1 to 4 options** (open-ended questions forbidden);
- offer mutually-exclusive, action-shaped options;
- record the answer in `features.json` `decisions[]` immediately, with the chosen option and timestamp.

This is the only legitimate "negotiation" channel between the controller and the human. Free-form discussion is a sign the plan is too vague; re-plan instead of grilling the user.

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

1. Read `features.json` and confirm every task in this milestone has `status=completed` with a recorded commit SHA. Any task in any other state aborts the gate — finish the task first.
2. Compute the case IDs this milestone is responsible for, as listed in the plan's Exit Gate for that milestone (typically the union of every task's `fulfills` set plus any cross-task journeys the milestone declared).
3. Invoke `/hs-user-test` with: the milestone's diff range (`MILESTONE_BASE_SHA..HEAD_SHA`), the user-test set at `docs/user-tests/<feature>.md`, and the case ID subset for this milestone. The user-test validator runs in a fresh subagent that has never seen the implementation. It will skip cases whose `validation-state.json` entry is already `passed` for the current diff window — only `failed`, `pending`, or `inconclusive` cases re-run.
4. The validator returns a coverage matrix with PASS / FAIL + `pattern` per case, and writes the new statuses back into `validation-state.json`.
5. For every FAIL, invoke `/hs-followup-scope` with the case ID, pattern, and the milestone context. Apply the returned decision to `features.json`. **Do not proceed to the next milestone** until every required case is `passed` OR routed to a `misc-bucket` whose item has already completed.
6. Update the plan's Progress markdown to mirror the new state files (recent handoffs, dismissed items).

For flat plans (no milestones), the per-task probe already covered each case; the gate runs once at plan end over the whole user-test set, plus any cross-feature journeys that no single task owns.

## Step N+1 — Final Integration Review (once)

After every task is `completed` in `features.json` and the final milestone exit gate (or the flat-plan gate above) is green:

1. Compute the full `BASE_SHA..HEAD_SHA` covering every task in the plan.
2. Dispatch one more `harness-stack:code-reviewer` with `references/code-reviewer.md` against the **integrated diff**. Per-task reviews didn't see cross-task interactions; this one does.
3. **Case Coverage Gate.** Read `validation-state.json` and confirm every case has `status=passed`. Any other status → either re-run via `/hs-user-test` (if `pending`/`inconclusive`) or route to follow-up (if `failed`) before merging.
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
- **Controller mutates state outside `features.json` / `validation-state.json`.** Those are the single source of truth. Encoding state in TodoWrite, conversation memory, or ad-hoc markdown defeats resume.
- **Multiple implementers dispatched concurrently.** Serial only. Implementers stomp on shared state and produce inconsistent decisions.
- **Code review starts before spec review passes.** Wrong order; re-run spec first.
- **User-test probe skipped for a task because "the test suite passed".** Static suites don't run the application. Per-task probe is mandatory.
- **Implementer's `Escalate: true` ignored or treated as a regular concern.** Escalate stops the loop. If you continue, you've made the decision the human was supposed to make.
- **Free-form question asked of the human.** AskUser is restricted to 1–4 multiple-choice options; open-ended questions hide that the controller doesn't know what it's asking.
- **Discovered issues silently dropped.** Every item in the handoff's `Discovered issues` list must be routed through `/hs-followup-scope`. Forgetting one is how technical debt vanishes.
- **`dismissed[]` entry without ≥ 20-char justification** or with "low priority" as the reason. The dismissed log exists so future readers can audit the decision; weak reasons break the audit.
- **Misc bucket fills past 5 items.** When it would, the next item must open a real follow-up feature or escalate. The cap is the bucket's purpose.
- **Same `BLOCKED` task re-dispatched without changing context, model, or task split.** Same input, same failure.
- **Skipping the final integration review.** Per-task reviews can't catch cross-task interactions.
- **Skipping the milestone exit gate.** Per-task probes catch single-task regressions; milestone gate catches cross-task ones. Both are required.
- **Implementer reports DONE without an atomic commit / with a dirty tree.** Treat as BLOCKED; the next worker cannot inherit a clean slate.
- **Plan's User Test Coverage incomplete** (a case has no task in its `fulfills`, or a case is claimed by two tasks). Send the plan back to the planner.
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

- [ ] `features.json` exists and every task has `status=completed` with a recorded commit SHA.
- [ ] `validation-state.json` exists and every case has `status=passed`.
- [ ] Every task passed `harness-stack:spec-reviewer` ✅ at least once.
- [ ] Every task passed `harness-stack:code-reviewer` Approve / Approve with fixes (no Critical) at least once.
- [ ] Every task ended with an atomic commit on the working branch and a clean tree.
- [ ] Every task's per-task user-test probe returned PASS for its `fulfills` set.
- [ ] Every milestone exit gate returned PASS for its declared case subset (or, for flat plans, the single gate at plan end did).
- [ ] Every entry in `features.json` `dismissed[]` has ≥ 20-char justification.
- [ ] Every misc bucket holds ≤ 5 items.
- [ ] Every `decisions[]` row carries a 1–4 option set, an answer, and a timestamp (no open-ended questions).
- [ ] No `Escalate: true` handoff was ignored — each one resolved via re-planning or AskUser.
- [ ] The final integration review against the full diff returned Approve / Approve with fixes (no Critical).
- [ ] Full test suite passes on the integrated diff.
- [ ] No task hit the round budget cap without explicit human override.
