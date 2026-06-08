---
allowed-tools: Bash(git fetch:*), Bash(git pull:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rebase:*), Bash(git add:*), Bash(git push:*), Bash(git rev-list:*), Bash(git ls-files:*), Read
description: Pull --rebase from upstream, resolve conflicts, then push
model: claude-haiku-4-5
---

按 `harness-stack:git` 的 sync 规范（`skills/git/references/sync.md`，push 语义见 `push.md`）同步并发布当前分支。
