---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git commit:*), Bash(git restore:*), Bash(grep:*)
description: Create an atomic git commit with conventional-commit format and no attribution trailers
model: claude-haiku-4-5
---

## Context

- Git status: !`git status`
- Staged + unstaged diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Commit Rules

- **Conventional Commits**: `<type>: <short imperative description>`
  - Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`
- **Atomic**: one commit does one logical thing. If the diff mixes refactor + feature, or formatting + behavior, split it first (`git restore --staged` and re-stage by path).
- **Subject line**: short, imperative, standalone (`Delete the FizzBuzz RPC`, not `Deleted...` / `Updating...`).
- **Body** (when non-trivial): explain *why*, not *what*. Reference design decisions, constraints, or context not visible in the diff.
- **Anti-patterns**: `fix bug`, `update X`, `misc` — none of these survive history.
- **No planning refs**: never use planning/task/milestone numbers (`Phase 1`, `Slice 2`, `D-12`, `Q3 cleanup`, `see ExecPlan`) as commit content. These rot. Describe the change itself.
- **No discussion recap**: the body describes the delivered change, not the alternatives weighed or the conversation that led to it. State rationale, don't narrate deliberation. Long rationale belongs in the PR description.
- **No attribution lines**: never append `Co-Authored-By:`, `Generated with ...`, or any model/tool banner. Strip such lines if tooling injects them.
- **No secrets**: scan the staged diff for `password`, `secret`, `api_key`, `token` before committing.

## Your task

1. Review the diff above. If it mixes unrelated concerns, **stop** and tell the user how you would split it instead of committing everything at once.
2. Pick the right type and write a focused subject line. Add a body only when intent isn't obvious from the diff.
3. Stage what belongs to this commit (prefer explicit paths over `git add -A` to avoid pulling in untracked secrets/artifacts).
4. Create the commit with a heredoc-formatted message.
5. Report the resulting commit hash and a one-line summary.

## Important

- **Preserve work**: never `git push --force`, `git reset --hard`, `git rebase -i`, or otherwise rewrite history.
- **No hook bypassing**: do not pass `--no-verify` or `--no-gpg-sign` unless the user explicitly asks.
- **Handle errors**: if a pre-commit hook fails, fix the underlying issue and create a new commit — never `--amend` to hide a hook failure.
