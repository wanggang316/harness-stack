---
name: review-receive
description: Verify and address code review feedback, fix valid findings, support disagreements with evidence, and record unresolved items and revalidation results.
---

# review-receive

Turn review feedback into verified fixes or evidence-based dispositions. A finding is a claim about a particular version. Check whether it applies to current code before deciding to change it.

## Verify and triage

Read the full report and its scope. Verify each finding against current code, requirements, callers, and active decisions. Check whether the problem is reachable, whether later changes already resolved it, and whether the proposed fix would break another contract.

Record a disposition for each finding:

- **Valid**: state trigger conditions and impact, then schedule a fix.
- **Invalid or already resolved**: cite current code, tests, or decisions that support the conclusion.
- **Needs information**: state missing facts or decisions and continue independent items.
- **Deferred**: record risk, reason, and existing tracking location. Blocking risks require explicit acceptance by an authorized decision-maker; the author cannot downgrade them unilaterally.

Use the reported severity to understand priority, then verify actual impact. Obtain a decision before resolving incorrect requirements or major contract disagreements. Preferences and suggestions do not require mechanical adoption. Report unrelated new requirements as out of scope; do not create external tickets without authorization.

## Fix and revalidate

Address security, data integrity, and behavioral regressions first. Organize small fixes by root cause; related findings can share a fix. Give each step focused validation rather than producing separate, conflicting patches for every comment.

Use `harness-stack:tdd` for behavioral fixes, with reproduction and after-fix evidence. If unavailable, prove the problem with the smallest check, fix it, and rerun. State gaps in automated regression coverage. Check affected callers and tests after the fix, and commit task-owned changes under project conventions.

Record the final disposition and evidence for every finding. Changed code needs revalidation; the original review does not automatically cover the new version. For independent re-review, supply the original findings, disposition reasons, and new scope. If a problem recurs, investigate the root cause again or clarify the contract. Do not redispatch without changed conditions or new evidence.

Report fixed, rejected, pending, and deferred findings with evidence and remaining blockers. Replying to PR threads, marking them resolved, or publishing comments requires existing authorization. Once authorized, check the thread and code version, then read back the result after the operation.
