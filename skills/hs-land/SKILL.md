---
name: hs-land
description: Drives an open PR to a clean merge into the base branch. Use when a PR is ready to merge and you need to watch CI, address review feedback, resolve conflicts, and squash-merge when green. Don't yield to the user until the PR is merged or genuinely blocked.
---

# Land

## Overview

`hs-pr` opens the PR; `hs-land` brings it home. Watch CI, handle review feedback, keep mergeability, then squash-merge.

The agent's job here is **persistence**: don't yield while there's still actionable work (failed CI to fix, comment to answer, conflict to resolve). Only stop when the PR is merged, or when something genuinely blocks progress and needs a human decision.

## When to Use

- You have an open, non-draft PR intended to merge soon.
- CI is running, about to run, or already complete.
- Reviewers have given or may give feedback.
- The goal is "get this merged", not "explore alternatives".

For a one-tick check (no persistent loop), use `/hs-pr-watch` instead.

## Preconditions

- `gh` CLI authenticated.
- You're on the PR's head branch (or have its number).
- Local working tree is clean.
- Local gauntlet (tests, lint, type-check) passed on the head commit — a green local run is the cheap signal that CI shouldn't surprise you.

## Workflow

1. **Locate the PR**

   ```bash
   gh pr view --json number,url,headRefOid,mergeable,mergeStateStatus,title,body
   ```

   If no PR exists for the branch, stop — open one with `hs-pr` first.

2. **Pre-flight**
   - Working tree clean. If not, commit pending work via `/hs-commit`.
   - Run the local gauntlet (project-specific: `npm test`, `pytest`, `make check`, etc.). If anything fails locally, fix before pushing — don't make CI catch what `make check` would have.

3. **Conflict check**
   - If `mergeable == "CONFLICTING"` or `mergeStateStatus == "DIRTY"`:
     - Sync the branch — see [hs-git/references/sync.md](../hs-git/references/sync.md) (rebase) or [pull.md](../hs-git/references/pull.md) (merge), depending on project policy.
     - Force-push only if history was deliberately rewritten ([push.md](../hs-git/references/push.md)).
   - If `mergeable == "UNKNOWN"`, wait briefly (10–30s) and re-check; GitHub is computing.

4. **Watch CI, reviews, and head drift in parallel**

   Three independent signals can fire while the PR is open:
   - **CI checks complete** — pass, fail, or still pending.
   - **A reviewer leaves feedback** — inline comment, top-level comment, or review with state.
   - **The PR head moves** — someone (or a bot) pushed.

   Poll all three on a ~10s interval. React to whichever fires first.

5. **React**

   | Signal | Action |
   |---|---|
   | Mergeable `CONFLICTING` | Sync, resolve, push. Go back to step 4. |
   | Mergeable `UNKNOWN` | Wait, re-check. |
   | CI check failed (real) | Pull logs, fix locally, commit via `/hs-commit`, push, go back to step 4. |
   | CI check failed (flake — isolated timeout, transient infra) | Re-run the specific job. Proceed if it passes on retry. |
   | CI auto-commit appeared on the head | See "Auto-Commit on Head" below. |
   | Review comment outstanding | Hand off to `hs-review-receive`. Don't merge until acknowledged and (if needed) addressed. |
   | Push rejected (auth / permission / policy) | Surface error. Do not paper over — see [hs-git/references/push.md](../hs-git/references/push.md). |
   | All checks pass, no outstanding feedback | Merge (step 6). |

6. **Squash-merge**

   ```bash
   title=$(gh pr view --json title -q .title)
   body=$(gh pr view --json body -q .body)
   gh pr merge --squash --subject "$title" --body "$body"
   ```

   - Use the PR's *current* title/body as merge subject/body. Refresh them in step 5 if scope shifted.
   - Don't enable `--auto` (auto-merge) in repos without required checks — auto-merge can land before CI runs.
   - If the repo doesn't auto-delete head branches on merge, delete the branch.

## Review-Feedback Handling

Before changing code in response to a comment:

