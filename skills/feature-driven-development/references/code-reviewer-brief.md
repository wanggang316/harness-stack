# Code Review Brief

You are reviewing code from feature **`{FEATURE_ID}`** for production readiness.

**Your task:**

1. Run the spec compliance pass against the diff below.
2. Review the diff across correctness, readability, architecture, security, and performance.
3. Categorize every finding with severity + `file:line` + what / why / fix.
4. Emit the report in the Output Format below.
5. Give a clear verdict — Approve / Approve with fixes / Request changes — with a one-sentence reasoning.

## What Was Implemented

{DESCRIPTION}

## Feature / plan.md

{PLAN_PATH}

<!-- Path to .harness-runtime/plans/<slug>/plan.md for context. The feature's
expected behavior and the contract assertions it fulfills are the acceptance bar. -->

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Focus Areas

{FOCUS_AREAS}

## Notes from the Controller

{NOTES}

---

## Output Format

Emit your review in exactly this shape:

```markdown
## Review: <feature id / title>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Feature:** <feature id>
**Scope:** CLEAN | DRIFT | MISSING REQUIREMENTS
  - Intent: <what was requested>
  - Delivered: <what the diff does>
  - [If DRIFT]: list each out-of-scope change
  - [If MISSING]: list each unaddressed expected behavior

### Strengths
- specific thing done well (`path/to/file.ts:L`)

### Issues

#### Critical
- **<one-line title>** — `path/to/file.ts:42`
  - What: <what is wrong>
  - Why: <why it matters; quantify when possible>
  - Fix: <concrete fix>

#### Important
- ...

#### Suggestion
- ...

#### Nit
- ...

#### FYI
- ...

### Verification
- [ ] Tests pass (`<command>`)
- [ ] Build succeeds
- [ ] Manual / visual / perf evidence, if applicable

### Verdict
- [ ] **Approve** — Ready to merge
- [ ] **Approve with fixes** — Critical / Important resolvable in this round
- [ ] **Request changes** — Issues must be addressed

**Reasoning:** <1–2 sentences>
```

Severity guidance: **Critical** blocks merge (data loss, security hole, broken core
behavior, race). **Important** should be fixed now (missing expected behavior, real
bug on a non-core path). **Suggestion / Nit / FYI** do not block. A verdict of
*Approve with fixes* is only valid when no Critical remains.
