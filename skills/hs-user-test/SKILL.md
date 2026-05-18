---
name: hs-user-test
description: Runs an application against a subset of user-test cases and reports PASS/FAIL with evidence per case. Use after a task implementation, at milestone boundaries, or before merge when behaviour-level verification is needed beyond static review.
---

# hs-user-test: Runtime Case Verification

## Overview

Static tools — unit tests, lint, type-check, code review — read the code. They cannot tell you whether the running system actually behaves the way the user-test contract demands. This skill closes that gap: it starts the application, runs each requested user-test case against the live system, and reports a coverage matrix with evidence. The verifier dispatches as a fresh subagent that has never read the implementation; PASS / FAIL is decided purely from observable state.

## When to Use

- A task implementation just finished and you need to confirm the cases it was bound to actually pass against the running system.
- A milestone has finished and you need cross-task verification before declaring it done.
- A flat plan is about to merge and you want behaviour-level evidence beyond test-suite output.
- You are debugging "tests pass but it doesn't actually work" and need to confirm which cases hold at runtime.

## When NOT to Use

- The feature has no user-test set at `docs/user-tests/<feature>.md`. Runtime validation needs concrete cases (persona + preconditions + steps + observable assertions) to probe; without them there is no contract to verify. Use `/hs-test-spec` to author the set first.
- The change is non-behavioural (refactor with no user-visible delta). Static review is sufficient.
- The project has no runnable entry point yet. Bootstrap first; runtime validation needs a live target.

## Prerequisites

1. **User-test set** at `docs/user-tests/<feature>.md` — each case carries persona, preconditions, steps, assertions (observable-only), and `Covers AC` mapping. See `skills/hs-test-spec/`.
2. **Project test conventions** at `docs/user-test-patterns.md` — declares per-platform tooling, ready signals, state-isolation protocol, artifacts layout. See `skills/hs-define-test-spec/`.
3. **Personas registry** at `docs/user-tests/_shared/personas.yaml` — referenced cases must find their persona here.
4. **Runnable target** — a command that brings the system up (`pnpm dev`, `cargo run`, `docker compose up`) and a known ready signal (URL responds, log line, port open). Defined in `docs/user-test-patterns.md`.
5. **Diff range** — `BASE_SHA..HEAD_SHA` covering the work being validated, so the report can be attached to a task, milestone, or PR.
6. **Case subset** — the case IDs this run is responsible for (e.g. `{UT-LOGIN-001, UT-LOGIN-002}` when validating one task). Use the full set when validating a flat plan or a PR end-to-end.

## Process

### Step 1: Resolve the run target

Read `docs/user-test-patterns.md` for the per-platform tool and ready signal. Cross-check against the project manifest (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.) for the start command and working directory. Pull required environment variables from `.env.example` or the env-init skill's output.

If any of these is ambiguous, stop and ask. Guessing the run command is a frequent cause of false FAILs.

### Step 2: Bring the system up

Start the target as a background process from the resolved working directory. Apply the state-isolation protocol from `docs/user-test-patterns.md` (DB reset, storage seed, fixture load) before any case runs. Wait for the ready signal — do **not** start probing before readiness. Capture stdout/stderr to a log file so failures can be attributed.

If the system refuses to start, the run aborts with `BLOCKED`: report the startup log and stop. Do not invent probes against a system that never came up.

### Step 3: Resolve the case subset

For each case ID in the requested subset, load from `docs/user-tests/<feature>.md`:

- The persona (resolve from `docs/user-tests/_shared/personas.yaml` to get auth, permissions, fixture paths)
- The preconditions (fixtures, seed)
- The steps
- The assertions and their verification methods
- The artifacts-on-FAIL list

The fully resolved case bundle is what goes into the validator's brief. The validator does not re-derive any of this from the source.

### Step 4: Dispatch the runtime verifier

Dispatch `user-test-validator` (see `agents/user-test-validator.md`) with a brief containing:

- The resolved cases for this run (one per requested ID).
- The base URL or other entry coordinates of the running system.
- The path to the startup log file.
- The diff range `BASE_SHA..HEAD_SHA` (for attribution; the validator does **not** read the diff).
- The artifacts directory the validator must write to.

The validator never reads the implementation source. It runs each case through the steps and assertions exactly as declared, using the platform tool declared by `docs/user-test-patterns.md`.

