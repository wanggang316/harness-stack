---
name: pr-land
description: Drive an open pull request to a clean merge by watching CI, addressing review feedback, resolving conflicts, and squash-merging when green. Use when asked to land a change or advance an open PR through merge. Does not replace commit, code-review, or release workflows.
---

# pr-land

Act as the author of an open, non-draft PR whose goal is merge. Watch CI, address review feedback, keep the branch mergeable, and squash-merge when green. **Persist** while actionable work remains, including CI failures, unanswered comments, and conflicts. Stop only after merge or a Yield Condition.

A request to land the change authorizes pushing fix commits and merging when green. Ask before actions outside that scope, such as changing the base, force-pushing a shared branch, or bypassing required checks.

## Preconditions

- `gh` is authenticated.
- The current branch has an open PR, or its number is available. Otherwise, stop and tell the user.
- The local worktree is clean and the full local checks passed at the head commit. Local green is an inexpensive signal that reduces CI surprises.

## Workflow

1. **Locate the PR**

   ```bash
   gh pr view --json number,url,headRefOid,mergeable,mergeStateStatus,title,body
   ```

2. **Check conflicts**
   - If `mergeable == "CONFLICTING"` or `mergeStateStatus == "DIRTY"`, fetch `origin <base>` and rebase onto `origin/<base>`, or merge if that is the team's convention. Resolve conflicts and push. Use `git push --force-with-lease` only after rebasing a branch you alone push to.
   - If `mergeable == "UNKNOWN"`, wait 10–30 seconds and check again; GitHub is computing mergeability.

3. **Watch CI, reviews, and head changes in parallel**

   An open PR has three independent signals: **CI completion** with passing, failing, or pending checks; **reviewer feedback** through inline comments, top-level comments, or submitted reviews; and **PR head movement** from a person or bot. Poll all three about every 10 seconds and respond to whichever changes first.

4. **Respond**

   | Signal | Action |
   | --- | --- |
   | Mergeable `CONFLICTING` | Sync, resolve, push, and return to step 3. |
   | Mergeable `UNKNOWN` | Wait and recheck. |
   | Real CI failure | Read logs, fix locally, commit, push, and return to step 3. |
   | Flaky CI failure, such as an isolated timeout or transient infrastructure issue | Rerun the specific job. Continue if it passes. |
   | CI adds a commit to head | Follow Auto-Commit on Head below. |
   | Unaddressed review comment | Follow Review-Feedback Handling. Acknowledge and address it as needed before merging. |
   | Push rejected for authentication, permissions, or policy | Surface the error without hiding it. |
   | All checks pass and no feedback remains unaddressed | Merge in step 5. |

5. **Squash-merge**

   ```bash
   title=$(gh pr view --json title -q .title)
   body=$(gh pr view --json body -q .body)
   gh pr merge --squash --subject "$title" --body "$body"
   ```

   - Use the PR's *current* title and body for the merge. Update them in step 4 if scope changed.
   - Do not enable `--auto` in a repository without required checks; it may merge before CI runs.
   - Delete the head branch if repository settings do not delete it automatically on merge.

## Review-Feedback Handling

Before changing code for a comment:

1. **Check intent.** Confirm the feedback does not conflict with the user's established intent. If it does, explain in an inline reply and ask the user before changing code.
2. **Choose a disposition per comment** and state it inline before pushing: **Accept** with the intended fix, **Clarify** with missing information, or **Push back** with reasons and an alternative.
3. **Classify** as correctness, design, style, clarification, or scope. Address correctness or refute it with concrete validation. Design, style, and clarification may be deferred with an explicit reason.
4. **Reply before changes.** State the intended action before pushing so reviewers can follow it, rather than discovering a force-push and ten new commits.
5. **Batch fixes.** Prefer one summary comment after a set of review fixes over many fragmented replies.

## CI Failure Handling

- **Read logs first.** Use `gh pr checks` for an overview and `gh run view <run-id> --log` for details.
- **Reproduce locally** when possible to establish that the fix addresses the failure.
- **Distinguish flakes from real failures.** A non-reproducible timeout on one platform is likely flaky; rerun that job. A locally reproducible assertion failure is real. Use judgment and bound retries.
- **Lockfile or dependency-sync errors on the merge commit**, such as a corrupt pnpm lockfile, usually require fetching the latest `origin/<base>`, syncing, pushing, and rerunning CI.
- **Fix the root cause.** Do not use `--no-verify` or skip jobs to obtain green CI.

## Auto-Commit on Head

Some CI setups push formatter, codegen, or changelog fixes back to the PR. These commits are usually bot-authored, and **some CI providers do not start another run for bot-authored pushes**.

If head moves to a bot-authored commit, pull it locally, sync if `origin/<base>` also advanced, then add a commit attributed to the real author to retrigger CI. Use a meaningful commit when possible, or `--allow-empty` if needed. Push with `--force-with-lease` if synchronization rewrote history; otherwise, push normally and keep watching. Head movement caused by your own earlier push needs no special handling.

## Anti-Patterns

| Avoid | Reason |
| --- | --- |
| `gh pr merge --auto` without required checks | It may merge before CI starts. |
| `--merge` when squash is the project default | It conflicts with project history policy. Adapt if the repository prefers merge commits. |
| Accepting feedback without addressing it | Complete accepted work or explicitly defer it with a follow-up reference. |
| Returning control while actionable work remains | This skill owns progress through merge. Stop only when blocked. |
| Merging with unaddressed human review comments | Acknowledge them before merge even when you disagree. |
| Bare `--force` during review to retrigger CI | Use `--force-with-lease` only on your own branch and disclose the rebase in the PR thread. |

## Yield Conditions

Stop and report to the user when:

- Conflicts require product decisions, such as API shape, schema migration, or data-loss risk.
- Review feedback conflicts with user intent and the right trade-off is unclear.
- Authentication, permissions, or policy reject a push; do not conceal the error.
- After a fix attempt, CI repeatedly fails with the same error and the root cause remains unknown.
- A human reviewer requests changes without specific inline comments; clarify what they need.
- A required change can only be made on the base branch, such as a repository-wide dependency upgrade.

Otherwise, keep going.

## Verification

- [ ] The PR is `MERGED` into the base branch.
- [ ] CI was green at merge, not bypassed through auto-merge in an unprotected repository.
- [ ] No review comment remains unaddressed, and the title and body reflected final scope before merge.
- [ ] The head branch was deleted manually or by repository settings.
