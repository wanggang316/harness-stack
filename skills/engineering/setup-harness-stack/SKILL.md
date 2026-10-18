---
name: setup-harness-stack
description: 为当前项目配置 Issue 发布到哪个 GitHub 仓库，以及 triage 角色对应哪些 label。
disable-model-invocation: true
---

# setup-harness-stack

配置目录是 `~/.harness-stack/<owner>.<repo>/`，`<owner>/<repo>` 取自 `origin` 指向的 GitHub 仓库。没有 GitHub `origin` 时停下告诉用户。

## 1. Explore

- 各个 remote 指向哪些 GitHub 仓库。
- 配置目录里是否已有配置。有就在它的基础上更新。
- 目标仓库已有的 label。

## 2. Ask

逐节问，每节先给推荐答案，用户一个词就能确认。探索已经能确定的节直接跳过。

**A. Issue 仓库。** 推荐 `origin`。有 `upstream` 之类指向另一个仓库的 remote（fork）时，问 Issue 发到哪一个。

**B. Triage labels。** harness-stack 用四个 triage 角色：

| Role | Meaning |
|---|---|
| `agent-todo` | 需要 agent 实现 |
| `agent-done` | agent 已实现完成 |
| `needs-info` | 需要作者补充信息 |
| `wontfix` | 无需修复 |

推荐 label 名与角色同名。仓库已有含义相同的 label（例如 `status:needs-info`）时，推荐映射到它。映射到的 label 在仓库里不存在时，问用户是否现在创建。

## 3. Confirm and write

先展示两个文件的草稿和要创建的 label，用户确认后再写入、创建。

`issue-tracker.md`：

```markdown
# Issue tracker

Repo: <owner>/<repo>
```

`triage-labels.md`：

```markdown
# Triage labels

| Role | Label |
|---|---|
| agent-todo | agent-todo |
| agent-done | agent-done |
| needs-info | needs-info |
| wontfix | wontfix |
```

## 4. Report

列出写入的文件路径和创建的 label，告诉用户可以直接编辑这两个文件。
