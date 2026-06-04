---
name: pr
description: Opens a pull request from a ready feature branch. Use when commits are clean and code is ready for review — detects the base branch, syncs, pushes, composes a structured PR body, and creates the PR via gh. Stays out of commit, review, and launch concerns.
---

# Open a Pull Request

## Overview

You are the author. Your branch is committed and the work is ready for review. This skill turns that branch into a pull request — base branch detected, branch synced and pushed, title and body composed, PR opened via `gh`. Nothing else.

**Core principle:** A PR is a request for review, not a dump of work. Title, body, and diff each stand alone — a reviewer should understand the change without reading your session.

## Scope

Open the PR. Nothing more. Commits, CHANGELOG, code review, and deployment are out of scope.

## When to Use

- Branch has clean atomic commits and passing tests locally.
- The change is review-ready: no debug prints, no half-finished slices, no unrelated edits.
- You have a target base branch (usually `main`).

## When NOT to Use

- Work-in-progress that isn't reviewable yet — keep iterating.
- A diff that mixes unrelated changes — split into separate branches first.
- A branch with `WIP`, `fixup!`, or `Phase 1`-style commit messages — clean history first.

## Preflight Checks

Before doing anything, confirm the working tree is publishable:

```bash
git status                          # clean, on the feature branch
git log --oneline @{u}..HEAD 2>/dev/null || git log --oneline   # commits to publish
git diff --stat $(git merge-base HEAD origin/HEAD)..HEAD        # diff size sanity check
```

Stop and resolve before continuing if:

- Working tree is dirty (uncommitted changes).
- Branch is `main` / `master` / the base branch itself — PRs need a feature branch.
- Commits contain `Co-Authored-By:` trailers, model attribution, or `WIP` / `fixup!` subjects.
- Diff bundles unrelated concerns — split into separate branches.

## The Process

### Step 1: Detect the base branch

Don't hardcode `main`. Detect dynamically:

```bash
# Default branch of the remote
BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null \
       || git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' \
       || echo main)
echo "base: $BASE"
```

If the user named a different target (e.g. a release branch), use that instead. Confirm with the user when ambiguous — don't guess between `main` and `develop`.

### Step 2: Sync with the base

Make sure the PR reflects a current diff, not a stale one:

```bash
git fetch origin "$BASE"
git log --oneline "HEAD..origin/$BASE" | head   # commits on base that you don't have
```

If the base has moved on, rebase or merge per the project's convention. Default: `git rebase origin/$BASE`. If conflicts appear, resolve them before pushing — don't push a branch that won't merge cleanly.

Never force-push to a shared branch. Force-push only your own feature branch, and only after rebase.

### Step 3: Push the branch

```bash
BRANCH=$(git branch --show-current)
git push -u origin "$BRANCH"
```

If a previous push exists and you rebased, use `--force-with-lease` (not `--force`):

```bash
git push --force-with-lease origin "$BRANCH"
```

### Step 4: Compose the PR title and body

**Title:** short, imperative, standalone. Same rules as a commit subject — `Add task creation endpoint`, not `Adding...` or `[WIP] tasks`. Under 70 characters. No issue numbers in the title; put them in the body.

**Body:** uses the template below. Every section is filled with real content — no placeholders left behind.

```markdown
## Summary

<2–4 sentences: what this PR changes and why. Lead with the user-visible
or system-visible outcome, not the implementation.>

## Changes

- <Bullet per logical change. One bullet per commit is a good starting point.>
- <Cross-reference design docs, specs, or issues by path / number.>

## Test Plan

- [ ] <How a reviewer or CI verifies this works>
- [ ] <Edge cases covered>
- [ ] <Manual steps if any (URL, command, fixture)>

## Risks / Rollback

- <Known risks, migration notes, feature-flag state, or "low risk: pure refactor">
- <Rollback path: revert commit, flip flag, re-run migration down>

## Linked Issues

- Closes #<n>  /  Refs #<n>  /  (none)

## Reviewer Focus  (optional)

- <Files, modules, or axes that deserve extra scrutiny — concurrency, error paths, state machines, etc.>
- <Omit this section for small or self-evident diffs.>

## Context not in the diff  (optional)

- <Upstream constraints, prior decisions, known compromises, deferred follow-ups.>
- <Things a reviewer cannot infer from the code alone. Omit if there is nothing to add.>
```

