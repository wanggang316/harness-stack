# Phase 4 — Execution

The longest phase. You drive a serial loop: one feature at a time through four gates,
validators at milestone boundaries, then a final integration review and the gate.

```
loop:
  f = hs-plan next-feature           # first pending; empty => done
  sanity-check preconditions
  hs-plan set-status f in_progress
  dispatch implementer  -> handoff (hs-plan handoff f)
  run handoff decision tree (references/handoff-handling.md)
  spec-review gate    -> loop back to implementer until ✅
  code-review gate    -> loop back until Approve / Approve-with-fixes (no Critical)
  if f.fulfills non-empty: user-test probe over f.fulfills -> loop back on FAIL
  hs-plan set-status f completed
  if milestone's impl features all completed/cancelled and not sealed:
     run validator pair -> hs-plan seal-milestone <m>
final integration review + hs-plan gate
```

**Execution is serial.** One feature at a time. Read-only parallelism inside a phase
(parallel research, parallel review of independent files) is fine; concurrent
implementers are not — they stomp on shared state and make inconsistent decisions.

**The controller never writes code and never edits the implementation to fix a finding.**
Every fix loops back to the implementer. The moment the controller edits code, the
fresh-context invariant is gone.

## Before the loop (once)

```bash
hs-plan contract-coverage     # MUST report 'coverage OK'
hs-plan list-features         # eyeball ordering
git status                    # working tree clean
```

## Per-feature loop

### 1. Next feature
```bash
hs-plan next-feature          # -> <id>\t<agent>\t<milestone>  (empty => go to the gate)
```

### 2. Sanity check
Are the feature's `preconditions` met? (If one says "schema X exists," confirm it does.)
Is the working tree clean? If a precondition is unmet, create/reorder a foundational
feature ahead of it, or `hs-plan set-status <id> cancelled` if it's moot.

### 3. Dispatch the implementer
```bash
hs-plan set-status <id> in_progress
```
Then `Task(subagent_type="implementer", …)` with a brief from
`references/implementer-brief.md`. Fill in the feature's fields, the **Boundaries** block
(from `plan.md` Infrastructure), and the file scope. The implementer reads only the
brief — do **not** inline the plan or contract. The brief instructs the implementer to
finish by writing a handoff JSON and `hs-plan write-handoff <id> <path>`.

### 4. Handle the handoff
```bash
hs-plan handoff <id>
```
Run the decision tree in `references/handoff-handling.md`. It routes `returnToController`
/ `failure` / `partial` / `success`, tracks `discoveredIssues` / `whatWasLeftUndone`,
and propagates `criticalContext`. A feature only advances to the gates below on a
verified `success`.

### 5. Spec-review gate
`Task(subagent_type="spec-reviewer", …)` with `references/spec-reviewer-brief.md` (feature
text + `BASE..HEAD` range). ❌ → re-dispatch the **same implementer** with the findings
appended; loop until ✅. Spec review before code review, always.

### 6. Code-review gate
`Task(subagent_type="code-reviewer", …)` with `references/code-reviewer-brief.md`. Approve
or Approve-with-fixes (no Critical) → proceed. Critical present / Request changes →
re-dispatch the implementer; loop.

### 7. Runtime probe (completing features only)
If the feature's `fulfills` is non-empty, invoke `harness-stack:user-test` over exactly
those `VAL-` ids and the feature's diff range. The validator probes the running system
and **the controller writes results back** with `hs-plan set-assertion <VAL-id> <status>
[evidence]` per the returned matrix. Any FAIL → re-dispatch the implementer with the
failing assertion's evidence; loop. Foundational features (`fulfills: []`) skip this gate.

### 8. Complete
```bash
hs-plan set-status <id> completed     # moves it to the bottom
```
Update `plan.md` Progress (append a handoff-log line). Back to step 1.

## Milestone validation

When every implementation feature in a milestone is `completed`/`cancelled` and the
milestone is not sealed (`hs-plan is-sealed <m>` → `no`), run the heavier pair that
catches cross-feature interactions no single feature's probe exercised:

1. `Task(subagent_type="code-reviewer", …)` over the **milestone diff** (integration review).
2. `harness-stack:user-test` over the milestone's assertion subset; write results back with `hs-plan set-assertion`.
3. Both clean → `hs-plan seal-milestone <m>`. Any failure → create fix features at the top, re-run.

Sealed milestones are immutable — never add features to one. New work goes to a later
milestone or a `misc-*` milestone (≤5 features each).

## Final integration review (once)

After every feature is done and the last milestone is sealed:

1. `Task(subagent_type="code-reviewer", …)` over the full `BASE..HEAD` — per-feature reviews didn't see cross-feature interactions.
2. **Coverage gate:** every contract assertion has at least one PASS across the probe transcripts. Any never probed → run `harness-stack:user-test` over the remainder.
3. Any Critical/Important → fix via the implementer loop, re-run the review.
4. `hs-plan gate` → must report `GATE PASSED`. Then hand off to commit / PR.

## Round budget

**3 rounds per feature.** Still `BLOCKED`, still ❌ from spec-review, or still Critical
from code-review after 3 implementer rounds → stop and escalate to the human. The plan,
the contract, or the feature scope is the problem; more rounds dilute signal. Never
re-dispatch a `BLOCKED` feature under the same conditions — change context, model, or
split it.

## Commit discipline

Implementers create their own atomic commit per feature (conventional-commit format).
The **controller** only commits its own artifact/Library updates (plan.md, contract,
docs/ Library) — and the plan dir is gitignored, so most controller "commits" are just
durable docs/ updates. If an implementer returns `success` with an uncommitted dirty
tree, stop: treat as `partial` and fix the implementer brief.

## Handling mid-flow user requests

When the user asks for a change mid-flow:

1. **Pause** — don't immediately decompose.
2. **Clarify + investigate** — `AskUserQuestion` + read-only subagents (+ research if new tech). Iterate to clarity.
3. **Propose** how you'll accommodate it (new features / changed scope / new milestone). Get acceptance.
4. **Propagate to shared state before any implementer resumes:** `plan.md` (scope/strategy/boundaries), the `docs/` Library (durable conventions), and — for changed testable behavior — `validation-contract.md`. **Delegate contract edits to a subagent**; don't hand-edit the contract mid-flow. Semantics: new assertion → add + `hs-plan init-state` (seeds it `pending`); removed → delete from contract, re-run `init-state` (drops it from state); modified so prior evidence no longer proves it → its assertion resets to `pending` on re-probe.
5. **Re-cover** — update `features.json` so every assertion is claimed; `hs-plan contract-coverage` OK.
6. **Resume** the loop.

Scope reduction ("we don't need that anymore"): `hs-plan set-status <id> cancelled` (don't
delete — keep history), remove the assertion from the contract, re-run `init-state`, drop
orphaned `fulfills`. Assertions have no "cancelled" status; a dropped requirement is removed.

## When to return to the user

Hand control back when: human action is required (approve a purchase, authenticate to a
third party); a decision needs human judgment (security, major architecture, business
trade-off); an external dependency is unrecoverable (don't create retry features for
infra you can't fix); a discovered ambiguity can't be resolved from context; or the work
far exceeds the agreed scope. State the blocker and what's needed to continue.

## Override semantics

You may override a validator failure with cause, but **never silently** — leave an
auditable record. To seal a milestone with deferred assertions, move those `VAL-` ids
out of the sealed milestone's features into a feature in an **unsealed** milestone (keep
`fulfills` unique; ensure they're `pending` in state so a later probe picks them up), and
note the deferral in `plan.md` Decision Log.
