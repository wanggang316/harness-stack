---
name: hs-review
description: Conducts multi-axis code review and emits a structured report. Use when you are the reviewer evaluating a diff — whether invoked as the code-reviewer subagent, self-reviewing before a PR, or checking another agent's output across correctness, readability, architecture, security, and performance.
---

# Conduct Code Review

## Overview

You are the reviewer. Evaluate the diff across five axes and emit a structured report that the author can act on. Do not rubber-stamp. Do not soften real issues. Every finding cites `file:line` with what + why + fix.

**Approval standard.** Approve when the change definitely improves overall code health, even if imperfect. Don't block because it isn't how you would have written it — block on correctness, security, architecture, or clear readability regressions.

## When to Use

- Invoked as the `code-reviewer` subagent via `hs-review-request` (see `agents/code-reviewer.md`).
- Self-reviewing your own diff before opening a PR (fresh-eyes pass — after a break, not in the same train of thought).
- Evaluating code produced by another agent or model.
- Reviewing another engineer's PR.

For the author-side dispatch and feedback-handling discipline, see `hs-review-request` and `hs-review-receive`.

## The Five Axes

### 1. Correctness

- Matches the spec / task / ExecPlan.
- Edge cases handled (null, empty, boundary values).
- Error paths handled, not just the happy path.
- Tests test behavior, not the mock.
- No off-by-one, race conditions, or state inconsistencies.

### 2. Readability & Simplicity

