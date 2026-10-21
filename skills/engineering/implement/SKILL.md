---
name: implement
description: Implement a defined task, issue, or spec as a verified change ready for review.
disable-model-invocation: true
metadata:
  credits:
    - skill: implement
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md"
    - skill: poteto-mode
      author: Lauren Tan
      organisation: Cursor
      url: "https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md"
---

# implement

Complete implementation, verification, self-review, and related knowledge updates within the requested scope. Input can be a conversation request, task reference, spec, or existing plan. No prior ticket breakdown, state configuration, or skill invocation is required.

## 1. Establish the goal

Read the input. For a task reference, fetch its full content, constraints, and dependencies, and state its title. Extract expected behavior, scope, explicit exclusions, and completion criteria. Reuse confirmed decisions without requesting approval again.

Investigate facts first. State reasonable assumptions for gaps that do not affect correctness. Ask only about unresolved choices that affect behavior, public contracts, or major trade-offs and cannot be resolved from context. Continue independent work while waiting. If a reference is inaccessible, do not infer its full requirements from the title.

In unattended execution, proceed within the host's existing authorization and decision boundaries. Report a blocker only when required information, capability, or authorization is missing. Silence does not expand authority.

## 2. Understand the current state

Read project instructions, relevant current knowledge, and active decisions. Inspect the affected implementation, callers, and tests; prefer existing patterns. Confirm the working directory, branch, starting commit, and existing changes. Follow the project's worktree conventions and protect user files and uncommitted work.

Derive validation commands from project configuration and existing workflows. Do not assume a language, package manager, or test runner. Establish the baseline appropriate to the risk: existing test failures, the original bug reproduction, behavior before a refactor, or performance measurements. Mark unavailable baselines as unknown, not pre-existing problems.

When resuming, reconcile progress against current Git state, task records, and evidence. Reuse results that remain valid. A commit does not prove verification, and a PR does not prove completion. Complete only unfinished work or work whose evidence is no longer valid.

## 3. Plan small, verifiable steps

Execute small tasks directly. For complex work, use a short plan with an observable completion condition for each step. Test the highest-risk assumption or establish the critical path first. Reuse a clear existing plan and check its prerequisites; do not create plan files or tasks merely for formality.

The current agent executes by default. Use subagents only when the environment permits it, the work has independent boundaries, and delegation adds value. Specify the goal, context pointers, write scope, validation, and handoff requirements. Isolate workspaces and shared resources for concurrent writes. Verify the combined result after integration; the primary agent checks the actual diff and evidence.

Treat file lists as an impact map unless they are explicit boundaries. Update callers, tests, and documentation needed to complete the goal. Align with the user before adding product scope or making a new major design decision. If requirements change mid-task, update completion criteria and affected steps; discard validation conclusions that no longer apply.

If the host provides a workpad or task record and permits updates, reuse it. Keep the plan, acceptance criteria, and validation status aligned with actual progress, and check each write. If no persistent record is required, use the conversation task list without adding a state system.

## 4. Implement and verify continuously

Choose evidence by task type. For mixed tasks, check each behavior separately:

| Type | Before implementation | After implementation |
| --- | --- | --- |
| Feature or behavior change | Define observable results and write a failing test for the new behavior | Make the smallest implementation pass, then verify wiring and results at key entry points |
| Bug fix | Reproduce the original failure, identify the root cause, and prefer a regression test | Pass the same reproduction and relevant regression checks |
| Behavior-preserving refactor | Pin behavior with existing tests, characterization tests, or equivalence checks | Change structure in small steps and prove behavior is unchanged |
| Configuration, documentation, or static content | Identify format, reference, or runtime constraints | Run the corresponding checks; do not invent unit tests when behavior is unchanged |

For new or corrected behavior, read and use `harness-stack:tdd` for test boundaries, Red → Green → Refactor, and evidence requirements. Pass in the established goal and interfaces without asking for confirmation again. If the skill is unavailable, write and run a valid failing test for one behavior, implement the minimum, rerun, and improve structure while green. If automation is blocked, state substitute checks and evidence gaps.

Run relevant checks after each step and require them to pass before building dependent work. On unexpected failure, preserve output, narrow the reproduction, and test root-cause hypotheses. If successive fixes fail at the same point, revisit assumptions and the observation method. Do not weaken assertions to fit incorrect code or replace investigation with repeated failed commands.

Commit verified, coherent steps under project conventions. Stage only paths or hunks owned by this task. Report unrelated issues separately instead of expanding scope.

## 5. Check the complete result

Compare all changes, including uncommitted and new files, with the original request and later adjustments. Check missing behavior, boundaries, failure paths, callers, test quality, and unnecessary complexity. Fix findings and reverify affected work.

Run required tests, type checks, lint, or builds, plus integration checks appropriate to the impact. Verify user-visible flows at their actual entry points. Record test success, build success, and runtime acceptance separately. Ensure evidence still matches the final code and environment; rerun checks invalidated by later changes.

For visual changes, inspect affected pages and states in the real application and retain screenshots. Record a short video when interactions or animation require dynamic evidence. Capture only relevant surfaces, excluding unrelated or sensitive content. Include evidence paths in the handoff. If the host requires uploads, use authorized tools and destinations and confirm accessibility. Record missing critical evidence as a validation gap.

When behavior contracts, architecture, terminology, or operations change, update the authoritative documentation in place. Record confirmed important decisions and their reasons when needed. Create no document without a durable knowledge change. Keep execution progress and validation evidence in task records or the final report, not in long-lived knowledge prose.

After self-review and verification, invoke `harness-stack:code-review` for nontrivial changes. It dispatches independent Standards and Spec subagents. Changes to authorization, data, concurrency, or public contracts require review even with a small diff. Supply the starting commit, final code, agreed uncommitted files, requirements, and evidence. Keep that scope stable during review.

Use `harness-stack:review-receive` to verify feedback from both axes, retaining each report. Fix valid findings, reverify according to the root cause, and request independent re-review of affected axes. Keep unresolved blockers and incomplete axes in the handoff. If re-review repeats a finding, investigate why; repeated review requests alone do not advance the state.

If the review or feedback skill is unavailable, request separate read-only standards and requirements reviewers with the same inputs, then verify and address each finding. If independent reviewers are unavailable, check the complete diff, callers, and evidence against the requirements, and explicitly report independent review as incomplete. Self-review does not replace independent review.

## 6. Commit and hand off

Check and commit the remaining task-owned changes under project conventions. The workspace may retain the user's existing work; do not clean up or commit it to obtain a clean tree. Push, PR creation, task closure, merge, and deployment require existing explicit authorization.

Report the implementation result, commits, checks actually run and their results, unfinished work, and blockers. If required behavior or critical verification is incomplete, report partial completion or a blocker and the conditions needed to continue. Unverified does not mean failed or passed. List confirmed pre-existing failures separately; they do not justify claiming all checks passed.

If the host specifies a delivery command, report format, or status owner, follow that protocol and check the result. Leave engine-managed task status to the engine. Report delivery failures and retain recovery information; a chat summary does not substitute for required delivery.

Completion means the agreed scope is implemented, necessary validation has final evidence, and the required handoff succeeded. Track implementation, independent review, merge, deployment, and production acceptance separately.
