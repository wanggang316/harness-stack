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

### Step 2. Pick the lanes

`code-reviewer` is the default lane and runs every time. Add parallel lanes when the diff hits territory that benefits from a specialist pass. Lanes run in parallel — fan out in a single dispatch round, not sequentially.

| Lane | Agent | Trigger |
|---|---|---|
| Code | `agents/code-reviewer.md` | Always. Five-axis review. |
| Security | `agents/security-auditor.md` | Diff touches auth, sessions, tokens, user input, secrets, crypto, raw queries, shell/`eval`, dependency upgrades, or LLM output that flows into DB / external HTTP / code execution. |
| Tests | `agents/test-engineer.md` | Diff is a bug fix (regression test required), changes a critical business path, modifies test infrastructure, or the spec demands a coverage target. |

Heuristics:

- **Auth / payments / data migrations** → at least Code + Security.
- **AI agent / LLM tool calling / RAG** → at least Code + Security (LLM trust boundary).
- **Bug fix** → at least Code + Tests (Prove-It pattern).
- **Pure refactor with high test coverage already** → Code only is fine.
- **Trivial change** (typo, single-file rename) → no review needed; see "When NOT to dispatch" above.

Don't dispatch a lane "just in case." Each lane is reviewer capacity that has to come back with usable findings.

### Step 3. Write the brief

The reviewer must start with fresh context. Do not pipe your session history in. Pass only:

- `BASE_SHA` / `HEAD_SHA` — the diff range.
- **Spec / ExecPlan path** — e.g. `docs/specs/<feature>.md` or the ExecPlan driving the work.
- **Summary** — one paragraph on what was implemented.
- **Focus areas** — axes or files that deserve extra scrutiny.
- **Lanes** — the lanes selected in Step 2 and why.

Brief template:

```
Review range: <BASE_SHA>..<HEAD_SHA>
Spec:         docs/specs/<x>.md
Summary:      <one paragraph on what was built>
Focus:        <axes or files that deserve extra scrutiny>
Lanes:        code | code+security | code+tests | code+security+tests
              (one line per lane explaining why it was chosen)
Output:       follow the template in skills/hs-review/SKILL.md § "Output Template"
```

### Step 4. Dispatch

Invoke the `Task` tool **once per lane, in the same round** so the lanes run in parallel:

- Code lane → subagent type `code-reviewer` (`agents/code-reviewer.md`).
- Security lane → subagent type `security-auditor` (`agents/security-auditor.md`).
- Tests lane → subagent type `test-engineer` (`agents/test-engineer.md`).

Paste the brief as the prompt for each. The brief is identical across lanes; each agent applies its own checklist and emits the shared Output Template.

### Step 5. Merge and act on the reports

Each lane returns findings labeled **Critical / Important / Suggestion / Nit / FYI**.

When multiple lanes ran, merge before responding:

1. **Dedupe** — the same `file:line` flagged by two lanes counts as one finding; keep the more specific framing (security wording over generic).
2. **Reconcile severity** — if lanes disagree, take the higher severity unless one lane explicitly cites why the other is wrong (e.g., security-auditor: "not exploitable because input is constrained at <file:line>").
3. **Note conflicts** — if lanes disagree on whether something is a bug, surface that to the human; do not silently pick a side.

| Severity | Your action |
|---|---|
| Critical | Resolve before merge — no exceptions. |
| Important | Resolve before merge, or document a deferral with a tracked follow-up. |
| Suggestion | Consider; file a follow-up if deferred. |
| Nit | Author discretion. |
| FYI | No action. |

Round budget: **two rounds per lane**. If a lane is still raising Critical / Important findings on the third round, stop dispatching and escalate to a human — either the change needs splitting, or the spec is wrong.

## The Round-Trip

```
Author agent  → implements
     ↓
hs-review-request (this skill)  → picks lanes, dispatches in parallel with shared brief
     ↓
Lane subagents (fresh context, parallel)  → each runs hs-review (conduct)
  ├─ code-reviewer       (always)
  ├─ security-auditor    (when triggered)
  └─ test-engineer       (when triggered)
     ↓
Author agent  → merges reports, runs hs-review-receive (apply findings)
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
- Dispatching every lane on every change ("more reviewers can't hurt") — wastes capacity and dilutes signal. Match the lane to the diff.
- Auth or LLM-trust-boundary changes that go out without the security lane.
- Bug fixes that go out without the test lane (no regression test = bug will return).

## Verification

Before marking a request-round complete:

- [ ] Every Critical finding is resolved.
- [ ] Every Important finding is resolved or has a tracked deferral.
- [ ] Response discipline was followed (`hs-review-receive`).
- [ ] Tests pass, build succeeds, and the verification story is attached to the PR or ExecPlan.

## See Also

- `skills/hs-review/SKILL.md` — reviewer-side: five axes, spec compliance pass, output template, quality bar.
- `skills/hs-review-receive/SKILL.md` — how to handle the reviewer's feedback.
- `agents/code-reviewer.md` — code lane subagent definition (default).
- `agents/security-auditor.md` — security lane subagent definition.
- `agents/test-engineer.md` — tests lane subagent definition.
- `docs/references/review-checklist.md` — pattern dictionary the reviewer applies.
- `skills/hs-git/SKILL.md` — change sizing and splitting strategies.
