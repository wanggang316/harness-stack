# Handoff decision tree

Input: an implementer returned. Read its handoff:

```bash
hs-plan handoff <feature-id>
```

Every handoff must reach a terminal action before the loop continues.

## A — `returnToController: true`

The implementer hit something it can't solve and asked for help. Check `criticalContext`
and the summary:

| Cause | Action |
|---|---|
| Missing precondition (e.g. schema not deployed) | Create/reorder a precondition feature ahead of it |
| Plan boundary can't be honored | Return to the user — boundaries are user-confirmed |
| Spec ambiguous (two readings, can't choose) | Disambiguate `plan.md` / the contract (delegate contract edits); re-confirm with the user if needed; reset feature to `pending` with a clearer description |
| External service down / credentials expired | **Return to the user** — you can't recover external state |
| Repo in an unexpected state (dirty tree, wrong branch) | Investigate; don't "clean up" before you understand why |

After fixing the root cause: `hs-plan set-status <id> pending`, then continue. Never mark
a returned feature `completed`.

## B — `successState: failure`

1. Delegate failure analysis to a read-only subagent: read the handoff (especially
   `verificationEvidence`, `criticalContext`, `discoveredIssues`), the feature, and
   `plan.md`; determine root cause; recommend 1-3 fix features (id, description,
   preconditions, expectedBehavior, verificationSteps, agent, fulfills) and whether the
   original can stay `pending` with an updated description or be replaced.
2. Most often: create the fix feature(s) at the **top** of `features.json` and reset the
   original to `pending`. The fixes run first; the original re-runs after.

## C — `successState: partial`

Some `expectedBehavior` passed, some didn't.
- Most often: reset the original to `pending`, updating `description` to state exactly what
  remains (fold in relevant `criticalContext` for the next worker).
- If the partial result is usable and the gap is well-bounded: mark `completed` and create a
  follow-up feature for the gap in the same milestone (right after it).
- If the gap is large: treat as `failure` (path B).

## D — `successState: success`

Don't blindly trust — verify briefly:
1. Do commits matching `commits[]` exist? (`git log --oneline -5`)
2. Is the tree clean? If not, the worker forgot to commit — treat as `partial`.
3. Does `verificationEvidence` cover every `verificationStep` with real results (not "verified" / "looks fine")? Missing verification is tech debt — see D.2.

Then process the lists:

### D.1 — `discoveredIssues` (incidental defects; must be tracked)

| Severity | Default |
|---|---|
| `blocker` | New feature at the **top**; original stays `completed` |
| `tech-debt` | Follow-up in the same milestone if unsealed, else a `misc-*` milestone (≤5 features) |
| `nit` | `misc-*` if worth fixing, else dismiss with justification |

Skipping is allowed only if (1) already tracked by an existing feature (cite its id) or
(2) genuinely never needs fixing. "Low priority" / "non-blocking" / "later" are **not**
valid reasons.

### D.2 — `whatWasLeftUndone` (in-scope work not done; must be tracked)

Skipped manual QA / incomplete verification = tech debt.

| Belongs to | Action |
|---|---|
| This feature (e.g. its QA was skipped) | Reset to `pending`, update `description` to cover the gap |
| An existing pending feature | Fold into that feature's `description` (if the merged scope still fits one session) |
| A new bounded chunk | New feature (top / in-milestone / `misc-*`) |
| Out of scope (rare) | Dismiss with justification, or escalate |

### D.3 — `criticalContext` (facts the next worker/validator needs)

- Project/codebase fact (e.g. "migrations must run before app start") → the relevant `docs/` Library file.
- Feature-specific → update that feature's `description`.
- Decision/rationale worth keeping → `plan.md` Decision Log.

### D.4 — Terminal

```bash
hs-plan set-status <feature-id> completed
```

Continue the loop.

## Dismissals — when and how

Dismissal is a deliberate decision not to act on a handoff item. Use sparingly. A valid
justification is substantive (≥ a sentence): "Already tracked as feature `<id>`: …" or
"Will never need fixing: …". Invalid: "low priority", "non-blocking", "later", bare
"out of scope". Record the decision in `plan.md` Decision Log (the plan dir is the
working record; git history of `docs/` is the audit trail for durable facts).

## Quick reference

```
handoff arrives
├── returnToController? ──► (A) fix root cause / escalate; feature → pending
├── failure?            ──► (B) subagent analysis → fix features at top → original → pending
├── partial?            ──► (C) usually feature → pending with updated description
└── success
    ├── verify commits + clean tree + real evidence (else → partial)
    ├── discoveredIssues: blocker→top · tech-debt→milestone/misc · nit→misc/dismiss
    ├── whatWasLeftUndone: this-feature→pending · existing→update · new→feature · oos→dismiss
    ├── criticalContext: project→docs/ Library · feature→description · decision→plan.md
    └── set-status completed → loop
```
