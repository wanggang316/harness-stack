---
name: hs-user-test
description: Runs an application against a subset of user-test cases and reports PASS/FAIL with evidence per case. Plans isolation from surface cost tiers, dispatches one or more fresh-context validators (in parallel for large or expensive surfaces), merges their matrices, and persists operational findings back to the patterns doc. Use after a task implementation, at milestone boundaries, or before merge when behaviour-level verification is needed beyond static review.
---

# hs-user-test: Runtime Case Verification

## Overview

Static tools — unit tests, lint, type-check, code review — read the code. They cannot tell you whether the running system actually behaves the way the user-test contract demands. This skill closes that gap: it starts the application, plans how to isolate the cases, runs each requested user-test case against the live system, and reports a coverage matrix with evidence. The cases are run by a fresh subagent that has never read the implementation; PASS / FAIL is decided purely from observable state.

This skill is the **controller**: it resolves the run target, plans isolation, dispatches validators, and merges their results. The `user-test-validator` subagent is a **stateless prober**: it runs a group of cases and returns a partial matrix. When a run is large or its surface is expensive, the controller dispatches several validators in parallel — one per isolation group — and merges. There is no separate "flow" agent: the same validator is reused, the controller does the orchestration.

## When to Use

- A task implementation just finished and you need to confirm the cases it was bound to actually pass against the running system.
- A milestone has finished and you need cross-task verification before declaring it done.
- A flat plan is about to merge and you want behaviour-level evidence beyond test-suite output.
- You are debugging "tests pass but it doesn't actually work" and need to confirm which cases hold at runtime.

## When NOT to Use

- The feature has no user-test set at `docs/user-tests/<feature>.md`. Runtime validation needs concrete cases (persona + preconditions + steps + observable assertions + declared evidence) to probe; without them there is no contract to verify. Author the set first.
- The change is non-behavioural (refactor with no user-visible delta). Static review is sufficient.
- The project has no runnable entry point yet. Bootstrap first; runtime validation needs a live target.

## Prerequisites

1. **User-test set** at `docs/user-tests/<feature>.md` — each case carries persona, preconditions, steps, assertions (observable-only), declared Evidence, and `Covers AC` mapping. See `skills/hs-test-spec/`.
2. **Project test conventions** at `docs/user-test-patterns.md` — declares per-platform tooling, ready signals, state-isolation protocol, **surface cost tiers**, artifacts layout, and a knowledge-persistence section. See `skills/hs-test-spec/assets/user-test-patterns.md` for the template.
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
- The declared Evidence (what must be captured on PASS)
- The artifacts-on-FAIL list

The fully resolved case bundle is what goes into a validator's brief. The validator does not re-derive any of this from the source.

### Step 4: Plan isolation

Read the **surface cost tiers** from `docs/user-test-patterns.md` and classify the cases in this run:

- **cheap** (one curl call, library function, fast CLI invocation): one case per validation step; no grouping needed.
- **medium** (browser session per group): group cases that can share a session — same area, no state-mutating cross-talk.
- **expensive** (full env reset per case): minimise resets; sequence reset-requiring cases at the end of a group.

Produce an **isolation plan**: a list of groups, each a set of case IDs that share a surface and don't pollute each other, plus the reset boundary between groups. Decide the dispatch shape from it:

- Small subset, or all-cheap surface → **one validator** for the whole subset (the common case).
- Large subset (more than ~12 cases) on a medium/expensive surface → **one validator per group, dispatched in parallel**.

Record the plan; it goes into the run synthesis.

### Step 5: Dispatch the validator(s)

Dispatch `user-test-validator` (see `agents/user-test-validator.md`) with a brief containing, **for its group**:

- The resolved cases for the group (one bundle per case ID).
- The base URL or other entry coordinates of the running system.
- The path to the startup log file.
- The diff range `BASE_SHA..HEAD_SHA` (for attribution; the validator does **not** read the diff).
- The artifacts directory the validator must write to (namespace per group when running in parallel).
- The state-reset boundary it owns, from the isolation plan.

When the plan calls for parallel dispatch, send all group briefs in one batch so the validators run concurrently. Each validator runs only its assigned group, captures each case's declared Evidence on PASS and its artifacts-on-FAIL on FAIL, and returns a partial matrix. The validator never reads the implementation source; it runs each case exactly as declared, using the platform tool from `docs/user-test-patterns.md`.

### Step 6: Merge the coverage matrices

Collect the partial matrices from all validators and merge into one. Each row carries the declared evidence on PASS, or the failing assertion + reproducer on FAIL:

```
| Case ID         | Status | Evidence                                                       |
|-----------------|--------|----------------------------------------------------------------|
| UT-LOGIN-001    | PASS   | DOM: <form> with email + password inputs; screenshot at runs/<ts>/g1/UT-LOGIN-001/screenshot.png |
| UT-LOGIN-002    | PASS   | network: POST /sessions → 303 → GET /dashboard; 412 ms total   |
| UT-LOGIN-003    | FAIL   | assertion 3 of 4: expected body {"error":"invalid_credentials"}, got {"error":"unknown"}; repro at runs/<ts>/g1/UT-LOGIN-003/repro.sh |
```

