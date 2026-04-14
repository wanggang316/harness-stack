# ExecPlan Template

Use this skeleton when creating execution plans. Every section is required. Write in prose — prefer sentences over bullet lists except in the Progress section.

---

# [Short, action-oriented title]

This is a living document. The Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective sections must be kept up to date as work proceeds.

## Purpose

<!-- Explain in a few sentences what someone gains after this change and how they can see it working. State the user-visible behavior this plan will enable. Begin with why the work matters from a user's perspective: what someone can do after this change that they could not do before. -->

## Progress

<!-- Track granular steps with checkboxes. Every stopping point must be documented here, even if it requires splitting a partially completed task into "done" vs "remaining". This section must always reflect the actual current state. Use timestamps to measure rates of progress. -->

- [ ] Step description

## Surprises & Discoveries

<!-- Document unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Provide concise evidence (test output is ideal). -->

(None yet)

## Decision Log

<!-- Record every key design decision made while working on the plan. -->

- Decision: ...
  Rationale: ...
  Date: ...

## Outcomes & Retrospective

<!-- Summarize outcomes, gaps, and lessons learned at major milestones or at completion. Compare the result against the original purpose. -->

(To be filled at milestone completion)

## Context and Orientation

<!-- Describe the current state relevant to this task as if the reader knows nothing. Name the key files and modules by full repository-relative path. Define any non-obvious term you will use. Do not refer to prior plans or conversations.

If touching multiple areas, include a short orientation paragraph that explains how those parts fit together so a novice can navigate confidently. -->

## Milestones

<!-- Milestones are narrative, not bureaucracy. Introduce each with a brief paragraph that describes the scope, what will exist at the end that did not exist before, the commands to run, and the acceptance you expect to observe. Keep it readable as a story: goal, work, result, proof.

Each milestone must be independently verifiable and incrementally implement the overall goal. -->

### Milestone 1: [Title]

<!-- Describe scope in prose. What will exist at the end of this milestone that did not exist before? -->

**Tasks:**

<!-- Each task should be small enough to implement, test, and verify in a single focused session.

For each task, describe:
- What to change and where (file paths, functions, modules)
- What the task accomplishes in terms of observable behavior
- How to verify it works (commands to run, expected output) -->

**Acceptance:** <!-- State what to run and what to observe to prove this milestone is complete. Be specific: "run X from directory Y and expect to see Z". -->

### Milestone 2: [Title]

...

## Validation and Acceptance

<!-- Describe how to exercise the completed system and what to observe. Phrase acceptance as behavior with specific inputs and expected outputs. If tests are involved, state the exact commands and expected results. -->

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Idempotence and Recovery

<!-- State whether steps can be repeated safely. If a step is risky, provide a safe retry or rollback path. Keep the environment clean after completion. -->