Adjust sections to fit the change — a docs-only PR doesn't need Risks; a migration PR must have it. The two `(optional)` sections may be dropped entirely when they would be filler. Don't pad sections with placeholder content.

**No tool / model attribution.** Same rule as commit messages: no `Co-Authored-By:`, no `Generated with ...`, no banners. The PR author field already records authorship.

### Step 5: Create the PR

Always pipe the body via stdin with `--body-file -`. Never inline `\n` into `--body` — `gh` won't expand them and the PR ends up as one long line.

```bash
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "<title>" \
  --body-file - <<'EOF'
## Summary
...

## Changes
- ...

## Test Plan
- [ ] ...

## Risks / Rollback
- ...

## Linked Issues
- (none)
EOF
```

For draft PRs (early feedback, not yet review-ready) add `--draft`.

### Step 6: Verify and report

```bash
gh pr view --json number,url,title,state,isDraft,headRefName,baseRefName
```

Report back:

- PR number and URL
- Base ← head branches
- Draft / ready state
- One-line summary of what was opened

## PR Size Guidance

Same thresholds as commits — see [git/references/commit.md](../git/references/commit.md):

| Diff size | Action |
|---|---|
| ≤ ~300 lines | Open as-is. |
| ~300–800 lines | Acceptable if it's one logical change with related tests. Call out scope in the body. |
| > ~1000 lines | Split before opening. Stack PRs, separate refactor from feature, or split by file group. |

Exceptions: complete deletions, lockfile updates, automated codemods where reviewers verify intent rather than every line. Flag these explicitly in the body.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The diff explains itself, I'll skip the body." | A reviewer reads the body first to know where to focus. An empty body burns reviewer time. |
| "I'll write the description after review starts." | Reviewers anchor on whatever is there at minute zero. Compose the body before opening. |
| "It's just one commit, I don't need a Test Plan." | Test Plan is for the reviewer, not for you. State how they verify the change. |
| "I'll force-push fixes during review." | Use `--force-with-lease` on your own branch only, and announce rebases in the PR thread. Never force-push the base. |
| "The base is obviously main." | Repos with release branches, monorepos, and forks make this non-obvious. Detect, don't assume. |
| "Co-Authored-By is required by the tool." | It isn't. Authorship is recorded by git. Strip attribution before opening. |

## Red Flags

- Opening a PR with `WIP`, `fixup!`, or `Phase N` in the title or commit history.
- `--body` with literal `\n` instead of real newlines (use `--body-file -`).
- Force-push to `main` or any shared branch.
- Bundling unrelated changes ("auth fix + dependency bump + new feature").
- Empty or template-only PR body.
- Branch not synced with base — diff includes commits already on base.
- PR opened against the wrong base (e.g. `main` when the team uses `develop`).

## Verification

Before reporting the PR as opened:

- [ ] Branch detected, base detected, head is a feature branch.
- [ ] Branch is synced (rebased or merged) with the base.
- [ ] Local tests passed; commits are atomic and conventionally formatted.
- [ ] Title is short, imperative, standalone; under 70 chars.
- [ ] Body filled via `--body-file -`: Summary, Changes, Test Plan, Risks/Rollback, Linked Issues; optional Reviewer Focus and Context-not-in-the-diff included only when they add signal.
- [ ] No `Co-Authored-By`, model, or tool attribution in title, body, or commits.
- [ ] PR URL returned and confirmed reachable via `gh pr view`.
