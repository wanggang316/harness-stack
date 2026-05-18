# ExecPlan Template

Use this skeleton when creating execution plans. Every section is required. Write in prose — prefer sentences over bullet lists except in the Progress section.

---

# ExecPlan: [Short, action-oriented title]

**Status:** Draft | Approved | In Progress | Completed
**Author:** [name]
**Date:** [date]

This is a living document. The Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective sections must be kept up to date as work proceeds.

## Purpose

<!-- Explain in a few sentences what someone gains after this change and how they can see it working. State the user-visible behavior this plan will enable. Begin with why the work matters from a user's perspective: what someone can do after this change that they could not do before. -->

## Progress

<!-- A flat status dashboard across all work. Every stopping point must be documented here, even if it requires splitting a partially completed item into "done" vs "remaining". This section must always reflect the actual current state. Use timestamps to measure rates of progress.

This is the ONLY section that uses checklists. All other sections are prose.

The header block below is a live dashboard. Whoever is driving the plan (a controller, an implementer, or a human) updates it at every state change so a fresh reader can pick up the plan within seconds. -->

**State:** Draft | Running | Blocked | Completed
**Active worker:** (task ID + role + started-at, or "none")
**Last handoff:** (timestamp — task ID — outcome)

### Handoff log

<!-- Append-only. One line per completed dispatch. Newest at the bottom.
Format: `<ISO timestamp> <task-id> <role> <outcome> [<commit-sha>]`
Example:
2026-05-14T11:18Z  T6  implementer  DONE              abc123
2026-05-14T11:25Z  T6  spec-review  pass
2026-05-14T11:31Z  T6  code-review  approve-with-fixes
-->

### Task checklist

- [ ] Step description

## Surprises & Discoveries

<!-- Document unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Provide concise evidence (test output is ideal). -->

(None yet)

## Decision Log

<!-- Record every key design decision made while working on the plan. -->

(None yet)

## Outcomes & Retrospective

<!-- Summarize outcomes, gaps, and lessons learned at major milestones or at completion. Compare the result against the original purpose. -->

(To be filled at milestone completion)

## Context and Orientation

<!-- Describe the current state relevant to this task. Reference related documents by path.

Related documents:
- Product spec: [path]
- Design doc: [path, if exists]
- Architecture doc: [path, if exists]

Key source files:
- [path] — [what this file does and why it matters to this plan]

Define any non-obvious term you will use. If touching multiple areas, include a short orientation paragraph that explains how those parts fit together so a reader can navigate confidently. -->

## Plan of Work

<!-- Describe, in prose, the sequence of edits and additions. For each edit, name the file and location (function, module) and what to insert or change. Keep it concrete and minimal.

For complex plans, organize into milestones (see below). For simpler plans, a flat prose description is sufficient.

Slice vertically, not horizontally: build one complete feature path at a time rather than all database, then all API, then all UI. -->

<!-- OPTION A: Flat prose (for simpler plans)

Describe the work as a narrative sequence. For each step, name the file, the function or module, and what changes. State what to verify after each step. -->

<!-- OPTION B: Milestones (for complex plans)

Milestones are narrative, not bureaucracy. Introduce each with a brief paragraph that describes the scope, what will exist at the end that did not exist before. Keep it readable as a story: goal, work, result, proof. Each milestone must be independently verifiable.

### Milestone 1: [Title]

[Prose describing scope and what will exist at the end that did not exist before.]

[Describe each task: what to change, where, and why. State observable acceptance for this milestone.]

**Exit Gate:**

- Every task in this milestone has spec-reviewer ✅ and code-reviewer approve (no Critical findings)
- Every task ended with an atomic commit on the working branch
- Runtime validator returns PASS for cases {UT-FEATURE-001, UT-FEATURE-002, ...} — the subset of the user-test set covered by this milestone
- Handoff log entries appended in Progress
-->

## User Test Coverage

<!--
Bind each task in the plan to the user-test case IDs declared in
`docs/user-tests/<feature>.md`. Every case in the user-test set MUST appear in
this table at least once. Missing rows = the plan is incomplete and must be
revised before implementation begins.

| Task | User-test cases covered |
|------|--------------------------|
| T1   | UT-FEATURE-001, UT-FEATURE-002 |
| T2   | UT-FEATURE-003           |
| T3   | UT-FEATURE-004, UT-FEATURE-005 |

If a task is non-behavioural (refactor, infra, test scaffolding) and covers
no cases, still list it with `—` and explain in one sentence why no case
applies.
-->

## Concrete Steps

<!-- State the exact commands to run and where to run them (working directory). When a command generates output, show a short expected transcript so the reader can compare. This section must be updated as work proceeds. -->

## Validation and Acceptance

<!-- Describe how to exercise the completed system and what to observe. Phrase acceptance as behavior with specific inputs and expected outputs.

Two layers of validation must be considered:

1. **Static** — automated tests (unit, integration, e2e), lint, type-check, code review. Cheap, fast, run on every diff.
2. **Runtime** — start the application and run each user-test case in `docs/user-tests/<feature>.md` against the live system. Performed at milestone boundaries (or at plan completion for flat plans) by an independent verifier that has not seen the implementation. See `skills/hs-validate-runtime/`.

The plan is not complete until both layers pass and every user-test case has been probed at least once with evidence captured.

Example: "Run `npm test` from the project root and expect 42 passed. The new test `user.registration.test.ts` fails before this change and passes after. Then run runtime validation against the user-test set; expect UT-LOGIN-001..UT-LOGIN-007 all PASS." -->

## Idempotence and Recovery

<!-- State whether steps can be repeated safely. If a step is risky, provide a safe retry or rollback path. Keep the environment clean after completion. -->

## Artifacts and Notes

<!-- Include the most important transcripts, diffs, or snippets as indented examples. Keep them concise and focused on what proves success. Prototyping results from the planning phase go here. -->

## Interfaces and Dependencies

<!-- Be prescriptive. Name the libraries, modules, and services to use and why. Specify the types, traits/interfaces, and function signatures that must exist at the end.

Example:

In src/auth/session.ts, define:

    export interface SessionStore {
      create(userId: string): Promise<Session>;
      validate(token: string): Promise<Session | null>;
      revoke(token: string): Promise<void>;
    }
-->
