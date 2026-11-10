---
name: pr-auto
description: Open a pull request for the current feature branch and merge it in the same run, without a review step between. Runs pr-open, then pr-land. Use only when the user asks to open and merge a PR in one go, for a simple change that needs no review.
---

# pr-auto

Take a committed feature branch to a merged PR in one run. Each stage is an existing skill; this skill decides the order, passes the PR from one to the other, and stops when a stage cannot finish. It does not review the change or edit code.

A request to run this skill is the approval for the PR to land. It gives the authorization that `pr-open` and `pr-land` each state, and no more.

## 1. Open the PR

Run `pr-open` on the current branch, and create the PR ready for review: a draft cannot merge.

Continue only when `pr-open` returns a PR number and URL. Stop and report in these cases:

- `pr-open` stops, for example on a dirty worktree, an unresolved conflict, or a rejected push.
- `pr-open` proposes to split the diff. A change of that size is not a simple one; the user decides to split it or to land it as it is.

## 2. Land the PR

Run `pr-land` on that PR. It waits for the checks, merges, and returns `merged`, `returned`, or `blocked`.

Do not repair a `returned` or `blocked` PR in this run. The approval covers the change as it was opened, and a missing approval or a protection rule means the repository requires a person. The PR stays open for whoever continues.

## 3. Report

- The PR URL and `base ← head`.
- The verdict from `pr-land`, with the merge method and commit when merged, or the reason and the next action when not.
- When the run stopped in step 1: the step in `pr-open` that stopped it, and that no PR was merged.

If `pr-open` or `pr-land` is not available, report the missing skill and the stage it blocks. Do not replace it with ad hoc `gh` commands.