- Names reveal intent; no `temp` / `data` / `result` without context.
- Straightforward control flow; no nested ternaries, deep callbacks, clever tricks.
- Could this be done in fewer lines? (1000 lines where 100 would do is a failure.)
- Abstractions earn their complexity (don't generalize until the third use case).
- Comments explain *why*, not *what*.
- No dead-code artifacts: `_unused` no-ops, backwards-compat shims, `// removed` comments.

### 3. Architecture

- Follows existing patterns, or introduces a new one with justification.
- Clean module boundaries; dependencies flow in the right direction; no cycles.
- No god objects or god functions.
- Abstraction level is appropriate — not over-engineered, not tightly coupled.

### 4. Security

Apply `docs/references/security-checklist.md`. For deeper threat modeling, consult the `hs-security` skill.

- User input validated at boundaries.
- Secrets kept out of code, logs, and version control.
- Auth / authorization checked where needed.
- SQL parameterized; outputs encoded to prevent XSS.
- External data (APIs, files, user content, config) treated as untrusted.

### 5. Performance

Apply `docs/references/performance-checklist.md`.

- No N+1 query patterns.
- No unbounded loops or unconstrained data fetching.
- No sync operations that should be async.
- No unnecessary re-renders in UI components.
- No missing pagination on list endpoints.
- No large objects created in hot paths.

## Severity Labels

| Prefix | Meaning | Author Action |
|--------|---------|---------------|
| **Critical:** | Blocks merge | Security vulnerability, data loss, broken functionality |
| **Important:** | Should fix before merge | Design flaws, missing error handling, test gaps |
| **Suggestion:** | Worth considering | Better patterns, readability improvements |
| **Nit:** | Author may ignore | Formatting, minor naming preference |
| **FYI:** | No action needed | Context for future reference |

Every finding must include **file:line + what + why**. "LGTM" without citations is not a review.

## Process

0. **Spec compliance first.** Before opening the diff for quality review, verify the change does what it was asked to do. List each requirement from the spec / ExecPlan / PR description and cross-reference it against the diff.
   - Read spec / ExecPlan / PR description and extract every requirement (checkbox items, numbered steps, imperative statements, test requirements, migration items).
   - For each requirement, classify against the diff: **DONE** (clear evidence in diff) / **PARTIAL** (started, incomplete) / **NOT DONE** (no evidence) / **CHANGED** (different approach, same goal).
   - Run `git diff --stat <BASE>..<HEAD>` and check files changed against stated intent. Files unrelated to the intent are **scope creep**.
   - Emit a one-line `Scope:` summary at the top of the report (see Output Template).
   - This pass is **informational and does not block** the five-axis review, but it must surface in the Verdict reasoning. Approving a change that misses requirements is dishonest.
1. **Context.** Confirm understanding of the intended behavior from spec / ExecPlan / PR description.
2. **Tests first.** Tests reveal intent and coverage. Ask: do they test behavior, cover edges, and catch regressions?
3. **Walk the diff.** For each file, apply the five axes. Use `docs/references/review-checklist.md` as a pattern dictionary for high-leverage categories (SQL safety, LLM trust boundary, enum completeness, race conditions, type coercion, magic numbers).
4. **Categorize and cite.** Every finding gets a severity label and a `file:line` pointer.
5. **Verify verification.** Did tests run? Build pass? Is there manual / screenshot / benchmark evidence where it matters?

### Read code outside the diff when required

Some categories cannot be evaluated by reading only the diff hunks:

- **Enum & value completeness** — when the diff adds a new enum value, status, tier, or type constant, Grep for sibling values and Read every consumer. Default-branch fall-through is a common silent miss.
- **Backward-compat shims** — when the diff changes a public function signature, find callers and verify they were updated.
- **Test coverage** — when the diff modifies a critical path, check whether the test file actually exercises the new branches (not just the file).

`hs-review-receive` enforces the symmetric rule on the author side.

## Output Template

Emit the review in this shape so the author (and downstream tooling) can parse it:

```markdown
## Review: <title / PR link>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Spec:** `docs/specs/<x>.md` (or ExecPlan path)
**Scope:** CLEAN | DRIFT | MISSING REQUIREMENTS
  - Intent: <one-line summary of what was requested>
  - Delivered: <one-line summary of what the diff does>
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
- [ ] **Approve with fixes** — Critical / Important all resolvable in this round
- [ ] **Request changes** — Issues must be addressed

**Reasoning:** <1–2 sentences>
```

## Quality Bar for the Report

- Every finding cites `file:line`. No "somewhere in the module".
- Every finding states a concrete downside, not "could be better".
- Quantify when possible: `N+1 adds ~50ms per item at 100 items` beats `may be slow`.
- Don't mark Nits as Critical. Don't mark bugs as Nits.
- Acknowledge strengths — reviews are not only negative.
- Comment on code, not people.

## Honesty

- **Don't rubber-stamp.** `LGTM` without evidence helps no one.
- **Don't soften real issues.** `This might be a minor concern` when it's a production bug is dishonest.
- **Push back on approaches with clear problems.** If the implementation has issues, say so and propose alternatives.
- **Accept override gracefully.** If the author has full context and disagrees with reasoning, defer. Comment on code, not people.

## Dependency Review

When the diff adds a dependency, run a mini review of the dep itself:

1. Does the existing stack already solve this?
2. How large is it (install / bundle impact)?
3. Actively maintained (last commit, open-issue age)?
4. Known vulnerabilities (`npm audit` / `pip-audit` / etc.)?
5. License compatible with the project?

Default: prefer standard library and existing utilities. Every dependency is a liability.

## Handling Disagreements

When an author pushes back:

1. Technical facts and measured data override opinions.
2. Style guides are authoritative for style matters.
3. Evaluate design on engineering principles, not personal taste.
4. Codebase consistency is acceptable if it doesn't degrade overall health.

Don't accept "I'll clean it up later." If cleanup can't land in this change, require a tracked follow-up (issue or ExecPlan task) with a self-assigned owner.

## Review Speed

- Respond to a review request **within one business day** — maximum, not target.
- A typical change should complete multiple rounds in a single day.
- Prioritize fast individual responses over a slow final approval.
- If the change is too large to review in one sitting, ask the author to split it (see `skills/hs-git/SKILL.md`) rather than reviewing poorly.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works, that's good enough" | Working code that's unreadable or insecure creates compounding debt. |
| "I wrote it, so I know it's correct" | Authors are blind to their own assumptions. |
| "We'll clean it up later" | Later never comes. Review is the quality gate. |
| "AI-generated code is probably fine" | AI code needs more scrutiny, not less — it is confident and plausible even when wrong. |
| "The tests pass, so it's good" | Tests are necessary, not sufficient. They don't catch architecture, security, or readability issues. |

## Red Flags

- Reviews that only check whether tests pass.
- `LGTM` without `file:line` citations.
- Security-sensitive changes without a security-focused pass.
- PRs "too big to review properly" (ask the author to split).
- Bug fixes without regression tests.
- Findings without severity labels.
- Rating bugs as Nits, or style preferences as Critical.

## Verification

Review is complete when:

- [ ] Spec compliance pass produced a `Scope:` summary (CLEAN / DRIFT / MISSING).
- [ ] Every finding has a severity label and a `file:line` citation.
- [ ] All five axes have been considered and named in the report (even if a section has no findings).
- [ ] Strengths section is populated with at least one specific observation.
- [ ] Verdict is one of {Approve, Approve with fixes, Request changes} with reasoning.
- [ ] If performance or security concerns exist, evidence is quantified or cited.

## See Also

- `skills/hs-review-request/SKILL.md` — author side: how to dispatch the reviewer (and parallel security / test lanes).
- `skills/hs-review-receive/SKILL.md` — author side: how to handle your findings.
- `agents/code-reviewer.md` — reviewer subagent definition (input contract and output format).
- `agents/security-auditor.md` — security-focused parallel reviewer.
- `agents/test-engineer.md` — test-coverage-focused parallel reviewer.
- `docs/references/review-checklist.md` — high-leverage pattern dictionary (SQL safety, LLM trust boundary, enum completeness, race conditions).
- `docs/references/security-checklist.md` — OWASP-aligned security baseline.
- `docs/references/performance-checklist.md` — performance review checks.
- `skills/hs-security/SKILL.md` — deeper security review and hardening.
- `skills/hs-git/SKILL.md` — change sizing and splitting strategies for oversized PRs.
