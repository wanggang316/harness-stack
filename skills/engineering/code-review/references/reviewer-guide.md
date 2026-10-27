# Reviewer guide

Perform a read-only review of the single axis assigned in the brief. Return findings, evidence, validation limits, and a conclusion for that axis. Read the shared code snapshot and necessary context, then form an independent judgment. Do not read the other axis's report or dispatch more reviewers.

## Standards

Check implementation quality against project instructions, coding standards, and active decisions. Cite the source of documented rules. Present design concerns without an explicit rule as engineering judgments and explain their actual impact. Reference tool results for automated formatting checks instead of duplicating them as manual findings.

Match the diff against the smell baseline supplied in the brief. Its smells are investigation leads, not automatic defects: name the smell, quote the hunk, and explain the actual cost after checking callers and constraints. Explicit project conventions override the baseline and general preferences.

Also check provable correctness, security, compatibility, and validation gaps. A real defect still matters when no style rule names it.

## Spec

Check each requirement in the task or spec supplied by the brief. Identify complete, missing, partial, or changed behavior. Determine whether the implementation meets the goal or adds unrequested capabilities. Cite the corresponding clause or confirmed task requirement for every deviation.

Related callers, tests, and documentation can be necessary to meet requirements. Their absence from a file-by-file task list does not make them scope creep. Report uncertain semantics as questions; do not invent requirements for the user.

## Follow behavior paths

Start with the behavior exposed by tests and assertions, then trace inputs, state changes, outputs, and failure paths through the change. Read necessary code outside the diff, including callers, enum consumers, authorization boundaries, persistence constraints, and migrations. Confirm that each problem is reachable.

Check whether these risks apply:

- **Behavior and contracts**: missing requirements, incorrect state transitions, boundary inputs, recovery, repeated calls, concurrency, and compatibility.
- **Tests and evidence**: whether assertions detect the target error, whether tests only exercise doubles, and whether existing tests cover new paths. No new test is not an automatic finding; identify the unprotected behavior and regression risk.
- **Design and knowledge**: responsibility boundaries, caller migration, unnecessary complexity, and descriptions or operating procedures invalidated by the change.
- **Security and resources**: untrusted input, authorization and tenant isolation, sensitive information, side effects, resource release, and performance risks supported by actual workload evidence.

Read the [Review checklist](../../../../references/review-checklist.md) when a risk needs further investigation. The checklist helps form hypotheses; each finding still requires evidence in the current code.

Run safe, focused checks or reproductions when needed. Distinguish author-supplied evidence from results you obtained. Do not claim that full suites, UI acceptance, or production behavior passed without execution. Verify authoritative information for the relevant version when third-party APIs, dependencies, or security facts are uncertain.

## Write actionable findings

For each finding, provide severity, current-version `file:line`, trigger conditions, concrete impact, and evidence. Point to the smallest location that introduces the problem. If it appears in a caller, explain the causal link to the change. Suggest a fix direction; include code only when it removes ambiguity.

| Severity | Basis |
| --- | --- |
| Critical | Proven severe security, data-integrity, or core-function damage; must be resolved |
| Important | Missing required behavior, actual regression, or a design or validation gap with clear impact; requires a fix or explicit risk acceptance by an authorized decision-maker |
| Suggestion | An improvement with concrete benefit that need not be adopted in this change |
| Nit / FYI | Local polish or background information; report only when useful |

Set severity from trigger conditions and impact. List unverified suspicions as questions and state missing evidence. Confidence numbers do not turn guesses into facts. Separate pre-existing problems from those introduced or worsened by this change; do not require unrelated historical cleanup.

Within your axis, combine duplicate findings with the same root cause and order them by impact. Report no findings when no actual issue is found.

## Return the assigned axis report

Use the axis name as the heading. State review scope, basis, verified findings, open questions, checks actually run, and uncovered areas. Code and target identity must match the brief; report invalidated coverage if they changed.

Use `Request changes` for unresolved Critical / Important findings, `No blocking findings` when the agreed axis scope is complete with no blockers, or `Incomplete` when essential evidence or scope is missing. If blockers are proven but other areas remain uncovered, use `Request changes` and list limits. The conclusion applies only to this axis; it does not replace the other axis, runtime acceptance, or merge authorization.
