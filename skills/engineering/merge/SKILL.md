---
name: merge
description: Drive an approved pull request or merge request to a clean merge (watch CI, address feedback, keep it mergeable, squash-merge when green) and move its ticket to Done. Use when asked to merge or land a change, or when a ticket reaches Merging. Does not replace commit, code-review, or release workflows.
---

# merge

Act as the author of an open, non-draft PR whose goal is merge. Watch CI, address feedback, keep the branch mergeable, squash-merge when green, and close out the ticket. **Persist** while actionable work remains, including CI failures, unanswered comments, and mechanical conflicts. Stop only after merge or a yield condition.

A request to merge, or a ticket a person moved to `Merging`, authorizes pushing fix commits to the PR branch and merging when green. Ask before anything outside that scope, such as changing the base, force-pushing a shared branch, or bypassing required checks.

The commands below use GitHub's `gh`. On GitLab use the `glab mr` equivalents (`glab mr view`, `glab mr merge --squash --remove-source-branch`, `glab ci status`); the decisions are the same.

## Preconditions

- `gh` is authenticated.
- The PR is open and not a draft. Find it from the input, the current branch, or the ticket's linked PR. If none exists, stop and say so.
- The local worktree is clean and the full local checks passed at the head commit.

## Ticket

Find the ticket from the input, the PR body (`Closes …`), or the branch name, and read it as [Working with tickets](../setup-harness-stack/references/tickets.md) describes. Without a ticket, report in the conversation.

With a ticket, it should be in `Merging`: that is a person's approval to merge. If it is in another state, report that and ask before merging; never move a ticket to `Merging` yourself. The [state machine](../setup-harness-stack/references/state-machine.md) defines the transitions this skill owns: `Merging` → `Done` after the merge, and `Merging` → `In Progress` when conflicts need rework.

## Workflow

1. **Locate the PR**

   ```bash
   gh pr view <pr> --json number,url,headRefOid,baseRefName,isDraft,mergeable,mergeStateStatus,title,body
   ```

2. **Check conflicts**
   - `mergeable == "CONFLICTING"` or `mergeStateStatus == "DIRTY"`: fetch `origin/<base>` and merge or rebase it into the branch per the team's convention. Resolve **mechanical** conflicts (imports, lockfiles, adjacent edits), rerun the full checks, and push. Use `git push --force-with-lease` only after rebasing a branch you alone push to.
   - Conflicts that change behavior the review approved (both sides edit the same logic, a schema or API shape diverged) are not mechanical: the merged result needs implementation and review again. Comment on the ticket with the conflicting paths and why, move it from `Merging` to `In Progress`, and stop.
   - `mergeable == "UNKNOWN"`: wait 10–30 seconds and check again; GitHub is computing mergeability.

3. **Watch CI, feedback, and head movement**

   An open PR has three independent signals: **CI** (passing, failing, pending checks), **feedback** (inline comments, top-level comments, submitted reviews), and **head movement** from a person or bot. Poll all three about every 10 seconds and respond to whichever changes first.

4. **Respond**

   | Signal | Action |
   | --- | --- |
   | Conflicts | Step 2. |
   | Real CI failure | Read logs, fix locally, commit, push, return to step 3. |
   | Flaky CI failure (an isolated timeout, transient infrastructure) | Rerun that job once; continue if it passes. |
   | CI adds a commit to head | See [Auto-commit on head](#auto-commit-on-head). |
   | Unaddressed comment | See [Feedback](#feedback). |
   | Push rejected for authentication, permissions, or policy | Report the error as it is. |
   | All checks pass and no feedback is unaddressed | Merge in step 5. |

5. **Squash-merge**

   ```bash
   gh pr merge <pr> --squash --delete-branch --subject "$(gh pr view <pr> --json title -q .title)" --body "$(gh pr view <pr> --json body -q .body)"
   gh pr view <pr> --json state,mergedAt
   ```

   - Merge with the PR's current title and body; update them first if the scope changed.
   - Do not use `--auto` in a repository without required checks; it can merge before CI runs.
   - Trust the PR state read afterwards, not the exit code: `gh` can fail after a successful merge (for example, when the branch is checked out in a worktree) and succeed after only queueing.

6. **Close out the ticket**

   When the PR state is `MERGED`, move the ticket to `Done`. On GitHub and GitLab, a `Closes` link usually closes the issue on merge into the default branch; check, and close it as completed if it is still open. Remove the state label it carried. A failed ticket update after a successful merge is a warning to report, not a reason to undo anything.

## Feedback

Review approval happened before `Merging`, so new feedback at this stage is usually CI-bot output or a last human comment. Before changing code for a comment:

1. Check that it does not conflict with the approved intent; if it does, reply and ask the person who approved the merge.
2. Reply with a disposition before pushing: **accept** with the intended fix, **clarify** with the missing information, or **push back** with reasons.
3. Fix correctness issues or refute them with concrete validation. Defer design or style suggestions with a reason, or a follow-up ticket if the user wants one.
4. Batch fixes and post one summary comment per batch.

A fix that changes behavior the review approved goes back through review: treat it like a non-mechanical conflict.

## Auto-commit on head

Some CI setups push formatter, codegen, or changelog commits to the PR, and some providers do not start a new run for bot-authored pushes. If head moves to a bot commit, pull it, sync with `origin/<base>` if needed, and add a commit by the real author (meaningful, or `--allow-empty`) to retrigger CI. Head movement caused by your own push needs nothing special.

## Yield conditions

Stop and report when:

- Conflicts or feedback need a product decision (API shape, schema migration, data-loss risk), or contradict the approved intent.
- Authentication, permissions, or policy reject a push or merge.
- CI fails repeatedly with the same error after a fix attempt and the cause is unknown.
- A person requests changes without saying what they need.
- A required change can only be made on the base branch.

Otherwise, keep going.

## Completion

- [ ] The PR state is `MERGED`; CI was green at merge and not bypassed.
- [ ] No comment is left without a disposition, and the title and body matched the final scope.
- [ ] The head branch is deleted.
- [ ] The ticket is `Done` (closed as completed on GitHub and GitLab), or the report says why not.

Report the PR URL, the merge commit, and the ticket's final state.
