---
name: hs-followup-scope
description: Decides where a discovered issue, a failed user-test case, or a worker-flagged concern goes — merge into the current task, open a new follow-up task, drop into the milestone's misc bucket, or escalate to a human. Use whenever validation fails, a worker reports out-of-scope discoveries, or in-flight work surfaces new problems.
---

# hs-followup-scope: Follow-up Decision Tree

## Overview

In-flight work generates issues nobody planned for: a user-test case fails, an implementer notices an adjacent bug, a code reviewer flags a subtle design problem outside the diff. The system needs **one consistent way** to decide what to do with each issue, otherwise every controller invents its own rule and follow-up work either explodes the backlog or vanishes silently.

This skill is that decision tree. It returns a structured decision so the controller (`hs-team` or `hs-exec-plan`) can act mechanically rather than improvise.

## When to Use

- A user-test validator returned FAIL for one or more cases.
- An implementer's handoff has non-empty `Discovered issues` or `What was left undone`.
- A code-reviewer raised an Important / Critical finding outside the task's declared scope.
- An external signal (CI, security scan) surfaced a defect mid-plan.

## When NOT to Use

- The issue is inside the current task's declared scope and the implementer just hasn't finished — that's a re-dispatch loop, not a follow-up.
- The issue is a personal nit / preference disagreement — drop it; not every observation needs a follow-up.

## Inputs

The caller hands you:

- **Issue description** — what was discovered / what failed
- **Source** — which task / case / reviewer produced it
- **Current task** — the task that was active when the issue surfaced (or `null` if the issue was found at a gate)
- **Current milestone** — the milestone the active task belongs to
- **Plan state** — read access to `docs/runs/<plan>/state/features.json` to see the milestone's misc bucket fill level and the broader plan shape
- **Failure pattern** (when source is a validator FAIL) — `isolated` or `systemic` from `validation-state.json`

## Decision Tree

Walk the tree top-down. **First match wins.** Do not blend decisions.

```
1. Is the issue within the just-completed task's declared scope?
   YES → merge: update the current task's description and re-dispatch the
                same implementer with the expanded scope. No new feature.
   NO  → continue.

2. Is the issue a systemic failure (pattern=systemic on a validator FAIL,
   OR the same problem appears across 2+ sibling tasks)?
   YES → new-feature-top: open a follow-up feature at the TOP of features.json
                          with status=pending, place it before the next
                          milestone, and force the current milestone's
                          Exit Gate to wait on it. Strongly recommend
                          immediate fix; do not let it ride.
   NO  → continue.

3. Is the issue blocking? (Will any pending task fail or produce wrong
   output if this is not fixed first?)
   YES → new-feature-top: same as above. Blocking trumps "small".
   NO  → continue.

4. Is the issue small AND non-blocking AND its milestone's misc bucket
   has fewer than 5 items?
   YES → misc-bucket: append to features.json `misc_buckets[milestone].items`,
                      create a real feature entry for it in features.json
                      with status=pending. Will be picked up at the next
                      idle slot in the milestone, but does not block.
   NO  → continue.

5. Is the issue caused by infrastructure outside the agent's control
   (CI runner, network, third-party API down, missing credentials)?
   YES → escalate: surface to human. Do NOT create retry features for
                   infrastructure the agent cannot fix. State the symptom
                   and what input from a human would unblock.
   NO  → continue.

6. Default: new-feature-top with status=pending, no special priority.
```

## Output

Return one of four decision shapes:

### merge

```json
{
  "decision": "merge",
  "target_id": "T3",
  "rationale": "The discovered issue (`extra null check needed on cursor field`) is inside T3's declared file scope; expand T3's description to cover it and re-dispatch.",
  "appended_to_task_description": "Also ensure GET /api/daily-reports/:id treats null cursor on first page; previously assumed non-null."
}
```

### new-feature-top

