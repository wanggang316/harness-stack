---
name: code-review
description: Review branches, PRs, selected commits, or uncommitted changes through independent Standards and Spec subagents, with separate findings and evidence.
metadata:
  credits:
    skill: code-review
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md"
---

# code-review

Organize an independent two-axis review of a defined change. Deliver findings that can be located and verified, plus a conclusion for each axis. Keep reviewed files unchanged during review. Fixes, published comments, and merges require separate authorization.

## Pin the review target

Confirm the working directory, branch, base, commit range, and workspace state. The user's scope takes priority. Use a PR's actual base and head; use the merge-base with the target branch for a branch review. For an explicit comparison between two commits, use their endpoint diff rather than substituting a merge-base comparison. Resolve branch names to SHAs so moving references cannot change the target.

For work in progress, include agreed staged, unstaged, and untracked files. For tracked files, `git diff <base-sha>` shows the final workspace's net change from the base. Reconcile it with `git diff --cached`, `git diff`, and `git ls-files --others --exclude-standard`. Read new files separately. Distinguish the user's existing changes; confirm ownership when scope is unclear, rather than automatically including or cleaning them up.

Record base/head, the file list, and content snapshots or hashes for uncommitted work. Pause writes to these files during asynchronous review, or provide an isolated snapshot. Check identity before closing. If it changed, report invalidated coverage and request additional review; do not apply an old report to new code.

If a reference is invalid, the base cannot be determined, or the agreed scope is empty, report the actual state and request the missing scope information. An empty diff does not produce approval.

## Establish the review basis

Derive expected behavior from the user request, task body, PR description, and relevant current knowledge. Read project instructions, standards, active decisions, and tests for affected directories. A confirmed task description can replace a separate spec file. Missing requirements do not prevent checking provable code defects, but spec conformance must remain unverified.

Answer two distinct questions: does the change deliver the agreed behavior, and is its implementation correct and consistent with project constraints? Project standards take priority over personal preference. Explain actual maintenance cost or error risk for structural, naming, or abstraction findings; function length, parameter count, or layer count alone does not establish a defect.

## Dispatch independent reviews on both axes

Create two read-only subagents with fresh contexts, one for **Standards** and one for **Spec**. Dispatch them concurrently when supported. Each reviewer receives only the common change snapshot, necessary evidence, and its own responsibility. Neither inherits the author's conversation nor reads the other axis's reasoning or report. Separate reviews give standards compliance and requirements compliance distinct conclusions.

Use `harness-stack:code-reviewer` or the host's generic subagent. Provide an accessible absolute path to the [Reviewer guide](references/reviewer-guide.md). Include in the brief:

- Working directory, pinned base/head, diff command, commit list, agreed uncommitted files, and snapshot identity.
- Axis name and focus. Both reviewers read the guide's shared method and reporting requirements.
- Project standards, active decisions, and their locations for Standards; complete requirements or the confirmed task description for Spec.
- Actual validation records, known limits, and, for re-review, original findings and disposition reasons.

Supply necessary content when paths cannot be shared. Each reviewer reviews only its own axis and returns a result; it must not invoke this skill to dispatch more reviewers.

Without requirements, dispatch only Standards and mark Spec `Incomplete: no spec available`, stating what is needed. If the host supports only serial execution, still use separate contexts. If subagents cannot be created, report independent two-axis review as incomplete. Self-review is not an independent report.

## Present results separately

Wait for both axes. Check report coverage, evidence, and snapshot identity. Missing scope or changed versions require additional review. If one reviewer fails, retain the other report and mark the failed axis `Incomplete`.

Present reports under `## Standards` and `## Spec`. Lightly edit wording if needed, but retain each axis's findings, severity, evidence, and conclusion. Cross-reference a shared root cause while retaining both records. Do not merge them into one ranked list or use a pass on one axis to offset problems on the other.

End with each axis's finding count, most severe issue, and coverage limits. Do not add an overall approval that replaces the two conclusions. `No blocking findings` is a review result, not proof of tests, merge, deployment, or production acceptance. Publish to a PR only when requested, and verify that the target PR matches the reviewed version.
