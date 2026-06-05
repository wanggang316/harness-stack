# Phase 3 — Features

Decompose the accepted plan + finalized contract into `features.json`. Each feature is
one unit of work an implementer completes in a single session, bound by `fulfills` to
the contract assertions it makes testable.

**Precondition:** `validation-contract.md` is finalized and `validation-state.json` is
seeded (`hs-plan init-state`). No features before the contract — `fulfills` has nothing
to bind to otherwise.

## Feature schema

`features.json` is `{ "features": [ <feature>, … ] }`. Each feature:

```json
{
  "id": "auth-login-endpoint",
  "description": "POST /api/auth/login — validate credentials, set session cookie, 401 on bad creds.",
  "agent": "implementer",
  "milestone": "auth",
  "preconditions": ["user table exists with hashed password column"],
  "expectedBehavior": [
    "200 + Set-Cookie on valid credentials",
    "401 + generic error on invalid credentials, stays on login",
    "empty fields -> 400 with per-field errors, no network call"
  ],
  "verificationSteps": [
    "npm test -- --grep 'login' (expect new cases pass)",
    "curl -i POST /api/auth/login with valid body -> 200 + Set-Cookie"
  ],
  "fulfills": ["VAL-AUTH-001", "VAL-AUTH-002", "VAL-AUTH-003"],
  "status": "pending"
}
```

| Field | Meaning |
|---|---|
| `id` | kebab-case, unique. Carries semantic meaning. |
| `description` | What to build — concrete and specific. |
| `agent` | The subagent that implements it. Default `implementer`. |
| `milestone` | The vertical slice it belongs to (matches a `plan.md` milestone). |
| `preconditions` | Must-be-true before dispatch. Documentation; the controller verifies them. |
| `expectedBehavior` | Verifiable success criteria. |
| `verificationSteps` | How the implementer proves each behavior. |
| `fulfills` | Assertion ids this feature **completes** (makes fully testable). |
| `status` | `pending` initially; managed thereafter only via `hs-plan set-status`. |

## `fulfills` semantics

`fulfills` means **"completes,"** not "contributes to." Only the final feature that
makes an assertion fully testable claims it. Foundational features (schema, types,
scaffolding) set preconditions for others and carry `fulfills: []`.

The invariant: **every contract assertion is claimed by exactly one feature.** No
orphans, no double-claims.

## Ordering

`features.json` array order is execution order (no implicit dependency solver). Arrange:
foundational features before dependents; grouped by milestone; a precondition's
producer before its consumer. Terminal-status features auto-move to the bottom during
execution, so active work stays near the top.

## Sizing

Each feature should be ~one worker session (≈30 min–4 hr of human-equivalent work),
independently reviewable, touch a small file set, and have a clear acceptance. If a
feature needs more than a handful of files or mixes unrelated concerns, split it.

## Coverage gate

When `features.json` is drafted:

```bash
hs-plan contract-coverage     # MUST report 'coverage OK'
```

Resolve every violation before execution:
- `ORPHAN <id>` — no feature claims the assertion. Add it to a feature's `fulfills`.
- `DUPLICATE <id>` — two features claim it. Keep the one that truly completes it.
- `UNKNOWN-CLAIM <id>` — a `fulfills` entry isn't in the contract. Fix the typo or the contract.
- `STATE-ONLY` / `CONTRACT-ONLY` — state and contract drifted. Re-run `hs-plan init-state`.

## Verification

- [ ] Every milestone in `plan.md` is represented by features.
- [ ] Every assertion is claimed by exactly one feature (`hs-plan contract-coverage` OK).
- [ ] Foundational features precede dependents; ordering reflects preconditions.
- [ ] No feature is too large for a single worker session.