```json
{
  "decision": "new-feature-top",
  "new_id": "T7-followup-cursor-validation",
  "milestone": "M1-foundation",
  "rationale": "Three sibling endpoints share the same response serializer that drops null cursor — systemic across T1/T2/T3. Fix once in shared serializer.",
  "preconditions": "M1 tasks T1–T3 completed.",
  "expected_behavior": "Shared response serializer encodes null cursor as JSON null, not omitted.",
  "verification_steps": [
    "curl /api/daily-reports → body.cursor === null on last page",
    "curl /api/daily-reports/:id → body.cursor field present"
  ],
  "fulfills": ["UT-AI-DAILY-005"]
}
```

### misc-bucket

```json
{
  "decision": "misc-bucket",
  "bucket": "misc-M1-foundation",
  "new_id": "T8-misc-typo-error-banner",
  "rationale": "Typo in error banner copy; not blocking, M1 misc bucket has 2/5 items.",
  "expected_behavior": "Error banner reads 'Could not load reports' (was 'Could not loaded reports').",
  "verification_steps": [
    "DOM: error banner text matches /Could not load reports/"
  ],
  "fulfills": []
}
```

### escalate

```json
{
  "decision": "escalate",
  "rationale": "GitHub Actions runner has been unreachable for 12 minutes; cannot run integration suite. Agent cannot fix infrastructure.",
  "human_question": "GitHub Actions runner is unreachable — wait, switch to local CI, or pause this plan?",
  "human_options": ["Wait 10 minutes and retry", "Run integration suite locally", "Pause this plan"]
}
```

When escalating, the question MUST be 1–4 multiple-choice options (no open-ended). Match the AskUser constraint defined in `skills/hs-team/SKILL.md`.

## State Mutations the Caller Must Apply

This skill **decides**; the caller mutates state. After receiving a decision:

| Decision | Caller writes |
|---|---|
| `merge` | Append to current task's description in `features.json`; re-dispatch implementer with expanded brief |
| `new-feature-top` | Prepend a new feature entry to `features.json`; if it duplicates a cancelled feature, add a note rather than reviving the cancelled one |
| `misc-bucket` | Append entry to `features.json` `misc_buckets[<milestone>].items` AND create a feature entry with status=pending; if the bucket is already at 5, re-run this skill with that fact and expect `new-feature-top` instead |
| `escalate` | Dispatch the AskUser 1–4 question; write the answer to `features.json` `decisions[]`; resume according to the answer |

The skill does NOT write to state files itself. That keeps the decision logic isolated and testable.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just patch this small issue inline." | If it's inside the task's scope: yes (decision = merge). If outside: no — that's how scope creep starts and the audit trail loses it. Run this skill. |
| "Two failed cases out of twenty isn't systemic." | If the two share a code path or root cause, it is systemic regardless of count. Read `failure_summary` in validation-state.json before deciding. |
| "The misc bucket is full but this is also small." | Then it doesn't fit. Either it's important enough to open as a real feature, or it's not important enough to track. Don't grow the bucket past 5. |
| "Infrastructure is flaky; I'll add a retry feature." | "Do not create retry features for infrastructure you can't fix." Escalate so a human fixes the infra. |
| "I'll skip the decisions log entry; the answer is obvious." | The audit trail of "why did we pick option B" is what makes long-running plans recoverable. Always log. |

## Red Flags

- Decision returned without rationale
- More than one decision returned (the tree is exclusive; first match wins)
- `merge` proposed for an issue outside the current task's declared file scope
- `misc-bucket` proposed when the bucket already holds 5 items
- `escalate` with an open-ended human question (must be 1–4 multiple-choice)
- The same issue gets routed twice with different decisions across the plan — pick one and stick to it

## Verification

- [ ] Inputs are complete (issue description, source, current task/milestone, plan state)
- [ ] Decision tree walked top-down; first match recorded
- [ ] Output is one of the four shapes with all required fields
- [ ] Rationale is one or two sentences citing the specific tree branch
- [ ] If decision affects `fulfills`, the affected case IDs are listed
- [ ] If decision is `escalate`, the human question fits the 1–4 multiple-choice format
