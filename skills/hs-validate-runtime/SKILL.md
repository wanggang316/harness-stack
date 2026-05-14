---
name: hs-validate-runtime
description: Runs an application against its Acceptance Assertions table and reports PASS/FAIL with evidence per assertion. Use at milestone boundaries or before merge when behaviour-level verification is needed beyond static review.
---

# hs-validate-runtime: Runtime Behaviour Verification

## Overview

Static tools — unit tests, lint, type-check, code review — read the code. They cannot tell you whether the running system actually behaves as specified. This skill closes that gap: it starts the application, probes each behaviour-level assertion declared by the spec, and reports a coverage matrix with evidence. The verifier dispatches as a fresh subagent that has never read the implementation; PASS / FAIL is decided purely from observable state.

## When to Use

- A milestone has finished and its tasks have all passed spec review and code review — before declaring the milestone done.
- A flat plan is about to be merged and you want behaviour-level evidence beyond test-suite output.
- You are debugging "tests pass but it doesn't actually work" and need to confirm whether each assertion in the spec actually holds at runtime.

## When NOT to Use

- The spec has no Acceptance Assertions table. Runtime validation needs binary, behaviour-only assertions to probe against; without them there is no contract to verify. Use `hs-spec` to author the table first.
- The change is non-behavioural (refactor with no user-visible delta). Static review is sufficient.
- The project has no runnable entry point yet. Bootstrap first; runtime validation needs a live target.

## Prerequisites

1. **Acceptance Assertions table** — a table of `(ID, assertion, verification method)` rows in the spec, each binary and probable from observable state alone. See `skills/hs-spec/SKILL.md`.
2. **Runnable target** — a command that brings the system up (e.g. `pnpm dev`, `cargo run`, `docker compose up`) and a known ready signal (URL responds, log line, port open).
3. **Diff range** — `BASE_SHA..HEAD_SHA` covering the work being validated, so the report can be attached to a milestone or PR.
4. **Subset selection** — the assertion IDs this run is responsible for (e.g. `{A1, A2, A4}` when validating one milestone in a multi-milestone plan). Use the full set when validating a flat plan or a PR end-to-end.

## Process

### Step 1: Resolve the run target

Read the project's manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) and identify:

- the command that starts the system,
- the working directory it must run from,
- the ready signal (HTTP 200 on `/health`, a log line, an open port),
- any environment variables it requires (read from `.env.example` or the repo's env-init skill output).

If any of these is ambiguous, stop and ask. Guessing the run command is a frequent cause of false FAILs.

### Step 2: Bring the system up

Start the target as a background process from the resolved working directory. Wait for the ready signal — do **not** start probing before readiness. Capture stdout/stderr to a log file so failures can be attributed.

If the system refuses to start, the run aborts with `BLOCKED`: report the startup log and stop. Do not invent probes against a system that never came up.

### Step 3: Dispatch the runtime verifier

Dispatch `harness-stack:runtime-validator` (see `agents/runtime-validator.md`) with a brief containing:

- The Acceptance Assertions table for this run (only the rows in the selected subset).
- The base URL or other entry coordinates of the running system.
- The path to the startup log file.
- The diff range `BASE_SHA..HEAD_SHA` (for attribution in the report; the validator does **not** read the diff).
- Any test data / fixtures the assertions assume (declared in the spec).

The validator never reads the implementation source. It probes the running system through the verification method declared per assertion (HTTP call, DOM query, DB select, file check, log grep).

### Step 4: Receive the coverage matrix

The validator returns one row per assertion in the requested subset:

| ID | Status | Evidence |
|----|--------|----------|
| A1 | PASS   | DOM snapshot: `<form id="login">…<input type="email">…<input type="password">…</form>` |
| A2 | PASS   | network log: `POST /sessions → 303 → GET /dashboard` 412 ms |
| A3 | FAIL   | API call returned `{"error":"unknown"}` (expected `invalid_credentials`); request/response logged at `runs/2026-05-14-1130/A3.log` |

A FAIL row must include a reproducible probe (the exact `curl` / Playwright snippet / SQL query that produced the failure) so an implementer can reproduce it without re-deriving the test.

### Step 5: Tear down

Stop the background process. Persist the run artifacts (probe outputs, startup log, coverage matrix) under a timestamped directory next to the plan, e.g. `docs/exec-plans/<plan>/runs/<timestamp>/`. The path is what gets appended to the plan's Progress handoff log.

### Step 6: Report

Return to the caller:

- A one-line verdict: `PASS (N/N)` or `FAIL (k/N)`.
- The coverage matrix.
- The artifacts path.
- For any FAIL, a "What to fix" stub the caller (or downstream skill) can hand back to an implementer.

## Coverage Rules

- Every assertion in the requested subset must appear in the matrix with a definite `PASS` or `FAIL`. `SKIP` / `INCONCLUSIVE` is only permitted when a precondition assertion already failed and the dependent one cannot be probed; record the dependency explicitly.
- An assertion that probes successfully but does not match the declared `verification method` is a FAIL, not a PASS. The method is part of the contract.
- A coverage matrix that omits an assertion ID from the subset is invalid — re-run the validator.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Tests pass, this is redundant." | Tests assert against code-shaped expectations the author wrote. Runtime validation asserts against the contract a fresh agent reads. Different invariants, both needed. |
| "I'll skip it for a small milestone." | A small milestone has few assertions and finishes fast; runtime validation is cheaper here, not more expensive. Run it. |
| "The validator can read the source to figure out the assertions." | No. The whole point is that the validator sees only the spec and the running system. Reading the source rebuilds the bias you're trying to escape. |
| "If a probe fails, I'll just adjust the assertion." | The assertion came from the spec, which the human approved. Adjusting it without going back through the spec hides drift. Revise the spec or fix the system; don't quietly soften the contract. |
| "The system didn't start, I'll mark assertions FAIL." | A system that doesn't start is a `BLOCKED` run, not a failed assertion set. Report startup failure separately. |

## Red Flags

- Validator output includes references to source files, function names, or implementation specifics — it has been contaminated by reading the code. Re-dispatch with a fresh context.
- Coverage matrix has fewer rows than the requested subset.
- A FAIL row has no reproducer.
- Run artifacts not persisted; the plan's Progress section gains no audit trail.
- The verification methods recorded in the spec are not behaviour-level (e.g. "assert function X is called"). Send the spec back through `hs-spec` before validating.

## Verification

- [ ] Spec's Acceptance Assertions table is present and well-formed.
- [ ] System started cleanly with a captured ready signal.
- [ ] Validator subagent ran in fresh context and did not read the implementation source.
- [ ] Every assertion ID in the requested subset has PASS or FAIL with evidence.
- [ ] All FAIL rows include a reproducer.
- [ ] Run artifacts persisted at a stable path and that path appended to the plan's Progress section.
