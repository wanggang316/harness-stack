---
name: hs-review
description: Conducts multi-axis code review. Use before merging any change. Use when reviewing code written by yourself, another agent, or a human. Use when you need to assess code quality across multiple dimensions before it enters the main branch.
---

# Code Review and Quality

## Overview

Multi-dimensional code review with quality gates. Every change gets reviewed before merge — no exceptions.

This skill covers three modes of a review round-trip:

1. **Request** — Author dispatches a reviewer with precise context.
2. **Conduct** — Reviewer evaluates across five axes and emits a structured report.
3. **Receive** — Author verifies feedback before implementing, without performative agreement.

**Approval standard.** Approve when the change definitely improves overall code health, even if imperfect. Don't block because it isn't how you would have written it — block on correctness, security, architecture, or clear readability regressions.

## When to Use

- Before merging any PR or change.
- After `hs-exec-plan` completes an ExecPlan task or batch.
- After a feature implementation or bug fix (review both the fix and its regression test).
- When another agent or model produced code you need to evaluate.
- When refactoring existing code.

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

---

## Mode 1 — Request Review

Use when you (as the author) want a fresh-context reviewer instead of self-reviewing in the same thread.

### Step 1. Pin the diff range

```bash
BASE_SHA=$(git merge-base HEAD origin/main)   # or the PR base
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA..$HEAD_SHA"
```

### Step 2. Dispatch the reviewer subagent

Use the `Task` tool with the `code-reviewer` subagent (see `agents/code-reviewer.md`). The reviewer must start with **fresh context** — do not pipe your session history in. Pass only:

- `BASE_SHA` / `HEAD_SHA` — the diff range.
- **Spec / ExecPlan path** — e.g. `docs/specs/<feature>.md` or the ExecPlan driving the work.
- **What was implemented** — one-paragraph summary.
- **Focus areas** — e.g. "security (accepts user input) + performance (DB reads in a loop)".

Minimal brief template:

```
Review range: <BASE_SHA>..<HEAD_SHA>
Spec:         docs/specs/<x>.md
Summary:      <one paragraph on what was built>
Focus:        <axes or files that deserve extra scrutiny>
Output:       follow the template in skills/hs-review/SKILL.md § "Output Template"
```

### Step 3. Act on the report

- Resolve every **Critical** immediately. Never merge with Critical open.
- Resolve every **Important**, or document a deferral with justification and a tracked follow-up.
- Consider **Suggestion**; file follow-ups if deferred.
- Ignore **Nit** at author discretion.

Do not re-dispatch the reviewer until the previous round's findings are resolved.

---

## Mode 2 — Conduct Review

Use when you are the reviewer (invoked as the `code-reviewer` subagent, or self-reviewing before a PR).

### Process

1. **Context first.** Read the spec / ExecPlan / PR description. Understand the intended behavior before opening the diff.
2. **Tests first.** Tests reveal intent and coverage. Ask: do they test behavior, cover edges, and catch regressions?
3. **Walk the diff.** For each file, apply the five axes.
4. **Categorize and cite.** Every finding gets a severity label and `file:line` pointer.
5. **Verify verification.** Did tests run? Build pass? Is there manual / screenshot / benchmark evidence where it matters?

### Output Template

Emit the review in this shape so the author (and downstream tooling) can parse it:

```markdown
## Review: <title / PR link>

**Scope:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Spec:** `docs/specs/<x>.md` (or ExecPlan path)

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
- [ ] **Approve with fixes** — Critical/Important all resolvable in this round
- [ ] **Request changes** — Issues must be addressed

**Reasoning:** <1–2 sentences>
```

### Quality Bar for the Report

- Every finding cites `file:line`. No "somewhere in the module".
- Every finding states a concrete downside, not "could be better".
- Quantify when possible: "N+1 adds ~50ms per item at 100 items" beats "may be slow".
- Don't mark Nits as Critical. Don't mark bugs as Nits.
- Acknowledge strengths — reviews are not only negative.

---

## Mode 3 — Receive Review

Use when the author gets review feedback back.

### The Response Pattern

```
1. READ    — absorb the full report before reacting.
2. RESTATE — restate each requirement in your own words, or ask.
3. VERIFY  — check the claim against the current codebase.
4. DECIDE  — accept, push back with reasoning, or ask for clarification.
5. APPLY   — implement one item at a time; test after each.
```

### No Performative Agreement

