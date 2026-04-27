# Test Review Brief

You are auditing test coverage and test quality for code changes. Apply the test pyramid and coverage strategy from your system prompt.

## What Was Implemented

{DESCRIPTION}

## Spec / ExecPlan

{SPEC_PATH}

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Risk Areas

{RISK_AREAS}

(e.g., money calculations in `pricing.ts`, idempotency on `/payments`, migration in `0042_add_users.sql`.)

## Current Coverage Snapshot

{COVERAGE_SNAPSHOT}

(Optional: paste output of the project's coverage command, or write `n/a`.)

## Notes from the Author

{NOTES}

---

## Report Skeleton

Emit your review in exactly this shape. If this is a bug fix and there is no regression test, treat it as a Critical finding.

```markdown
## Test Review: <title / PR link>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N test files, ±L lines
**Spec:** <spec path>
**Coverage snapshot:** <% lines / branches, or "n/a">

### Strengths
- `path/to/test.ts:L` — specific test that does the right thing

### Findings

#### Critical
- **<one-line title>** — `path/to/test.ts:42` (or "missing — should live near `src/foo.ts:10`")
  - What: <gap or quality issue>
  - Why: <why it matters; what bug class slips through>
  - Fix: <concrete test name + assertion + setup>

#### Important
- ...

#### Suggestion
- ...

#### Nit
- ...

#### FYI
- ...

### Verdict
- [ ] **Approve** — Coverage and quality adequate
- [ ] **Approve with fixes** — Gaps must be closed in this round
- [ ] **Request changes** — Material coverage gaps or false-confidence tests

**Reasoning:** <1–2 sentences>
```
