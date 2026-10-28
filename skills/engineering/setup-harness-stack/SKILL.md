---
name: setup-harness-stack
description: Configure the current project's ticket tracker (GitHub, GitLab, or Linear) and its ticket state machine, and create the missing state labels or states after the user approves.
disable-model-invocation: true
metadata:
  credits:
    skill: setup-matt-pocock-skills
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md"
---

# setup-harness-stack

Record where this project's tickets live and how the [ticket state machine](references/state-machine.md) is spelled on that tracker, then make the tracker able to represent every state. Configuration goes to `~/.harness-stack/<project>/`, never into the repository; [tickets.md](references/tickets.md) explains how `<project>` is derived and how other skills read the result.

Explore first, then ask one section at a time, leading each with a recommendation the user can accept in one word. Skip a section that exploration already settled. Write nothing and create nothing on the tracker until the user confirms the drafts in step 3.

## 1. Explore

- `git remote -v`: the `origin` host and path give `<project>` and suggest the platform. Without `origin`, stop and tell the user: the configuration has no key.
- `~/.harness-stack/<project>/`: update existing `issue-tracker.md` and `state-machine.md` in place. A `triage-labels.md` from an earlier version is no longer read; offer to delete it.
- Tool access for the likely platform: `gh auth status`, `glab auth status`, or a Linear API key (see [linear.md](references/linear.md)). Report a missing login; the files can still be written.
- Existing state vocabulary on the tracker: labels (`gh label list`, `glab label list`) or the Linear team's workflow states. Note names that already mean a canonical state, such as `status: in review` or Linear's `In Review`.
- Ask whether another tool already drives tickets on this tracker. Its state names must match the ones written here.

## 2. Ask

**A. Tracker.** Recommend the platform `origin` points to (GitHub or GitLab), or the tracker the user already uses for this repository. Then confirm the target:

- GitHub: `owner/repo`, defaulting to `origin`. In a fork, ask whether tickets go to `origin` or `upstream`.
- GitLab: the project path, defaulting to `origin`.
- Linear: the team key (for example `ENG`) and, optionally, the project that new tickets are filed under.

The target must be reachable: `gh repo view <owner/repo>`, `glab repo view <path>`, or a Linear `teams` query returns it. If it cannot, write the files anyway and report what is missing.

**B. State names.** Show the canonical states with the name each would use on this tracker. Recommend the canonical names, reusing an existing equivalent label or state where one exists. If another tool drives the same tickets, its names must match; point out any name that differs.

**C. Create what is missing.** List the labels (GitHub, GitLab) or workflow states (Linear) the tracker lacks, with the colors and types from the platform file. Ask whether to create them now. Creating them is the only tracker write this skill makes, and only after an explicit yes.

## 3. Confirm and write

Show the drafts of both files and the list of labels or states to create. After the user confirms, write the files, then create the approved labels or states with the platform file's **Setup** commands. Report each creation that fails with its error; do not retry it under another name.

`issue-tracker.md`:

```markdown
# Issue tracker

Platform: github            # github | gitlab | linear
Target: <owner>/<repo>      # GitLab project path, or Linear team key
Project: <Linear project>   # Linear only, optional

Operations: harness-stack setup-harness-stack/references/<platform>.md
```

`state-machine.md`:

```markdown
# State machine

Canonical states: harness-stack setup-harness-stack/references/state-machine.md

| State | Name on tracker |
|---|---|
| Backlog | Backlog |
| Todo | Todo |
| In Progress | In Progress |
| In Review | In Review |
| Reviewed | Reviewed |
| Merging | Merging |
| Done | closed (completed) |
| Canceled | closed (not planned) |
```

For Linear, `Done` and `Canceled` are workflow state names like the others.

## 4. Report

List the files written, the labels or states created, anything that failed or still needs a person (missing login, missing Linear admin rights), and any name another tool must change to match. Tell the user both files can be edited by hand; skills read whatever they contain.
