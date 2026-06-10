---
allowed-tools: Bash(gh issue list:*), Bash(gh issue view:*), Bash(gh search issues:*), Bash(gh issue create:*), Bash(git remote:*), Read, Skill(harness-stack:feedback)
description: 复盘本次 harness-stack 使用，并把值得上报的摩擦/缺陷/建议提成上游 Issue
argument-hint: "[可选：想反馈的点，留空则从本次会话复盘]"
---

按 `harness-stack:feedback` 的流程（`skills/feedback/SKILL.md`）复盘并反馈。

## Context
- Argument: $ARGUMENTS

## Your task

加载并执行 `harness-stack:feedback` skill，按其 Process 逐步进行：复盘 → 分诊 → 查重 → 起草 → 确认 → 提交。

- 有 `$ARGUMENTS` 时，以它为复盘的切入点；留空则从刚结束的这段使用整体复盘。
- 目标仓库恒为 harness-stack 上游 `wanggang316/harness-stack`，绝不用当前项目的 origin。
- 开源公开仓库，任何 GitHub 账号无需写权限即可开 Issue；无 `gh` 时改走网页预填链接。
- `gh issue create` 前必须取得用户明确确认。
