---
name: pr-land
description: "Merge an open pull request that is approved to land: wait for its checks, merge it with the method that keeps the most history (rebase, then merge commit, then squash), and report merged, returned, or blocked. Use when asked to land or merge a PR. It does not decide whether the change should land, and it does not change code."
---

# pr-land

The caller has already decided that this PR lands: a person, or `shepherd-tickets` moving the ticket to merging after it checked the evidence. This skill only does the merge. It does not review the change, edit code, resolve conflicts, or touch a ticket tracker. When the PR needs any of these, it stops and says so.

A request to land a PR authorizes merging it and deleting its head branch. It does not authorize pushing commits, force-pushing, changing the base, or bypassing branch protection (`--admin`).

## 1. Read the PR

```bash
gh pr view <pr> --json number,url,state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,title,body
```

- `MERGED`: nothing to do. Report `merged`.
- `CLOSED` or draft: report `blocked`.
- `mergeable` is `UNKNOWN`: GitHub is still computing it. Wait 10–30 seconds and read again.

## 2. Wait for the checks

```bash
gh pr checks <pr> --watch --interval 30
```

Run it again while checks are still pending, up to about 60 minutes in total. A PR without checks continues at once.

- A check fails once without a cause in the change (a timeout, a runner or network error): rerun only the failed jobs once with `gh run rerun <run-id> --failed`, then wait again.
- A check fails because of the change, or fails again after the rerun: report `returned`.
- Checks are still pending after the limit: report `blocked`.

## 3. Check that the PR can merge

Read the PR again (step 1) and decide from `mergeable`, `mergeStateStatus`, and `reviewDecision`:

| State | Action |
| --- | --- |
| `CONFLICTING` or `DIRTY` | Report `returned`: the branch needs the base merged in and the change verified again. |
| `reviewDecision` is `CHANGES_REQUESTED` | Report `returned`. |
| `BEHIND` (the base requires an up-to-date branch) | Run `gh pr update-branch <pr> --rebase`; if GitHub cannot rebase it, run `gh pr update-branch <pr>`. Then go back to step 2. A conflict here means `returned`. |
| `BLOCKED`, or `reviewDecision` is `REVIEW_REQUIRED` | Report `blocked` and name the missing requirement (an approval, a required check, a protection rule). |
| `CLEAN`, `HAS_HOOKS`, or `UNSTABLE` with only optional checks failing | Continue. |

## 4. Choose the merge method

Keep as much history as the repository allows. Try the methods in this order: **rebase**, then **merge commit**, then **squash**.

```bash
gh repo view --json rebaseMergeAllowed,mergeCommitAllowed,squashMergeAllowed,deleteBranchOnMerge
gh pr view <pr> --json commits --jq '.commits[] | .messageHeadline + "\n" + .messageBody'
```

- Skip a method the repository does not allow.
- Rebase and merge commit copy every commit to the base. Skip both and use squash when a commit is not fit for the base history: its subject starts with `WIP`, `fixup!`, `squash!`, or `amend!`. When squash is not allowed either, report `blocked`: the branch history needs cleanup first.
- When GitHub refuses a method for this PR (for example, "This branch can't be rebased"), try the next one.

## 5. Merge

```bash
gh pr merge <pr> --rebase
gh pr merge <pr> --merge  --subject "<title> (#<number>)" --body "<summary>"
gh pr merge <pr> --squash --subject "<title> (#<number>)" --body "<summary>"
```

`<summary>` is the first paragraph of the PR body's `## Summary`, followed by its `Closes` or `Refs` lines. Do not copy the whole body: the Evidence and Merge Danger sections are for reviewers, not for the base history.

Then read the PR again. Only `state == MERGED` means it merged; the exit code of `gh pr merge` alone does not. When the base uses a merge queue, `gh pr merge` only adds the PR to the queue: wait for `MERGED` with the same limit as step 2. When the queue removes the PR, go back to step 2.

## 6. Delete the head branch

Skip this when `deleteBranchOnMerge` is true. Otherwise, keep the branch when an open PR uses it as its base (`gh pr list --base <head> --state open`), and say so in the report. Else delete it:

```bash
gh api -X DELETE "repos/{owner}/{repo}/git/refs/heads/<head>"
```

## 7. Report

Return this to the caller, with the verdict `merged`, `returned`, or `blocked`:

```markdown
## PR

<url> (<base> ← <head>)

## Merge

- Method: rebase | merge | squash | none
- Commit: <the base commit that contains the change, when merged>
- Reason: <when returned or blocked: what failed and what is needed next>
```

| Verdict | Meaning |
| --- | --- |
| `merged` | The PR is `MERGED`. |
| `returned` | The change needs work: a conflict, a failing check, or requested changes. Whoever implemented it continues. |
| `blocked` | A person must act: a permission, a protection rule, a missing approval, checks that do not finish, or history that cannot land. |

## Verification

- [ ] The verdict comes from the PR state that GitHub reports after the last action.
- [ ] The method used is the first one in rebase → merge → squash that the repository allows and the commits are fit for.
- [ ] No commit was pushed, no protection was bypassed, and no branch that an open PR depends on was deleted.
