---
name: hs-review-receive
description: Handles code review feedback with technical rigor instead of performative agreement. Use when you (the author) receive review findings from a reviewer, a human, or your own earlier self-review. Use especially when a finding seems unclear or technically questionable.
---

# Receive Code Review

## Overview

Code review requires technical evaluation, not emotional performance. Verify before implementing. Ask before assuming. Technical correctness over social comfort.

A reviewer's finding is a claim about the codebase at a point in time. It may be right, partially right, or wrong for this context. Your job is to evaluate each claim, not to perform agreement.

## When to Use

- Immediately after a reviewer (human or subagent from `hs-review-request`) returns findings.
- When a human teammate leaves PR comments.
- When a tool (linter, security scanner, CI) flags issues you need to triage.
- When you re-read your own change the next morning and spot problems — apply the same discipline to yourself.

## The Response Pattern

```
1. READ    — absorb the full report before reacting. No item-by-item responses.
2. RESTATE — restate each requirement in your own words, or ask.
3. VERIFY  — check the claim against the current codebase.
4. DECIDE  — accept, push back with reasoning, or ask for clarification.
5. APPLY   — implement one item at a time; test after each.
```

Items are often related. Partial understanding produces wrong partial implementations that the next round has to undo.

## No Performative Agreement

Forbidden responses — they add no information and hide the actual technical decision:

- "You're absolutely right!"
- "Great catch!"
- "Excellent feedback!"
- "Thanks for catching that!"
- "Let me implement that now" — before verification.

Preferred responses — state the fix, or push back:

- `Fixed — added null guard at task.ts:42.`
- `Fixed in tasks.ts:88-95; regression test in tasks.test.ts:120.`
- `Checked — endpoint unused, removing rather than "implementing properly" (YAGNI).`
- `Disagree — tests at auth.test.ts:55-72 cover this path; the current guard is intentional. Happy to add a comment.`

Actions speak. A green diff is the signal; gratitude is noise.

## Verify Before Implementing

Before accepting a finding, check:

1. Is it technically correct **for this codebase** (not for the reviewer's mental model of a generic codebase)?
2. Does fixing it break existing functionality or tests?
3. Is there a reason the current implementation is that way — legacy, compatibility, explicit prior decision?
4. Does the reviewer have full context, or is this based on a partial read of the diff?

If any check fails, push back with technical reasoning. Cite code (`file:line`), tests, or prior decisions — not opinions.

## When to Push Back

- Suggestion breaks existing functionality.
- Reviewer lacks full context (didn't see the spec / ExecPlan).
- Violates YAGNI (proposes features the codebase doesn't actually use).
- Technically incorrect for this stack, platform, or target version.
- Legacy / compatibility reasons that the reviewer couldn't know.
- Conflicts with prior architectural decisions.

### How to push back

- Use technical reasoning, not defensiveness.
- Cite specifics: `file:line`, test names, commit SHAs, design docs.
- If architectural, escalate to the human — don't adjudicate alone.
- If you cannot easily verify, say so: `Can't verify without <X>. Investigate, ask, or proceed?`

## YAGNI Check

When a reviewer asks you to "implement properly" something that isn't used:

```bash
grep -rn "functionName\|/endpoint/path" src/
```

- If unused: propose deletion instead of expansion.
- If used: implement properly.

Don't add features to satisfy a reviewer when the codebase doesn't need them.

## Handle Unclear Feedback

If any item is unclear:

> `Understand items 1, 2, 3, 6. Need clarification on 4 and 5 before implementing.`

Stop. Do not implement anything yet. Ask for clarification on the unclear items.

## Implementation Order

1. Clarify unclear items first.
2. Blocking issues (breaks build, security, data loss).
3. Simple fixes (typos, imports, renames).
4. Complex fixes (refactors, logic changes).
5. Test each fix individually — no batching without verification.

## If You Pushed Back and Were Wrong

State it factually and move on. No long apology, no defending why you pushed back.

> `You were right — checked x.ts:120 and the call does return nullable. Fixing now.`

## GitHub Thread Replies

When replying to inline PR comments, reply in the comment thread:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies -f body='<reply>'
```

Not as a top-level PR comment. Threaded replies keep the context local to the finding.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The reviewer is senior / has fresh eyes, they must be right." | Reviewers see the diff, not the full codebase. Verify each claim against current code. |
| "Saying 'great catch' is polite." | Performative agreement hides whether you understood or verified. A stated fix is the polite form. |
| "I'll batch all fixes and test once at the end." | Batching without per-item verification lets a broken fix hide behind a green test. One fix, one test. |
| "I don't fully get item 4, but I'll try something." | Partial understanding produces wrong partial fixes the next round has to undo. Ask first. |
| "Pushing back feels confrontational." | Technical correctness > social comfort. Cite `file:line` and move on. |
| "Implementing feels faster than verifying." | Wrong fixes cost more rounds than correct ones. Verification is the short path. |
| "The reviewer asked me to implement it properly." | If the code is unused, deletion is the correct fix (YAGNI). Don't expand to satisfy a reviewer. |

## Red Flags

- Replies that start with "You're absolutely right!" (or any gratitude expression).
- Fixing findings without running tests after each fix.
- Accepting a YAGNI "implement properly" without checking whether the code is used.
- Pushing back without citing `file:line` or test evidence.
- Ignoring Critical / Important findings because "I don't think it matters".
- Silently implementing only the items you understood and leaving unclear ones.

## Verification

Before declaring the round complete:

- [ ] Every Critical finding is resolved or explicitly overturned with reasoning.
- [ ] Every Important finding is resolved or has a tracked deferral.
- [ ] Each fix is tested individually; no regressions.
- [ ] Each reply cites `file:line` or test evidence; no "fixed" without a reference.
- [ ] If you pushed back and lost, the correction is stated factually.
