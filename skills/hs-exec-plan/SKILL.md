---
name: hs-exec-plan
description: Executes an ExecPlan by following milestones, implementing incrementally, and maintaining the plan as a living document. Use when you have an approved ExecPlan and need to implement it.
---

# hs-exec-plan: Plan Execution

## Overview

Execute an approved ExecPlan by following its milestones in order, implementing each task incrementally, and maintaining the plan as a living document throughout. The plan is your single source of truth — read it, follow it, update it. Do not prompt the user for "next steps"; simply proceed to the next milestone.

## When to Use

- You have an approved ExecPlan and need to implement it
- You are resuming work on a partially completed ExecPlan
- You need to pick up where another agent or session left off

**When NOT to use:** No plan exists yet (use `hs-planner` first), or the change is a single-file fix with obvious scope.

## Process

### Step 1: Load the Plan and Context

Read the ExecPlan in full. Check the Progress section to understand current state — what's done, what's in progress, what's remaining.

Then load the context you need to execute well:

1. **Read the code** the plan references — every file path mentioned in Context and Orientation and in the current milestone's tasks. Understand existing patterns and conventions before changing anything.
2. **Read related docs** — if the plan references a spec, design doc, or architecture doc, read them. The plan is a summary; the source documents contain nuance the plan may have omitted.
3. **Read the surrounding code** — when a task says "add a function to `src/auth/login.ts`", read that file and its neighbors. Understand how the module works, not just the line you're changing.

A plan is a guide, not a substitute for understanding. If the plan says "add a validation function" but the codebase already has a validation pattern, follow the existing pattern even if the plan doesn't mention it.

If resuming work from another session, the Progress section is your entry point. But still re-read the code relevant to the next milestone — don't assume prior sessions left everything as described.

### Step 2: Execute Milestones

Work through milestones sequentially. For each milestone:

1. Read the milestone description, tasks, and acceptance criteria
2. Implement tasks one at a time, in order
3. After each task, verify it works (run tests, check build, manual verification)
4. Commit the change with a descriptive message
5. Update the Progress section immediately
6. Move to the next task

**Resolve ambiguities autonomously.** If the plan is unclear on a detail, make a reasonable decision, record it in the Decision Log, and keep moving. Do not stop to ask unless the ambiguity could lead to significant rework.

**Commit frequently.** Each task should result in at least one commit. Small commits are free; large commits hide bugs.

### Step 3: Maintain the Living Document

The plan must be updated at every stopping point. This is not optional.

**Progress** — Update after every task completion. If a task is partially done, split it into "completed" and "remaining" entries. Add timestamps.

```markdown
- [x] (2025-04-14) Created user schema and migration
- [x] (2025-04-14) Implemented registration API endpoint
- [ ] Registration UI (completed: form component; remaining: validation, error states)
- [ ] Login flow
```

**Surprises & Discoveries** — When you encounter unexpected behavior, performance tradeoffs, bugs, or insights that shaped your approach, record them with evidence.

```markdown
- Observation: SQLite doesn't support concurrent writes; queue needed
  Evidence: Test `user.concurrent-create` deadlocks after 3 parallel inserts
```

**Decision Log** — When you make a choice not prescribed by the plan, record it with rationale.

```markdown
- Decision: Used bcrypt instead of argon2 for password hashing
  Rationale: argon2 requires native compilation; bcrypt is pure JS and sufficient for MVP
  Date: 2025-04-14
```

**Outcomes & Retrospective** — At milestone completion, summarize what was achieved, what remains, and lessons learned. Compare the result against the milestone's stated purpose.

### Step 4: Validate Milestone Completion

Before moving to the next milestone, run the acceptance criteria stated in the plan. The milestone is not done until acceptance passes. If it doesn't pass, debug and fix before proceeding.

### Step 5: Complete the Plan

After all milestones are done:

1. Run the final Validation and Acceptance criteria from the plan
2. Write the final Outcomes & Retrospective entry
3. Update Progress to reflect full completion
4. Commit the updated plan

## Implementation Discipline

### Increment Cycle

For each task within a milestone:

```
Implement ──→ Test ──→ Verify ──→ Commit ──→ Update Progress
```

1. **Implement** the smallest complete piece of functionality
2. **Test** — run the test suite, or write a test if none exists
3. **Verify** — confirm the change works as expected (tests pass, build succeeds, manual check)
4. **Commit** — save your progress with a descriptive message
5. **Update Progress** — mark the task as done in the plan

### Simplicity First

Before writing any code, ask: "What is the simplest thing that could work?"

After writing code, check:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Am I building for hypothetical future requirements, or the current task?

Three similar lines of code is better than a premature abstraction. Implement the naive, obviously-correct version first.

### Scope Discipline

Touch only what the task requires.

Do NOT:
- "Clean up" code adjacent to your change
- Refactor imports in files you're not modifying
- Remove comments you don't fully understand
- Add features not in the plan
- Modernize syntax in files you're only reading

If you notice something worth improving outside your task scope, note it but don't fix it.

### Keep It Working

After each task, the project must build and existing tests must pass. Don't leave the codebase in a broken state between tasks.

### Rollback-Friendly

Each task should be independently revertable. Prefer additive changes. Avoid deleting and replacing something in the same commit — separate them.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll update the plan later" | Later never comes. Update Progress after every task, or the plan becomes useless for the next session. |
| "This surprise isn't worth recording" | If it surprised you, it will surprise the next agent. Write it down. |
| "I'll test it all at the end" | Bugs compound. A bug in Task 1 makes Tasks 2-5 wrong. Test each task. |
| "It's faster to do it all at once" | It feels faster until something breaks and you can't find which of 500 changed lines caused it. |
| "These changes are too small to commit separately" | Small commits are free. Large commits hide bugs and make rollbacks painful. |
| "The plan is wrong, I'll just do it my way" | Update the plan first, then implement. The plan is the source of truth for the next session. |

## Red Flags

- More than 100 lines of code written without running tests
- Progress section not updated after completing tasks
- Surprises encountered but not recorded
- Decisions made but not logged
- Multiple unrelated changes in a single commit
- Build or tests broken between tasks
- Large uncommitted changes accumulating
- Skipping milestone acceptance criteria
- Proceeding to next milestone before current one passes acceptance

## Verification

After completing the full plan:

- [ ] All milestones pass their stated acceptance criteria
- [ ] Final Validation and Acceptance from the plan passes
- [ ] Progress section reflects actual state with timestamps
- [ ] Surprises & Discoveries captures non-obvious findings
- [ ] Decision Log records all choices not prescribed by the plan
- [ ] Outcomes & Retrospective is written
- [ ] All changes are committed
- [ ] The plan file itself is committed with final updates
