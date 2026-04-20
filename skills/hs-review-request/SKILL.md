---
name: hs-review-request
description: Dispatches a fresh-context code reviewer. Use when you are the author and want another agent or model to review your change before merge. Use after finishing an ExecPlan task or before opening a PR, especially for security-sensitive or architecturally significant changes.
---

# Request Code Review

## Overview

You (the author) dispatch a reviewer subagent with a precise brief so it evaluates the diff — not your session history. Self-review in the same thread inherits your assumptions; fresh context catches what you missed.

## When to Use

- Before opening or merging a PR.
- After `hs-exec-plan` completes an ExecPlan task or batch.
- After a non-trivial feature, bug fix, or refactor.
- When the change touches security-sensitive paths, auth, or data migrations.
- When you are about to ship AI-generated code — it needs more scrutiny, not less.

**When NOT to dispatch:**

- Trivial changes where the diff is self-evident (typo fix, variable rename in a single file).
- Auto-generated code or lockfile bumps where a reviewer cannot add value.
- After two rounds on the same diff with the reviewer — stop and escalate to the human.

## Process

### Step 1. Pin the diff range

```bash
BASE_SHA=$(git merge-base HEAD origin/main)   # or the PR base
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat "$BASE_SHA..$HEAD_SHA"
```

If the change spans multiple commits, confirm the base matches what the reviewer should see. Don't leave the reviewer to guess.

### Step 2. Write the brief

The reviewer must start with fresh context. Do not pipe your session history in. Pass only:

- `BASE_SHA` / `HEAD_SHA` — the diff range.
- **Spec / ExecPlan path** — e.g. `docs/specs/<feature>.md` or the ExecPlan driving the work.
- **Summary** — one paragraph on what was implemented.
- **Focus areas** — axes or files that deserve extra scrutiny.

Brief template:

```
Review range: <BASE_SHA>..<HEAD_SHA>
Spec:         docs/specs/<x>.md
Summary:      <one paragraph on what was built>
Focus:        <axes or files that deserve extra scrutiny>
Output:       follow the template in skills/hs-review/SKILL.md § "Output Template"
```

### Step 3. Dispatch

Invoke the `Task` tool with the `code-reviewer` subagent (see `agents/code-reviewer.md`). Paste the brief as the prompt.

### Step 4. Act on the report

The reviewer returns findings labeled **Critical / Important / Suggestion / Nit / FYI**.

| Severity | Your action |
|---|---|
| Critical | Resolve before merge — no exceptions. |
| Important | Resolve before merge, or document a deferral with a tracked follow-up. |
| Suggestion | Consider; file a follow-up if deferred. |
| Nit | Author discretion. |
| FYI | No action. |

## The Round-Trip

```
Author agent  → implements
     ↓
hs-review-request (this skill)  → dispatches reviewer with brief
     ↓
Reviewer subagent (fresh context)  → runs hs-review (conduct)
     ↓
Author agent  → hs-review-receive (apply findings)
     ↓
Human  → final call
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I wrote it and I know it works — I'll self-review." | Authors are blind to their own assumptions. Fresh context catches what you missed. |
| "The reviewer already has context from this session." | A reviewer that inherits your thread inherits your blind spots. Start fresh. |
| "AI generated this, it's probably fine." | AI code needs more scrutiny, not less — it is confident and plausible even when wrong. |
| "The change is small, skip the reviewer." | Small changes in security-sensitive paths still need scrutiny. Size is not the discriminator. |
| "I'll dispatch again after one more tweak." | Dispatching before the previous round's Critical / Important is resolved wastes reviewer capacity. |
| "The spec is in my head, no need to attach it." | A reviewer without the spec cannot evaluate correctness — only style. |

## Red Flags

- Dispatching the reviewer without a spec or ExecPlan to ground the review.
- Re-dispatching before the previous round's Critical / Important findings are resolved.
- Sending the reviewer a diff that spans two unrelated changes — split the change first (`skills/hs-git/SKILL.md`).
- Copying your session history into the brief — that defeats fresh context.

## Verification

Before marking a request-round complete:

- [ ] Every Critical finding is resolved.
- [ ] Every Important finding is resolved or has a tracked deferral.
- [ ] Response discipline was followed (`hs-review-receive`).
- [ ] Tests pass, build succeeds, and the verification story is attached to the PR or ExecPlan.

## See Also

- `skills/hs-review/SKILL.md` — reviewer-side: five axes, output template, quality bar.
- `skills/hs-review-receive/SKILL.md` — how to handle the reviewer's feedback.
- `agents/code-reviewer.md` — reviewer subagent definition.
- `skills/hs-git/SKILL.md` — change sizing and splitting strategies.
