---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git commit:*), Bash(git restore:*), Bash(grep:*), Read
description: Create an atomic git commit with conventional-commit format and no attribution trailers
model: claude-haiku-4-5
---

## Context

- Git status: !`git status`
- Staged + unstaged diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Task

读 `skills/git/references/commit.md` 并按它创建 commit——那是规则的唯一来源（conventional format、atomic、body 说 why、here-doc `-F`、无 attribution trailer、无 planning 引用、提交前扫 secret）。

1. 审上面的 diff。若它混了不相关的关注点，**停下**，告诉用户你会怎么拆，而不是一次性全提交。
2. 显式按路径 stage（避免 `git add -A` 带入未追踪的 secret/artifact），创建 commit，报告 hash + 一行摘要。

绝不 `--force` / `reset --hard` / `rebase -i` / 改写历史；绝不 `--no-verify`；hook 失败就修根因再新建 commit，不 `--amend` 掩盖。
