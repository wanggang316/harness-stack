---
allowed-tools: Bash(git fetch:*), Bash(git pull:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rebase:*), Bash(git merge:*), Bash(git add:*), Bash(git push:*), Bash(git rev-list:*), Bash(git worktree:*), Bash(git ls-files:*), Read
description: Catch the current worktree's branch up with the latest main (rebase)
model: claude-haiku-4-5
---

按 `harness-stack:git` 的 update-from-main 规范（`skills/git/references/update-from-main.md`）把最新的 `main` 整合进当前分支：默认 rebase 路线，conflict 解决见 `sync.md`，merge 路线见 `pull.md`，push 语义见 `push.md`。