A case PASSES only when every assertion inside it passes **and** its declared Evidence was captured. A case FAILS as soon as one assertion fails (record which one). The merged verdict is arithmetic: any FAIL → `FAIL`; else any INCONCLUSIVE → `INCONCLUSIVE`; else `PASS`. Every case ID in the requested subset must appear exactly once — if a parallel validator dropped or duplicated a case, re-dispatch that group.

### Step 7: Tear down

Stop the background process. Apply the patterns doc's retention rule to the run artifacts directory.

### Step 8: Report and persist findings

Write a run **synthesis** to the artifacts directory (`runs/<ts>/synthesis.md`) capturing: the verdict, the isolation plan used, per-group results, any setup issues, and a list of operational facts discovered. Then return to the caller:

- A one-line verdict: `PASS (N/N)`, `FAIL (k/N)`, `INCONCLUSIVE (m/N)`, or `BLOCKED (system did not start)`.
- The merged coverage matrix.
- The artifacts path (the synthesis lives here).
- For any FAIL, a "What to fix" stub citing the failing assertion and the reproducer path, so the caller can hand it back to an implementer.

**Knowledge persistence.** If setup surfaced a durable operational fact — a wrong ready signal, a missing seed step, a faster path to a ready state, a surface gotcha — append it to the Knowledge Persistence section of `docs/user-test-patterns.md` so the next run is faster. Facts only, no test cases. If a discovery changes a convention (e.g. the real ready signal), fix that section too.

## Coverage Rules

- Every case in the requested subset must appear in the merged matrix exactly once with a definite `PASS`, `FAIL`, or `INCONCLUSIVE`. `SKIP` is only permitted when a prior case in the same group already FAIL'd and the dependent case cannot be probed; record the dependency explicitly.
- A case PASSES only when every assertion passes **and** its declared Evidence was captured. Evidence-less PASS is not a PASS — it's an unverified claim; mark it `INCONCLUSIVE`.
- A case that probes successfully but does not use the verification method declared on its assertions is a FAIL, not a PASS. The method is part of the contract.
- A merged matrix that omits a case ID from the subset, or lists one twice, is invalid — re-dispatch the affected group.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Tests pass, this is redundant." | Tests assert against code-shaped expectations the author wrote. Runtime validation runs the user-test contract a fresh agent reads. Different invariants, both needed. |
| "I'll skip it for a small task." | A small task covers few cases and finishes fast; runtime validation is cheaper here, not more expensive. Run it. |
| "The validator can read the source to figure out what to probe." | No. The whole point is that the validator sees only the resolved case and the running system. Reading the source rebuilds the bias you're trying to escape. |
| "Just split everything into parallel groups, it's faster." | Parallel dispatch costs setup per group and risks state cross-talk. Split only when the subset is large on a medium/expensive surface; otherwise one validator is simpler and safer. |
| "It passed, I don't need to capture the evidence." | A PASS without its declared evidence is a claim, not a record. The Evidence field is part of the contract; capture it or mark INCONCLUSIVE. |
| "If a case fails, I'll just adjust the assertion in the user-test doc." | The case is part of the approved contract. Adjusting it to make a run pass hides drift. Fix the system, or escalate the contract — don't quietly soften it. |
| "The system didn't start, I'll mark all cases FAIL." | A system that doesn't start is a `BLOCKED` run, not a failed case set. Report startup failure separately. |
| "Per-task validation is too granular; I'll only run at the milestone gate." | Per-task probes catch regressions on the diff just written; milestone probes catch cross-task interactions. Skipping per-task means defects compound until the milestone gate, then everything fails at once. |

## Red Flags

- Validator output includes references to source files, function names, or implementation specifics — it has been contaminated by reading the code. Re-dispatch with a fresh context.
- Merged matrix has fewer rows than the requested case subset, or a case appears twice.
- A PASS row carries no evidence, or evidence that doesn't match the case's declared Evidence.
- A FAIL row has no reproducer.
- Run artifacts or synthesis not persisted; the caller gains no audit trail.
- Parallel groups overlap in state (one group's writes change another group's preconditions) — the isolation plan was wrong; re-group.
- Cases use selectors or assertions forbidden by `docs/user-test-patterns.md` (CSS classes, file paths, implementation-named test ids). Send the user-test doc back for revision before validating.
- State-isolation protocol skipped — cases pollute each other and PASS / FAIL becomes order-dependent.

## Verification

- [ ] `docs/user-tests/<feature>.md` is present and the requested case IDs resolve cleanly to fully-formed cases (including declared Evidence).
- [ ] `docs/user-test-patterns.md` is present and named the tool and surface cost tiers used for this run.
- [ ] System started cleanly with a captured ready signal.
- [ ] State-isolation protocol applied before any case ran.
- [ ] Isolation plan produced; dispatch shape (single vs parallel) matches subset size and surface cost.
- [ ] Validator subagent(s) ran in fresh context and did not read the implementation source.
- [ ] Every case ID in the requested subset appears exactly once in the merged matrix with PASS, FAIL, or INCONCLUSIVE plus evidence.
- [ ] Every PASS row carries the case's declared Evidence; every FAIL row includes a reproducer.
- [ ] Run synthesis persisted at a stable path; operational findings appended to the patterns doc's Knowledge Persistence section.
