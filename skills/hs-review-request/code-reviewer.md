# Code Review Brief

You are reviewing code changes for production readiness. Apply the five-axis review process from your system prompt.

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

## Focus Areas

{FOCUS_AREAS}

## Notes from the Author

{NOTES}

---

## Report Skeleton

Emit your review in exactly this shape:

```markdown
## Review: <title / PR link>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Spec:** <spec path>
**Scope:** CLEAN | DRIFT | MISSING REQUIREMENTS
  - Intent: <what was requested>
  - Delivered: <what the diff does>
  - Plan items: A DONE, B PARTIAL, C NOT DONE, D CHANGED (omit if no plan items)
  - [If DRIFT]: list each out-of-scope change
  - [If MISSING]: list each unaddressed requirement

### Strengths
- `path/to/file.ts:L` — specific thing done well

### Findings

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
