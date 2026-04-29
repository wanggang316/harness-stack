# Code Review Brief

**Your task:**

1. Run the spec compliance pass against the diff below.
2. Review the diff across correctness, readability, architecture, security, and performance.
3. Categorize every finding with severity + `file:line` + what / why / fix.
4. Emit the report in the Output Format below.
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

## Output Format

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

## Example Output

```markdown
## Review: Add task verification and repair

**Range:** `a7981ec..3df7661` — 4 files, +312 / −18
**Spec:** docs/specs/conversation-index.md
**Scope:** CLEAN
  - Intent: Verify index integrity and repair drift introduced by 0041 migration.
  - Delivered: `verifyIndex()` walks the index, `repairIndex()` reconciles 4 issue types, both wired into the CLI.
  - Plan items: A DONE, B DONE, C PARTIAL (only 3 of 4 issue types repaired).

### Strengths
- Clean separation between detection and repair phases makes both independently testable (`src/lib/index.ts:42`).
- Real database fixtures, no mocks — covers all 4 issue types end-to-end (`tests/index.test.ts:1-180`).

### Issues

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
