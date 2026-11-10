---
name: pr-auto
description: Open a pull request for the current feature branch and merge it in the same run, without a review step between. Runs pr-open, then pr-land. Use only when the user asks to open and merge a PR in one go, for a simple change that needs no review.
---

# pr-auto

Open a PR for the current branch and merge it in the same run. A request to run this skill is the approval for the PR to land.

1. Run `pr-open`. If it stops without a PR, stop and report.
2. Run `pr-land` on that PR.
3. Report the PR URL and the verdict from `pr-land`.
