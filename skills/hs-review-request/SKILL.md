---
name: hs-review-request
description: Dispatches a fresh-context code-reviewer subagent before merge. Use when you (the author) finish a non-trivial change and need code scrutiny — pin the diff range, fill the brief template, dispatch via Task, and hand findings off for application.
---

# Request Code Review

## Overview

You are the author. Dispatch a fresh-context code-reviewer subagent to catch issues before merge. The reviewer sees only the diff, the spec, and the brief — never your session history. Fresh context catches what you missed.

The reviewer methodology lives self-contained inside the agent (`agents/code-reviewer.md`). The brief template in this folder turns that methodology into a fillable prompt.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**

- Before opening or merging a PR.
- After `hs-exec-plan` completes an ExecPlan task or batch.
- After a non-trivial feature, bug fix, or refactor.
- When you are about to ship AI-generated code — it needs more scrutiny, not less.

**When NOT to dispatch:**

- Trivial changes where the diff is self-evident (typo, single-file rename).
- Auto-generated code or lockfile bumps where a reviewer cannot add value.
- After two rounds on the same diff with the reviewer — stop and escalate to the human.

## How to Request

### 1. Pin the diff range

```bash
BASE_SHA=$(git merge-base HEAD origin/main)   # or the PR base
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA..$HEAD_SHA"
```

If the change spans multiple commits, confirm the base matches what the reviewer should see. Don't leave the reviewer to guess.

### 2. Fill the brief template

Open `skills/hs-review-request/code-reviewer.md` and fill the placeholders:

| Placeholder | What to put |
|---|---|
| `{DESCRIPTION}` | One paragraph on what was implemented. |
| `{SPEC_PATH}` | Path to spec / ExecPlan / PR description, e.g. `docs/specs/<feature>.md`. |
| `{BASE_SHA}` | The base SHA from step 1. |
| `{HEAD_SHA}` | The head SHA from step 1. |
| `{FOCUS_AREAS}` | Files or axes that deserve extra scrutiny. |
| `{NOTES}` | Anything the reviewer needs to know that isn't in the diff (constraints, prior decisions, known limitations). |

The brief is the user-message prompt for the subagent. It is intentionally lean — the methodology lives in the agent's system prompt.

### 3. Dispatch

```
Task(subagent_type="code-reviewer", prompt=<filled code-reviewer.md>)
```

The subagent runs in fresh context (independent window, no inherited session state).

### 4. Hand off the report

The reviewer returns findings labeled with the severity vocabulary below. Hand the report to `hs-review-receive` for application.

## Severity Vocabulary

The reviewer emits findings labeled with these prefixes. Use them when triaging the report.

| Prefix | Author action |
|---|---|
| **Critical** | Resolve before merge — no exceptions. |
| **Important** | Resolve before merge, or document a deferral with a tracked follow-up. |
| **Suggestion** | Consider; file a follow-up if deferred. |
| **Nit** | Author discretion. |
| **FYI** | No action. |

If the reviewer emits findings without severity labels or `file:line` citations, that's a defective report — push back rather than acting on it.

## Round Budget and Escalation

**Two rounds.** If the reviewer is still raising Critical / Important findings on the third round, stop dispatching and escalate to a human:

- The change may need splitting (see `skills/hs-git/SKILL.md`).
- The spec may be wrong or under-specified.
- The reviewer and author may have an unresolved technical disagreement that needs a third party.

Re-dispatching before the previous round's Critical / Important findings are resolved wastes reviewer capacity and dilutes signal.

## Example

```
[Just completed Task 2: Add verification function]

You: Let me request code review before proceeding.

BASE_SHA=$(git merge-base HEAD origin/main)
HEAD_SHA=$(git rev-parse HEAD)
# BASE_SHA=a7981ec, HEAD_SHA=3df7661

[Dispatch code-reviewer with filled brief from skills/hs-review-request/code-reviewer.md]
  DESCRIPTION:  Verification and repair functions for conversation index
  SPEC_PATH:    docs/specs/conversation-index.md
  BASE_SHA:     a7981ec
  HEAD_SHA:     3df7661
  FOCUS_AREAS:  Concurrency on repairIndex(), error path on verifyIndex()
  NOTES:        Migration from prior schema in db/0041; no rollback path.

[Subagent returns]:
  Strengths:    Clean architecture, real tests
  Important:    Missing progress indicators
  Suggestion:   Magic number (100) for reporting interval
  Verdict:      Approve with fixes

You: Hand off to hs-review-receive to apply findings.
```

## The Round-Trip

```
Author → implements
   ↓
hs-review-request (this skill) → fills brief, dispatches code-reviewer
   ↓
code-reviewer (fresh context)
   ↓
Author → runs hs-review-receive (apply findings)
   ↓
Human → final call
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I wrote it and I know it works — I'll self-review." | Authors are blind to their own assumptions. Fresh context catches what you missed. |
| "The reviewer already has context from this session." | A reviewer that inherits your thread inherits your blind spots. Start fresh. |
| "AI generated this, it's probably fine." | AI code needs more scrutiny, not less — it is confident and plausible even when wrong. |
| "The change is small, skip the reviewer." | Small changes in critical paths still need scrutiny. Size is not the discriminator. |
| "The brief is in my session — the reviewer can read it." | A reviewer in a fresh context has none of your session. Fill the template explicitly. |

## Red Flags

- Dispatching the reviewer without a spec or ExecPlan to ground the review.
- Re-dispatching before the previous round's Critical / Important findings are resolved.
- Sending the reviewer a diff that spans two unrelated changes — split first (`skills/hs-git/SKILL.md`).
- Copying your session history into the brief — that defeats fresh context.

## Verification

Before handing off to `hs-review-receive`:

- [ ] Brief includes `BASE_SHA`, `HEAD_SHA`, spec path, description, focus, notes.
- [ ] Reviewer returned a structured report with severity labels and `file:line` citations.
- [ ] Verdict is one of Approve / Approve with fixes / Request changes.

## See Also

- `skills/hs-review-receive/SKILL.md` — apply the reviewer's findings with technical rigor.
- `agents/code-reviewer.md` — the code-reviewer subagent.
- `skills/hs-git/SKILL.md` — change sizing and splitting strategies.
- `code-reviewer.md` (this folder) — fill and pass to the `code-reviewer` subagent.
