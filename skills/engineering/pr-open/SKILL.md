---
name: pr-open
description: Open a pull request from a committed feature branch. Detect the base, sync and push, write a visual summary with evidence, and create the PR with gh. Use when asked to open a PR or rewrite an existing PR title and body for the current diff. Excludes committing, review, and merging.
metadata:
  credits:
    skill: show-me
    author: Dex Horthy
    organisation: Humanlayer
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

# pr-open

Write the PR body for a reviewer who has not read your conversation. Within one screen, they should understand **what changed** (Summary), **why they can trust it** (Evidence), and **how risky it is to merge** (Merge Danger). This skill turns a branch into that PR.

A request to open a PR authorizes pushing **your own** feature branch and creating the PR. Ask before actions outside that scope, such as force-pushing a shared branch, changing the base, or splitting the branch.

## Step 1: Preflight

```bash
git status --short                                   # must be empty
git branch --show-current                            # must be a feature branch
git remote get-url origin && gh auth status          # remote and gh login must exist
gh pr list --head "$(git branch --show-current)" --state open --json number,url
```

`gh pr list` returns `[]` with exit code 0 when no PR exists. A nonzero exit indicates an environment problem, such as network or permissions, not the absence of a PR.

- Dirty worktree: stop and return control to the user.
- Current branch is `main`, `master`, or the base: stop; a PR needs a feature branch.
- Missing remote, unauthenticated `gh`, or nonzero `gh pr list`: stop and report.
- An open PR already exists for this branch: skip creation and go to Step 4, then use `gh pr edit` to update its title and body.
- Commit subjects contain `WIP` or `fixup!`, or commits contain `Co-Authored-By` or model attribution: stop for history cleanup first.

## Step 2: Detect base and sync

```bash
BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
git fetch origin "$BASE"
git log --oneline "HEAD..origin/$BASE" | head        # commits on base you don't have
git diff --stat "origin/$BASE...HEAD" | tail -1      # diff size
```

- Use an explicit user target, such as a release branch or `develop`. Ask if the default branch appears inconsistent with the team's actual target.
- If the base advanced, run `git rebase "origin/$BASE"`. Resolve conflicts before pushing; stop and report if they cannot be resolved.
- Open normally for a diff up to about 800 lines. Above that, propose splitting it, such as stacked PRs or separate refactor and feature PRs. Whole-file deletions, lockfiles, and codemods are exceptions; explain them in the body.

## Step 3: Push

Run only the command appropriate to the situation:

```bash
BRANCH=$(git branch --show-current)

# Normal case: first push, or new commits on top of the remote branch
git push -u origin "$BRANCH"

# Only after Step 2 rebased a branch that you alone push to
git push --force-with-lease -u origin "$BRANCH"
```

If rejected, identify why. For authentication, permissions, or branch protection, stop and report without bypassing controls. For new remote commits, return to Step 2, sync, and retry. After pushing, use `git status -sb` to confirm synchronization with `origin/$BRANCH`.

## Step 4: Compose title and body

Read the full diff with `git diff "origin/$BASE...HEAD"`, using the same range as Step 2, and the commit list before writing. Use domain vocabulary from the repository's glossary, such as `CONTEXT.md` or `GLOSSARY.md`. Follow the language of recent PRs from `gh pr list --state merged --limit 5`, or English if there is no precedent.

**Title**: use conventional-commit format, an imperative, self-contained statement, and at most 70 characters, such as `feat(auth): add session refresh endpoint`. Put issue numbers in the body.

**Body**:

```markdown
## Summary

<one or two sentences: what changes and why, as an outcome>

<the smallest visual that makes the key point clear>

## Evidence

- **Before:** <failing test / output / screenshot>
  **After:** <passing test / output / screenshot>

## Merge Danger

**Door:** <one-way | two-way>

<only when not obvious: why>

**Blast Radius:** <one word>

<only when not obvious: who or what could break>

## Linked Issues

Closes #<n>
```

- **Summary**: state the outcome in one or two sentences, followed by **one** visual that best explains it: pseudocode, call tree, component tree, file tree, Mermaid, or a `diff` of one of these shapes. See [references/summary-visuals.md](references/summary-visuals.md) for selection and examples. Include only calls, files, states, and boundaries needed to explain the change.
- **Evidence**: include only results you **actually obtained**. Prefer screenshots for visual changes when capture is available, then test or command output. Name the test that failed before and passed after. Without presentable evidence, write `Not verified: <reason>`; do not invent it.
  - Prefer Red output actually observed during TDD in this session. Otherwise, run the new test against the base in a temporary worktree outside the repository:

    ```bash
    wt="$(mktemp -d)/before"
    git worktree add --detach "$wt" "origin/$BASE"
    git -C "$wt" checkout "$BRANCH" -- <test-files>    # bring in only the new tests
    (cd "$wt" && <test-command>)                       # expect red
    git worktree remove --force "$wt"
    ```
- **Merge Danger**: a two-way door is cheaply reversible through a revert or flag. Data migrations, destructive operations, external releases, or public API changes that external consumers depend on and cannot be withdrawn after release are one-way doors. Repository-internal behavior changes, including return-value semantics, remain two-way when reverted together; identify affected consumers in Blast Radius. Use one word for the affected area, such as `none`, `internal`, `consumers`, `data`, or `layout`, with one or two explanatory sentences when needed.
- **Linked Issues**: use `Closes #n` or `Refs #n`. Omit the section when none apply.
- Omit preambles, placeholders, and empty sections. Exclude tool, model, or agent attribution from the title and body, including `Co-Authored-By` and `Generated with ...`.

## Step 5: Create or update

Pass the body through stdin. Literal `\n` in `--body` does not expand. Create a ready-for-review PR by default; add `--draft` only when requested.

```bash
gh pr create --base "$BASE" --head "$BRANCH" --title "<title>" --body-file - <<'EOF'
<body>
EOF

# Existing PR from Step 1:
gh pr edit <number> --title "<title>" --body-file - <<'EOF'
<body>
EOF

gh pr view --json number,url,baseRefName,headRefName,isDraft
```

## Step 6: Report

Return the PR number, URL, `base ← head`, and draft or ready status.

## Verification

- [ ] The worktree is clean, head is a feature branch, and it is synchronized with the latest `origin/$BASE`.
- [ ] No duplicate PR was created for the same branch.
- [ ] The title uses conventional-commit format and is at most 70 characters.
- [ ] The body includes Summary with a visual, Evidence, and Merge Danger. Evidence comes from actual execution or is explicitly marked `Not verified`.
- [ ] The title, body, and commits contain no tool, model, or agent attribution.
- [ ] The user received the PR URL verified through `gh pr view`.