### Step 5: Receive the coverage matrix

The validator returns one row per case in the requested subset:

```
| Case ID         | Status | Evidence                                                       |
|-----------------|--------|----------------------------------------------------------------|
| UT-LOGIN-001    | PASS   | DOM: <form> with email + password inputs; screenshot at runs/<ts>/UT-LOGIN-001/screenshot.png |
| UT-LOGIN-002    | PASS   | network: POST /sessions → 303 → GET /dashboard; 412 ms total   |
| UT-LOGIN-003    | FAIL   | assertion 3 of 4: expected response body {"error":"invalid_credentials"}, got {"error":"unknown"}; repro at runs/<ts>/UT-LOGIN-003/repro.sh |
```

A case PASSES only when every assertion inside it passes. A case FAILS as soon as one assertion fails (record which one). Every FAIL row must include a reproducer per `docs/user-test-patterns.md`'s artifacts contract.

### Step 6: Tear down

Stop the background process. Apply the patterns doc's retention rule to the run artifacts directory. The artifacts path is what gets appended to the plan's Progress handoff log.

### Step 7: Report

Return to the caller:

- A one-line verdict: `PASS (N/N)`, `FAIL (k/N)`, or `BLOCKED (system did not start)`.
- The coverage matrix.
- The artifacts path.
- For any FAIL, a "What to fix" stub citing the failing assertion and the reproducer path, so the caller can hand it back to an implementer.

## Coverage Rules

- Every case in the requested subset must appear in the matrix with a definite `PASS`, `FAIL`, or `INCONCLUSIVE`. `SKIP` is only permitted when a prior case in the same run already FAIL'd and the dependent case cannot be probed; record the dependency explicitly.
- A case that probes successfully but does not use the verification method declared on its assertions is a FAIL, not a PASS. The method is part of the contract.
- A coverage matrix that omits a case ID from the subset is invalid — re-run the validator.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Tests pass, this is redundant." | Tests assert against code-shaped expectations the author wrote. Runtime validation runs the user-test contract a fresh agent reads. Different invariants, both needed. |
| "I'll skip it for a small task." | A small task covers few cases and finishes fast; runtime validation is cheaper here, not more expensive. Run it. |
| "The validator can read the source to figure out what to probe." | No. The whole point is that the validator sees only the resolved case and the running system. Reading the source rebuilds the bias you're trying to escape. |
| "If a case fails, I'll just adjust the assertion in the user-test doc." | The case came from `/hs-test-spec`, which the human approved. Adjusting it without going back through `/hs-test-spec` hides drift. Fix the system, or escalate the spec — don't quietly soften the contract. |
| "The system didn't start, I'll mark all cases FAIL." | A system that doesn't start is a `BLOCKED` run, not a failed case set. Report startup failure separately. |
| "Per-task validation is too granular; I'll only run at the milestone gate." | Per-task probes catch regressions on the diff just written; milestone probes catch cross-task interactions. Skipping per-task means defects compound until the milestone gate, then everything fails at once. |

## Red Flags

- Validator output includes references to source files, function names, or implementation specifics — it has been contaminated by reading the code. Re-dispatch with a fresh context.
- Coverage matrix has fewer rows than the requested case subset.
- A FAIL row has no reproducer.
- Run artifacts not persisted; the plan's Progress section gains no audit trail.
- Cases use selectors or assertions forbidden by `docs/user-test-patterns.md` (CSS classes, file paths, implementation-named test ids). Send the user-test doc back through `/hs-test-spec` before validating.
- State-isolation protocol skipped — cases pollute each other and PASS / FAIL becomes order-dependent.

## Verification

- [ ] `docs/user-tests/<feature>.md` is present and the requested case IDs resolve cleanly to fully-formed cases.
- [ ] `docs/user-test-patterns.md` is present and named the tool used for this run.
- [ ] System started cleanly with a captured ready signal.
- [ ] State-isolation protocol applied before any case ran.
- [ ] Validator subagent ran in fresh context and did not read the implementation source.
- [ ] Every case ID in the requested subset has PASS, FAIL, or INCONCLUSIVE with evidence.
- [ ] All FAIL rows include a reproducer at the path declared by the patterns doc.
- [ ] Run artifacts persisted at a stable path and that path appended to the plan's Progress section.
