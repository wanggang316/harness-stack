---
allowed-tools: Bash(gh pr view:*), Bash(gh pr checks:*), Bash(git branch:*), Skill(harness-stack:review-receive)
description: Scan a PR; if there's anything to act on, hand it to harness-stack:review-receive
model: claude-haiku-4-5
argument-hint: "[PR number — defaults to the PR for the current branch]"
---

## Context
- Branch: !`git branch --show-current`
- Argument: $ARGUMENTS

## Your task

1. Resolve the target PR. Use `$ARGUMENTS` if it's a number; otherwise look up the
   PR for the current branch via `gh pr view`. If no PR exists, stop and say so.
2. Look at the PR's current state: review decision, unresolved threads, recent
   comments, failing checks. Use `gh pr view` and `gh pr checks` as needed.
3. If the PR is merged or closed, report it and stop — nothing to watch.
4. If there is anything actionable (changes requested, unresolved feedback,
   genuine check failures), invoke `harness-stack:review-receive` with the findings and
   let it decide how to respond. Don't modify code yourself.
5. Otherwise, print one line summarizing the current state and exit.

## Periodic follow-up

This command does one tick. Wrap with `/loop` for recurring follow-up:

- Default interval: **5 minutes** — `/loop 5m /harness-stack:pr-watch <pr>`
- If the user passes a different interval, use that instead — `/loop 10m /harness-stack:pr-watch <pr>`,
  `/loop 1h /harness-stack:pr-watch <pr>`, etc.

Stop the loop manually once the PR is merged, closed, or you no longer need to watch.
