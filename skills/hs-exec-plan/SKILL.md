---
name: hs-exec-plan
description: Executes an ExecPlan by implementing incrementally and maintaining the plan as a living document. Use when you have an approved ExecPlan and need to implement it, or when resuming a partially completed plan.
---

# hs-exec-plan: Plan Execution

## Overview

Execute an approved ExecPlan by following its Plan of Work, implementing each task incrementally, and maintaining the plan as a living document throughout. The plan is your source of truth — read it, follow it, update it. Do not prompt the user for "next steps"; simply proceed to the next task.

## When to Use

- You have an approved ExecPlan and need to implement it
- You are resuming work on a partially completed ExecPlan
- You need to pick up where another agent or session left off
- The plan is small, the work is iterative, or you'll need to make in-flight design decisions while implementing — i.e. the controller benefits from staying in the loop

**When NOT to use:** No plan exists yet (use `hs-planner` first), or the change is a single-file fix with obvious scope.

**vs `hs-team`:** Use `hs-team` when the plan has 3+ tasks, the tasks are well-specified enough to dispatch to fresh-context implementers, and you want full subagent automation (controller does not write code, every task gets spec + code review gates). Use `hs-exec-plan` (this skill) when the plan is smaller, the work is exploratory, or the controller needs to keep hands on the keyboard for in-flight decisions.

## Process

### Step 1: Load the Plan and Context

Read the ExecPlan in full. Check the Progress section to understand current state — what's done, what's in progress, what's remaining.

Then load the context you need to execute well:

1. **Read the referenced docs** — the plan's Context and Orientation section lists paths to spec, design doc, and architecture doc. Read them. The plan is a routing guide; the source documents contain nuance the plan may have omitted.
2. **Read the code** the plan references — every file path mentioned in Context and Orientation and in the current tasks. Understand existing patterns and conventions before changing anything.
3. **Read the surrounding code** — when a task says "add a function to `src/auth/login.ts`", read that file and its neighbors. Understand how the module works as a whole.

A plan is a guide. If the plan says "add a validation function" but the codebase already has a validation pattern, follow the existing pattern even if the plan doesn't mention it.

If resuming work from another session, the Progress section is your entry point. But still re-read the code relevant to the next task — don't assume prior sessions left everything as described.

### Step 2: Execute

Work through the Plan of Work sequentially (whether organized as milestones or flat prose). For each task:

1. Read the task description and acceptance criteria
2. Implement the smallest complete piece of functionality
3. Verify it works (run tests, check build, manual verification)
4. Commit the change with a descriptive message
5. Update the Progress section immediately
6. Move to the next task

**Resolve ambiguities autonomously.** If the plan is unclear on a detail, make a reasonable decision, record it in the Decision Log, and keep moving. Do not stop to ask unless the ambiguity could lead to significant rework.

**Commit frequently.** Each task should result in at least one commit. Small commits are free; large commits hide bugs.

If the plan uses milestones, validate milestone acceptance criteria before moving to the next milestone.

### Step 3: Maintain the Living Document

The plan must be updated at every stopping point. This is not optional.

**Progress** — Update after every task. If a task is partially done, split it into "completed" and "remaining" entries. Add timestamps. This is a flat dashboard across all work — the reader should see the full picture at a glance.

**Surprises & Discoveries** — When you encounter unexpected behavior, performance tradeoffs, bugs, or insights that shaped your approach, record them with evidence.

**Decision Log** — When you make a choice not prescribed by the plan, record it with rationale.

**Outcomes & Retrospective** — At milestone completion (or after significant progress on flat plans), summarize what was achieved, what remains, and lessons learned.

**Artifacts and Notes** — When your work produces terminal output, diffs, or logs that prove success, capture them here.

### Step 4: Revise the Plan When Needed

Plans meet reality. When you discover the plan is wrong, incomplete, or needs adjustment:

1. **Minor adjustments** — Fix inline, record in Decision Log, keep moving
2. **Significant changes** — Update all affected sections (Plan of Work, Concrete Steps, Interfaces, Progress), record in Decision Log with full rationale, then continue
3. **Fundamental rethink** — Stop, present the issue to the human, propose the revision, wait for approval before continuing

When you revise, ensure changes are reflected across ALL sections. Write a note at the bottom of the plan describing the change and the reason why. The plan must remain coherent after every revision — it should always be possible to restart from only the plan.

### Step 5: Complete the Plan

After all work is done:

1. Run the final Validation and Acceptance criteria from the plan
2. Write the final Outcomes & Retrospective entry
3. Update Progress to reflect full completion
4. Commit the updated plan

## Implementation Discipline

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
| "This revision is too small to document" | Every revision gets a Decision Log entry. The next agent needs to know why the plan changed. |

## Red Flags

- More than 100 lines of code written without running tests
- Progress section not updated after completing tasks
- Surprises encountered but not recorded
- Decisions made but not logged
- Plan revised without updating all affected sections
- Multiple unrelated changes in a single commit
- Build or tests broken between tasks
- Large uncommitted changes accumulating
- Skipping acceptance criteria
- Following the plan blindly without reading the actual code

## Verification

After completing the full plan:

- [ ] All acceptance criteria from the plan pass
- [ ] Final Validation and Acceptance passes
- [ ] Progress section reflects actual state with timestamps
- [ ] Surprises & Discoveries captures non-obvious findings
- [ ] Decision Log records all choices not prescribed by the plan
- [ ] Outcomes & Retrospective is written
- [ ] All changes are committed
- [ ] The plan file itself is committed with final updates
