---
allowed-tools: Bash(git fetch:*), Bash(git pull:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git rebase:*), Bash(git add:*), Bash(git push:*), Bash(git rev-list:*), Bash(git ls-files:*), Read
description: Pull --rebase from upstream, resolve conflicts, then push
model: claude-haiku-4-5
---

## Context

- Branch: !`git branch --show-current`
- Status: !`git status`
- Upstream: !`git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "(no upstream)"`
- Ahead/behind: !`git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "(no upstream)"`
- Recent commits: !`git log --oneline -10`

## Task

读 `skills/git/references/sync.md` 并按它执行（rebase 路线：pre-flight → rebase → 解决冲突 → push），push 语义见 `skills/git/references/push.md`。那两份是流程的唯一来源。

不可越界的红线：工作区不干净或没有 upstream → **停下**让用户处理（不自动 stash、不丢弃）；冲突要按意图解决、绝不 `git rebase --skip`；push 被拒先按 sync vs 认证/权限分类，**绝不**自动 `--force` / `--force-with-lease`、绝不为糊弄认证改写 remote URL。收尾报告：rebase 了几个 commit、哪些文件有过冲突、最终 HEAD vs upstream。