1. **Context guard.** Confirm the feedback doesn't conflict with the user's stated intent for this change. If it does, reply inline with rationale and ask the user before changing code.
2. **Pick a mode per comment.** State it in the inline reply *before* pushing changes:
   - **Accept** — will fix, here's the plan.
   - **Clarify** — need more info, what specifically did you mean?
   - **Push back** — disagree, here's why, propose alternative.
3. **Classify.** correctness / design / style / clarification / scope.
   - Correctness must be addressed or refuted with concrete validation (test, log, reasoning).
   - Design / style / clarification can be deferred — say so explicitly with rationale.
4. **Reply before change.** Always state intended action before pushing code. Easier for reviewers to follow than "force-pushed; here are 10 new commits".
5. **Batch fixes.** One consolidated "review addressed" comment after a batch of fixes beats ten micro-replies.

Full depth: `hs-review-receive`.

## CI Failure Handling

- **Pull logs first.** `gh pr checks` for the summary, `gh run view <run-id> --log` for details.
- **Reproduce locally** if possible. A local repro is the cheap signal that your fix actually fixes it.
- **Flaky vs real.** A single-platform timeout that doesn't repeat is plausibly flaky — re-run the job. A failing assertion that reproduces locally is real. Use judgment; don't auto-retry indefinitely.
- **Lockfile / dependency-sync errors on the merge commit** (e.g., pnpm reports a corrupted lockfile): the remediation is usually to fetch latest `origin/<base>`, sync, push, and rerun CI.
- **Don't `--no-verify` or skip jobs** to make CI pass. Fix the root cause.

## Auto-Commit on Head

Some CI setups push fixes back to the PR (formatters, codegen, auto-changelog). These commits are usually authored by a bot account, and some CI providers **won't retrigger a fresh run on bot-authored pushes**.

If the head moves and the new commit is bot-authored:

1. Pull the bot commit locally.
2. If `origin/<base>` has also moved, sync (rebase or merge).
3. Add a real-author commit (even a no-op `--allow-empty` is sometimes enough — but prefer a meaningful commit) to retrigger CI.
4. `git push --force-with-lease` if history was rewritten by the sync step, otherwise a normal push.
5. Resume watching.

If the head moved due to your own earlier push: nothing special, just keep watching.

## Anti-Patterns

| Don't | Why |
|---|---|
| Enable `gh pr merge --auto` in repos without required checks | Auto-merge can land the PR before CI even starts. |
| `gh pr merge --merge` instead of `--squash` (when squash is the project default) | Mismatches the project's history strategy. Adjust if your repo prefers merge commits. |
| `git push --force` (plain) to retrigger CI | Overwrites teammates' commits unconditionally. Use `--force-with-lease`, and only when history was deliberately rewritten. |
| Reply "ok will fix" and never address the comment | If you accept feedback, do the work or explicitly defer with a follow-up reference. |
| Implement review feedback that conflicts with user intent without checking first | The reviewer doesn't always know the user's context. Push back when warranted. |
| Yield to the user while the PR is still actionable | The whole point of `hs-land` is to drive to merge. Stop only when blocked. |
| Merge while a human review comment is outstanding | Even if you disagree, acknowledge before merging. |

## Yield Conditions

Stop and surface to the user when:

- Conflicts require product-level decisions (API shape change, schema migration, data-loss risk).
- Review feedback contradicts the user's intent and the right call is unclear.
- Push is rejected for auth / permission / policy reasons (don't paper over).
- CI failed repeatedly with the same error after one fix attempt — root cause unclear.
- A human reviewer requested changes without specific inline comments — need to ask what they want.
- The PR has been open long enough that scope or base branch has drifted significantly.
- The base branch is the only place a required change can be made (e.g., bumping a dependency for the whole repo).

Otherwise: keep going.

## Verification

- [ ] PR is in `MERGED` state on the base branch
- [ ] CI was green at merge time (not bypassed via auto-merge in an unprotected repo)
- [ ] No outstanding review comments
- [ ] PR title/body reflected final scope before merge
- [ ] Head branch deleted (or auto-deleted by repo settings)

## Future Work

A parallel watcher script (asyncio polling CI + reviews + head SHA, distinct exit codes per signal) would mechanize step 4. See `raw/symphony/.codex/skills/land/land_watch.py` for prior art. Not shipped in v1; the workflow above is the executable spec.
