---
name: implement
description: Implement a task, spec, or task graph as a verified change ready for review, or fix review findings on such a change. Keeps a progress record and delivers a handoff to the caller or the conversation.
metadata:
  credits:
    - skill: implement
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md"
    - skill: implement-spec
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/implement-spec/SKILL.md"
    - skill: poteto-mode
      author: Lauren Tan
      organisation: Cursor
      url: "https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md"
---

# implement

Turn the requested scope into a committed, verified change and a handoff a reviewer can trust. The input is the content of the work: a conversation request, a task description, a spec, a set of tasks with dependencies, or review findings on an earlier change. No setup, prior breakdown, or other skill run is required.

Pick the mode from the input:

| Input | Mode |
| --- | --- |
| A request, task, or spec | Single task: steps 1–6 |
| A spec with tasks that declare dependencies on each other | Task graph: read [Task graph mode](references/task-graph.md); each task runs steps 1–6 |
| Review findings on a change this skill delivered | Rework: [Fix review findings](#fix-review-findings), then steps 5–6 |

## The caller's contract

A caller (a person, another skill, or an automation) may specify three things. Follow what it specifies, and use the default otherwise:

| What | Default |
| --- | --- |
| Where to keep the progress record, and the command that writes it | The conversation's task list |
| What is authorized: push, open a PR | Commit only; ask before pushing or opening a PR |
| How to deliver the handoff | The final message in the conversation |

## Progress record

Keep a progress record in this format wherever the caller says:

```md
## Workpad

### Plan
- [ ] 1. <step>
  - [ ] 1.1 <sub-step>

### Acceptance Criteria
- [ ] <observable criterion>

### Validation
- [ ] <command or check>
- [ ] <UI change: evidence per affected page or state; delete when no UI changes>

### Notes
- <timestamp> <short progress note, with short SHA once committed>
```

It is the record reviewers and asynchronous observers read. Update it at every milestone so it never lags the actual state: plan written, each step verified and committed, evidence captured, handoff. When it lives outside the conversation, write each update as a complete body through a heredoc in its own command and check the command's result. Never publish a body read from a shared temporary file; a failed earlier step leaves a stale file behind.

## 1. Establish the goal

Extract expected behavior, scope, explicit exclusions, and completion criteria from the input. Reuse confirmed decisions without asking again. Restate the goal in one sentence.

Investigate facts first. State reasonable assumptions for gaps that do not affect correctness. Ask only about unresolved choices that affect behavior, public contracts, or major trade-offs and cannot be settled from context; continue independent work while waiting.

In unattended execution, act within the caller's authorization and do not stop to ask permission. Report a blocker only when required information, capability, or authorization is missing, or the requirements contradict each other in a way you cannot resolve. Silence does not expand authority.

## 2. Understand the current state

Read project instructions, relevant current knowledge, and active decisions. Inspect the affected implementation, callers, and tests; prefer existing patterns. Confirm the working directory, branch, starting commit, and existing changes (`git status`, `git log --oneline -10`). Work on a non-default branch under the project's worktree conventions, and protect user files and uncommitted work.

Derive validation commands from project configuration and existing workflows; do not assume a language, package manager, or test runner. Establish the baseline the risk calls for: existing test failures, a reproduction of the original bug, behavior before a refactor, or performance measurements. Mark an unavailable baseline as unknown, not as a pre-existing problem.

When resuming, reconcile progress against Git, the progress record, and existing evidence. Reuse results that remain valid and finish only unfinished work. A commit does not prove verification, and a PR does not prove completion.

## 3. Plan small, verifiable steps

Execute small tasks directly. Otherwise write a plan of about 3–8 ordered steps, each a self-contained slice (roughly 100 changed lines plus its validation) with an observable completion condition: a command, a test name, or a visible behavior. "Looks right" is not a condition. Test the riskiest assumption or build the critical path first. Reuse a clear existing plan instead of writing a new one.

Write the plan, acceptance criteria, and validation into the progress record before editing code.

Treat file lists in the input as an impact map unless they are explicit boundaries: update the callers, tests, and documentation the goal needs. Align with the user before adding product scope or making a new major design decision. If requirements change mid-task, update the criteria and affected steps and discard validation that no longer applies.

## 4. Implement and verify each step

Choose evidence by task type; check each behavior of a mixed task separately:

| Type | Before implementation | After implementation |
| --- | --- | --- |
| Feature or behavior change | Define observable results and write a failing test for the new behavior | Make the smallest implementation pass, then verify wiring and results at key entry points |
| Bug fix | Reproduce the original failure, identify the root cause, prefer a regression test | Pass the same reproduction and relevant regression checks |
| Behavior-preserving refactor | Pin behavior with existing tests, characterization tests, or equivalence checks | Change structure in small steps and prove behavior is unchanged |
| Configuration, documentation, or static content | Identify format, reference, or runtime constraints | Run the corresponding checks; do not invent unit tests when behavior is unchanged |

For new or corrected behavior, use `harness-stack:tdd` at the agreed seams and pass it the established goal and interfaces. If it is unavailable, write and run one failing test for one behavior, implement the minimum, rerun, and refactor while green. If automation is blocked, state the substitute checks and the evidence gap.

Run type checks and the affected test files after each step and keep them green before building on the step. On an unexpected failure, keep the output, narrow the reproduction, and test root-cause hypotheses; if successive fixes fail at the same point, revisit your assumptions and the way you observe the failure. Do not weaken assertions to fit the code.

Commit each verified step under project conventions, staging only the paths or hunks this task owns. Then tick the step in the progress record and add a Notes line with the short SHA.

Stay inside the scope: no opportunistic refactors and no features the input did not ask for. Record a real but unrelated problem as an adjacent issue in the handoff instead of fixing it.

## 5. Check the complete result

Compare all changes, including uncommitted and new files, with the request and later adjustments. Check missing behavior, boundaries, failure paths, callers, test quality, and unnecessary complexity; fix what you find and reverify.

Run the full test suite once, plus type checks, lint, builds, and the integration checks the impact calls for. Exercise user-visible flows at their real entry points and keep the commands and output. Record tests, builds, and runtime acceptance separately, and rerun checks that later changes invalidated. Never deliver code whose checks are red.

**Visual evidence.** When the change alters anything a user sees (pages, components, styles, desktop or mobile screens), capture evidence in the real running application:

- Static states: `harness-stack:screenshot`, one window or region per affected page or state, never the full screen (it can include unrelated windows and secrets in terminals). Capture a before image when the comparison helps.
- Interactions, animation, or transitions: `harness-stack:screen-record`, plus a frame contact sheet when it lets a reviewer see the flow at a glance.
- Compress with each skill's optimize or compress command, and save the files where the caller says, otherwise in a directory outside the repository.

List each file with the page or state it shows in the progress record's Validation section and in the handoff. Missing evidence (the app does not start, no screen-recording permission, a capture skill is unavailable) is a validation gap: record the reason and do not claim the UI was verified.

When behavior contracts, architecture, terminology, or operations change, update the authoritative documentation in place in the same change. Create no document without a durable knowledge change, and keep progress and evidence in the progress record or handoff, not in long-lived knowledge.

## 6. Deliver

Commit the remaining task-owned changes. Leave the user's unrelated work untouched rather than cleaning or committing it.

Push and open a PR only when the caller authorized it; merging and deploying are never part of this skill. When opening a PR, use `harness-stack:pr-open` if available, and include any link text the caller asks for.

Finish the progress record: every Plan, Acceptance Criteria, and Validation item checked, and a final Notes line `handoff: PR=<url>` (or the branch when there is no PR). Check for unchecked items before the final write. An item that cannot be checked means the work is not done: complete it, or deliver as blocked.

Write the handoff with these sections, using "n/a" or "none" when empty:

```md
## PR
<PR url, or the branch when no PR was authorized; when blocked: "Blocked at: <step>">

## Verification
<one line on what passed; evidence files; each command actually run, one per line>

## Adjacent issues
<real problems seen but not fixed, one line each, or "none">
```

The verdict is `done` when the agreed scope is implemented, final validation evidence exists, and the change is delivered as authorized (a PR, or local commits). Otherwise it is `blocked`: first write into the progress record where you stopped, what information, decision, or tool is missing, and the branch state (committed, pushed, partly done), then deliver. Unverified is neither passed nor failed; list confirmed pre-existing failures separately.

Deliver the handoff and verdict the way the caller specified, otherwise as the final message in the conversation.

## Fix review findings

Review findings are the report or text the caller supplies. A finding is a claim about a particular version, so check it against the current code before changing anything:

- **Valid**: state the trigger and impact, fix it by root cause (related findings can share a fix), and reverify with a reproduction or regression test.
- **Invalid or already resolved**: cite the current code, test, or decision that shows it.
- **Needs a decision**: state the missing fact or decision and continue with independent items. Do not downgrade a blocking finding on your own authority.

Fix security, data-integrity, and behavioral regressions first. Commit, push when authorized, and add a Notes line for the round to the progress record, then run steps 5–6 again. Put each finding's disposition and evidence in the handoff's Verification section so the next review can check them.

## Guardrails

- Never push to the default branch, force-push, rewrite published history, or skip hooks with `--no-verify`; fix a failing hook's cause in a new commit.
- Run no destructive command (`rm -rf`, `git reset --hard`, dropping tables) unless the input explicitly authorizes it.
- If a diff contains a secret or credential, stop and report it as a blocker.
