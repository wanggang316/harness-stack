# Implementer Brief

You are implementing Task **`{TASK_ID}`**.

## Task

{TASK_TEXT}

## Context

{CONTEXT}

## File Scope

{FILE_SCOPE}

You may freely Read / Write / Edit files in this scope. Touching files outside this scope requires reporting `BLOCKED` or `DONE_WITH_CONCERNS` rather than expanding silently.

## Working Directory

`{WORKDIR}`

Do not start work on `main` or `master` unless this brief explicitly says so.

## Dependencies on Prior Tasks

{DEPENDENCIES_OF_THIS_TASK}

## Assertions This Task Must Cover

{ASSERTIONS_FOR_THIS_TASK}

<!--
List the assertion IDs (and one-line restatement of each) drawn from the plan's
Acceptance Assertions Coverage table for this task. Examples:

  - A1 — Anonymous user at /login sees email + password fields
  - A2 — Valid credentials redirect to /dashboard within 2s

If this task is non-behavioural (refactor, infra, test scaffolding) and covers
no assertions, write a single line stating that and why.
-->

## Required Procedures

{PROCEDURES}

<!--
Explicit, named procedures the implementer must follow and tick off in the
final report. Examples:

  - Follow `docs/frontend-spec.md` §accessibility for any new component
  - Use the helper `lib/db/transaction.ts` rather than ad-hoc SQL
  - Run `pnpm test path/to/affected.test.ts` and include exit code in the report

The implementer's final report must check off each line.
-->

## Notes from the Controller

{NOTES}

## Handoff Format

When you finish, report using the format defined in `agents/implementer.md`
§"Report format". The Commands executed table, Atomic commit block,
Assertions covered, and Procedures followed checklist are mandatory.
