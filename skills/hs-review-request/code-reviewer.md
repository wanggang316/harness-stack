# Code Review Brief

You are reviewing code changes for production readiness. Apply the five-axis review process: correctness, readability, architecture, security, performance.

**Your task:**

1. Run the spec compliance pass against the diff below.
2. Review the diff across correctness, readability, architecture, security, and performance.
3. Categorize every finding with severity + `file:line` + what / why / fix.
4. Emit the report in the skeleton at the bottom of this brief.
5. Give a clear verdict — Approve / Approve with fixes / Request changes — with a one-sentence reasoning.

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

## Review Checklist

**Spec compliance** (run first):
- Every requirement classified DONE / PARTIAL / NOT DONE / CHANGED.
- Files changed match stated intent — flag scope creep.

**Correctness:**
- Logic matches the spec; edge cases (null, empty, boundary, concurrent) handled.
- Error paths surface failures — no silent swallows, no over-broad catches.

**Readability:**
- Names express intent without comments.
- Functions do one thing; nesting is shallow.
- Diff is reviewable without context only the author has.

**Architecture:**
- Module boundaries respected; no reach-arounds.
- New abstractions earn their complexity (no premature generalization).
- Side effects isolated; pure logic stays pure.

**Security:**
- Untrusted input validated before crossing a trust boundary.
- Secrets / tokens / PII not logged, not committed, not embedded in error messages.
- Authn/authz checks consistent with the rest of the codebase.
- Parameterised queries; no string-built SQL or shell.

**Performance:**
- Hot paths free of obvious O(n²) / N+1 / unbounded allocations.
- Async work bounded; no unbounded fan-out, no blocking calls in async loops.
- Resources released (handles, connections, listeners, timers).

**Tests:**
- Assert behavior, not the mock.
- Bug fixes ship a regression test that fails without the fix.
- Edge cases covered, not only the happy path.

**Dependencies (if added):**
- Existing stack already solves this?
- Maintained, license-compatible, no known CVEs?
- Install / bundle impact justified?

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

## Example (calibration)

```markdown
## Review: Add task verification and repair

**Range:** `a7981ec..3df7661` — 4 files, +312 / −18
**Spec:** docs/specs/conversation-index.md
**Scope:** CLEAN
  - Intent: Verify index integrity and repair drift introduced by 0041 migration.
  - Delivered: `verifyIndex()` walks the index, `repairIndex()` reconciles 4 issue types, both wired into the CLI.
  - Plan items: A DONE, B DONE, C PARTIAL (only 3 of 4 issue types repaired).

### Strengths
- `src/lib/index.ts:42` — clean separation between detection and repair phases makes both independently testable.
- `tests/index.test.ts:1-180` — real database fixtures, no mocks. Covers all 4 issue types end-to-end.

### Findings

#### Critical
- **Concurrent `repairIndex()` calls corrupt the index** — `src/lib/index.ts:88`
  - What: No file lock around the read-modify-write cycle. Two concurrent invocations interleave writes.
  - Why: CLI is documented as safe to run from cron + manually; this lets the cron path race a manual run and lose updates.
  - Fix: Wrap the write phase in `withFileLock(indexPath, async () => { ... })` using the existing helper in `src/lib/lock.ts`.

#### Important
- **Issue type "orphaned-ref" is detected but not repaired** — `src/lib/index.ts:134`
  - What: `verifyIndex()` reports the type, `repairIndex()` has no branch for it. Spec lists 4 types; only 3 are repaired.
  - Why: Misleads operators — running `repair` "succeeds" but leaves orphan refs.
  - Fix: Either implement the branch or fail loudly when the type is encountered (`throw new UnsupportedIssue(...)`).

#### Suggestion
- **Magic number `100` for progress reporting interval** — `src/lib/index.ts:130`
  - Extract to a named constant; consider making it a CLI flag for large indexes.

#### Nit
- `src/lib/index.ts:55` — `let result =` could be `const result =` (never reassigned).

### Verification
- [x] Tests pass (`pnpm test src/lib/index.test.ts`)
- [x] Build succeeds (`pnpm build`)
- [ ] Manual repair on a corrupted fixture — not run

### Verdict
- [ ] **Approve**
- [x] **Approve with fixes** — Critical / Important resolvable in this round
- [ ] **Request changes**

**Reasoning:** Architecture and tests are solid. Locking gap and missing fourth-issue branch are localized fixes; once those land this is ready to merge.
```