- Forbidden: "You're absolutely right!", "Great catch!", "Thanks for the feedback!".
- Preferred: state the fix or push back.
  - `Fixed — added null guard at task.ts:42.`
  - `Checked — endpoint unused, removing rather than "implementing properly" (YAGNI).`

Actions speak. Gratitude is noise; a green diff is the signal.

### Verify Before Implementing

Before accepting a finding, check:

1. Is it technically correct **for this codebase**?
2. Does fixing it break existing functionality or tests?
3. Is there a reason the current implementation is that way (legacy, compatibility, explicit decision)?
4. Does the reviewer have full context, or is this based on a partial read?

If any check fails, push back with technical reasoning — not defensiveness. Cite code, tests, or prior decisions.

### YAGNI Check

If the reviewer asks you to "implement properly" a feature that isn't actually used:

```bash
grep -rn "functionName\|/endpoint/path" src/
```

If unused, propose deletion instead of expansion.

### Handle Unclear Feedback

If any item is unclear, **stop and ask before implementing anything**. Partial understanding produces wrong partial implementations, and the next round has to undo them.

### Implementation Order

1. Clarify unclear items.
2. Blocking issues (breaks build, security, data loss).
3. Simple fixes (typos, imports, renames).
4. Complex fixes (refactors, logic changes).
5. Test each fix individually — no batching without verification.

### If You Pushed Back and Were Wrong

State it factually and move on. No long apology; no defending the pushback.

> "You were right — checked `x.ts:120` and the call does return nullable. Fixing now."

---

## Multi-Agent Review Pattern

Different agents have different blind spots. Use this pattern when the change is large, critical, or security-sensitive:

```
Author agent  → implements
     ↓
Reviewer subagent (fresh context, code-reviewer)  → reviews
     ↓
Author agent  → addresses feedback (Mode 3)
     ↓
Human  → final call
```

The key is **fresh context**: the reviewer must not inherit the author's session history — only the diff, the spec, and the review brief.

---

## Dependency Review

Any change that adds a dependency gets a mini review of its own:

1. Does the existing stack solve this already?
2. How large is it (install / bundle impact)?
3. Actively maintained (last commit, open-issue age)?
4. Known vulnerabilities (`npm audit` / `pip-audit` / etc.)?
5. License compatible with the project?

Default: prefer standard library and existing utilities. Every dependency is a liability.

---

## Review Speed

- Respond to a review request **within one business day** — maximum, not target.
- A typical change should complete multiple review rounds in a single day.
- Prioritize fast individual responses over a slow final approval.
- If the change is too large to review in one sitting, ask the author to split it — see `skills/hs-git/SKILL.md` for sizing and splitting guidance.

---

## Handling Disagreements

1. Technical facts and measured data override opinions.
2. Style guides are authoritative for style matters.
3. Evaluate design on engineering principles, not personal taste.
4. Codebase consistency is acceptable if it doesn't degrade overall health.

Don't accept "I'll clean it up later." If cleanup can't land in this change, require a tracked follow-up (issue or ExecPlan task) with a self-assigned owner.

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works, that's good enough" | Working code that's unreadable or insecure creates compounding debt. |
| "I wrote it, so I know it's correct" | Authors are blind to their own assumptions. |
| "We'll clean it up later" | Later never comes. Review is the quality gate. |
| "AI-generated code is probably fine" | AI code needs more scrutiny, not less — it is confident and plausible even when wrong. |
| "The tests pass, so it's good" | Tests are necessary, not sufficient. They don't catch architecture, security, or readability issues. |

## Red Flags

- PRs merged without any review.
- "LGTM" without `file:line` citations.
- Reviews that only check whether tests pass.
- Security-sensitive changes without a security-focused pass.
- PRs "too big to review properly" (split them — see `hs-git`).
- Bug fixes without regression tests.
- Findings without severity labels.
- Authors replying "You're absolutely right!" and implementing without verification.

## Verification

Review is complete when:

- [ ] Every Critical is resolved.
- [ ] Every Important is resolved or has a tracked deferral.
- [ ] Every finding cites `file:line` + what + why.
- [ ] Tests pass, build succeeds, manual / perf evidence attached where applicable.
- [ ] The verification story is documented in the PR or the ExecPlan.

## See Also

- `docs/references/security-checklist.md` — security review checks
- `docs/references/performance-checklist.md` — performance review checks
- `agents/code-reviewer.md` — reviewer subagent definition
- `skills/hs-git/SKILL.md` — change sizing, splitting, commit and PR descriptions
- `skills/hs-security/SKILL.md` — deeper security review and hardening
