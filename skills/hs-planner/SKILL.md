---
name: hs-planner
description: Creates self-contained execution plans (ExecPlans) for complex work. Use when you need to plan a feature, design a system change, or create step-by-step implementation guides that any agent can follow without prior context.
---

# hs-planner: Execution Planning

## Overview

Create a self-contained execution plan (ExecPlan) that enables any agent — or a complete novice — to deliver a working feature. The ExecPlan contains all knowledge and instructions needed to succeed. The reader has only the current working tree and your plan — no memory of prior conversations, no external context. If a stranger can't follow your plan end-to-end and produce a working result, it's not done.

## When to Use

- You have a spec or clear requirements and need to plan implementation
- A task is too large or complex to start without a roadmap
- Work needs to be handed off to another agent or session
- You need to de-risk a feature with prototyping milestones
- The implementation order isn't obvious
- Work needs to be parallelized across multiple agents

**When NOT to use:** Single-file changes with obvious scope, or when the spec already contains well-defined tasks with acceptance criteria.

## Core Principles

**Self-containment is non-negotiable.** Every assumption stated. Every term defined. Every file path spelled out. Do not say "as defined previously" or "according to the architecture doc" — include the needed explanation, even if you repeat yourself.

**Outcomes over code changes.** Anchor the plan with what the user can do after implementation that they could not do before. "After starting the server, navigating to /health returns HTTP 200 with body OK" — not "added a HealthCheck struct".

**Prose first.** Write in narrative form. Prefer sentences over bullet lists. The plan should read as a story: goal, work, result, proof. Checklists are permitted only in the Progress section, where they are mandatory.

**Resolve ambiguity in the plan.** Do not outsource key decisions to the reader. When ambiguity exists, resolve it and explain why you chose that path.

## Process

### Step 1: Load Context

Before planning, read and understand:

1. **The spec** — Read the product spec or requirements in full
2. **The design docs** — Read related design documents in `docs/design-docs/` if they exist; these contain technical decisions, alternatives considered, and rationale that the plan must respect
3. **The codebase** — Read relevant source files, identify patterns and conventions
4. **The architecture** — Read architecture docs if they exist
5. **The constraints** — Read golden-rules and project conventions

Map dependencies between components. Note risks, unknowns, and areas that may need prototyping.

**Do NOT write code during planning.** The output is a plan document.

### Step 2: Design Milestones

Milestones are narrative arcs, not bureaucratic checkpoints. Each milestone should:

- Describe the scope and what will exist at the end that did not exist before
- Be independently verifiable
- Incrementally implement the overall goal
- Include commands to run and acceptance to observe

**Slice vertically, not horizontally.** Build one complete feature path at a time. Each vertical slice delivers working, testable functionality.

```
Bad (horizontal):           Good (vertical):
1. All database schema      1. User registration (schema + API + UI)
2. All API endpoints        2. User login (auth + API + UI)
3. All UI components        3. Task creation (schema + API + UI)
4. Connect everything       4. Task listing (query + API + UI)
```

**Prototyping milestones.** When requirements have significant unknowns, include explicit prototyping milestones to de-risk the design. Label them clearly as "prototyping", describe how to run and observe results, and state the criteria for promoting or discarding the prototype.

### Step 3: Write the ExecPlan

Save to `docs/exec-plans/<name>.md`. Follow the template at `skills/hs-planner/references/exec-plan-template.md`.

**Writing guidelines:**

- **Name files with full repository-relative paths.** Name functions and modules precisely. When touching multiple areas, include a short orientation paragraph explaining how those parts fit together.
- **Define every term of art** in plain language or do not use it. If you introduce "daemon", "middleware", or "RPC gateway", define it immediately and explain where it appears in the repository.
- **Show exact commands** with working directory and expected output so the reader can compare their terminal output against yours.
- **Be idempotent.** Write steps that can be run multiple times without causing damage or drift. If a step can fail halfway, include how to retry.
- **Do not reference external docs.** If knowledge is required, embed it in the plan in your own words.
- **Keep tasks small.** Each task within a milestone should be implementable, testable, and verifiable in a single focused session. If a task touches more than ~5 files, break it down further.

### Step 4: Hand Off

Present the plan for human review. Do NOT proceed to implementation until approved.

```
PLAN READY FOR REVIEW:
- Title: [name]
- Milestones: [count]
- Prototyping milestones: [count, if any]
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

## Red Flags

- Starting implementation without a written plan
- Milestones that describe code changes rather than observable outcomes
- No verification steps or expected output
- Tasks that say "implement the feature" without acceptance criteria
- All tasks are too large (touching 8+ files each)
- No repository context (missing file paths, function names)
- Undefined jargon used without explanation
- Plan assumes prior knowledge from conversations or external docs

## Verification

Before handing off, confirm:

- [ ] Plan is self-contained — a stranger could follow it without prior context
- [ ] Every milestone has observable acceptance criteria with expected output
- [ ] Repository context is explicit (full paths, function names, module descriptions)
- [ ] No task touches more than ~5 files
- [ ] Risks and unknowns are identified with mitigations
- [ ] Living document sections exist (Progress, Surprises, Decision Log, Outcomes)
- [ ] All terms of art are defined in plain language
- [ ] Human has reviewed and approved the plan
