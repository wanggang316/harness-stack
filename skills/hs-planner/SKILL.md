---
name: hs-planner
description: Creates execution plans (ExecPlans) for complex work. Use when you need to plan a feature, design a system change, or create implementation guides that any agent can follow.
---

# hs-planner: Execution Planning

## Overview

Create an execution plan (ExecPlan) that enables any agent to deliver a working feature. The plan is self-navigating — it references the spec, design docs, and code by path so the reader knows where to look, and describes the execution strategy: what to do, in what order, how to verify.

## When to Use

- You have a spec or clear requirements and need to plan implementation
- A task is too large or complex to start without a roadmap
- Work needs to be handed off to another agent or session
- You need to de-risk a feature with prototyping
- The implementation order isn't obvious
- Work needs to be parallelized across multiple agents

**When NOT to use:** Single-file changes with obvious scope, or when the spec already contains well-defined tasks with acceptance criteria.

## Core Principles

**Self-navigating.** The plan references repo docs (spec, design doc, architecture doc) by path, and embeds what is unique to execution: the sequence of work, acceptance criteria, commands, and expected output.

**Outcomes over code changes.** Anchor the plan with what the user can do after implementation that they could not do before. "After starting the server, navigating to /health returns HTTP 200 with body OK" — not "added a HealthCheck struct".

**Prose first.** Write in narrative form. Prefer sentences over bullet lists. The plan should read as a story: goal, work, result, proof. Checklists are permitted only in the Progress section, where they are mandatory.

**Resolve ambiguity in the plan.** Do not outsource key decisions to the reader. When ambiguity exists, resolve it and explain why you chose that path.

## Process

### Step 1: Load Context

Before planning, read and understand:

1. **The spec** — Read the product spec or requirements in full
2. **The user tests** — Read `docs/user-tests/<feature>.md` if it exists; case IDs from here populate the User Test Coverage table later
3. **The design docs** — Read related design documents in `docs/design-docs/` if they exist; these contain technical decisions, alternatives considered, and rationale that the plan must respect
4. **The codebase** — Read relevant source files, identify patterns and conventions
5. **The architecture** — Read architecture docs if they exist
6. **The constraints** — Read golden-rules and project conventions

Map dependencies between components. Note risks, unknowns, and areas that may need prototyping.

### Step 2: Prototype if Needed

When requirements have significant unknowns, **write code to validate feasibility before finalizing the plan**. This is not implementation — it's research.

- Read the source code of libraries and dependencies you'll use
- Build small proof-of-concept implementations to test assumptions
- Validate that the proposed approach actually works
- Record findings in the plan's Surprises & Discoveries section

State the criteria for promoting or discarding the prototype. Prototyping results inform the plan — they prevent writing a plan that looks correct but can't be implemented.

### Step 3: Write the ExecPlan

Save to `docs/exec-plans/<name>.md`. Follow the template at `skills/hs-planner/references/exec-plan-template.md`.

**Writing guidelines:**

- **Reference repo docs by path.** In Context and Orientation, list the paths to spec, design doc, and key source files. The reader will load them when executing.
- **Name files with full repository-relative paths.** Name functions and modules precisely. When touching multiple areas, include a short orientation paragraph explaining how those parts fit together.
- **Define every term of art** in plain language or do not use it. If you introduce "daemon", "middleware", or "RPC gateway", define it immediately and explain where it appears in the repository.
- **Show exact commands** with working directory and expected output so the reader can compare their terminal output against yours.
- **Be idempotent.** Write steps that can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry.
- **Be prescriptive about interfaces.** In the Interfaces and Dependencies section, name the libraries, types, traits/interfaces, and function signatures that must exist at the end. Don't leave these for the implementer to invent.
- **Keep tasks small.** Each task should be implementable, testable, and verifiable in a single focused session. If a task touches more than ~5 files, break it down further.
- **Plan of Work is prose, not a task list.** Describe the sequence of edits in narrative form. Milestones are one way to organize this — but for simpler plans, a flat prose description is fine.
- **Bind tasks to user-test cases.** If `docs/user-tests/<feature>.md` exists, fill out the User Test Coverage table in the plan. Every case in the user-test set must appear in the table; every task either covers ≥ 1 case or is explicitly marked as non-behavioural (refactor, infra) with a one-line reason.
- **Milestone Exit Gate.** When using milestones, give each one an Exit Gate listing the case IDs it must satisfy at runtime, in addition to the usual static review gates.

### Step 4: Hand Off

Present the plan for human review. Do NOT proceed to implementation until approved.

```
PLAN READY FOR REVIEW:
- Title: [name]
- Plan structure: [milestones / flat]
- Open risks: [count]
→ Approve, or tell me what to change.
```

With approved plan, proceed to `/hs-exec-plan` for execution.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go" | That's how you end up with rework. The plan prevents wrong turns before they cost time. |
| "The tasks are obvious" | Write them down anyway. Explicit tasks surface hidden dependencies and edge cases. |
| "Planning is overhead" | Planning is the task. Implementation without a plan is just typing. |
| "I can hold it all in my head" | Context windows are finite. Written plans survive session boundaries and compaction. |
| "I'll just write a quick task list" | A task list without context, observable outcomes, and verification is not a plan — it's a wish list. |
| "I don't need to prototype, the approach is clear" | If there are unknowns, prototype. A plan that looks correct but can't be implemented wastes more time than a spike. |

## Red Flags

- Starting implementation without a written plan
- Plan describes code changes without observable outcomes
- No verification steps or expected output
- Plan embeds spec/design doc content that should be referenced by path
- All tasks are too large (touching 8+ files each)
- No repository context (missing file paths, function names)
- Undefined jargon used without explanation
- Interfaces and Dependencies section missing or vague
- Significant unknowns not addressed with prototyping

## Verification

Before handing off, confirm:

- [ ] Plan is self-navigating — references spec/design docs by path
- [ ] Every section from the template is present
- [ ] Observable acceptance criteria with expected output
- [ ] User Test Coverage table is filled; every case from `docs/user-tests/<feature>.md` appears in ≥ 1 row
- [ ] Each milestone (if used) has an Exit Gate listing required case IDs
- [ ] Repository context is explicit (full paths, function names, module descriptions)
- [ ] No task touches more than ~5 files
- [ ] Risks and unknowns addressed (with prototyping if needed)
- [ ] All terms of art defined in plain language
- [ ] Interfaces and Dependencies section specifies concrete types and signatures
- [ ] Human has reviewed and approved the plan
