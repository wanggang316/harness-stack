---
name: setup-harness-stack
description: Configure the current project's GitHub issue repository and the labels mapped to triage roles.
disable-model-invocation: true
---

# setup-harness-stack

Use `~/.harness-stack/<owner>.<repo>/` as the configuration directory, deriving `<owner>/<repo>` from the GitHub repository at `origin`. If no GitHub `origin` exists, stop and tell the user.

## 1. Explore

- Identify the GitHub repositories referenced by each remote.
- Check for existing configuration and update it in place when present.
- Read the target repository's existing labels.

## 2. Ask

Ask one section at a time, with a recommendation the user can confirm in one word. Skip sections already resolved by inspection.

**A. Issue repository.** Recommend `origin`. If another remote such as `upstream` points to a different repository in a fork setup, ask which one should receive issues.

**B. Triage labels.** harness-stack uses four triage roles:

| Role | Meaning |
| --- | --- |
| `agent-todo` | Needs agent implementation |
| `agent-done` | Agent implementation is complete |
| `needs-info` | Needs more information from the author |
| `wontfix` | No fix required |

Recommend label names that match the roles. Prefer an existing equivalent label, such as `status:needs-info`, when available. If a mapped label does not exist, ask whether to create it now.

## 3. Confirm and write

Show drafts of both files and the labels to create. Write the files and create labels after the user confirms.

`issue-tracker.md`:

```markdown
# Issue tracker

Repo: <owner>/<repo>
```

`triage-labels.md`:

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

List written file paths and created labels. Tell the user they can edit both files directly.
