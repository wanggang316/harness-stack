---
name: setup-harness-stack
description: Configure this project's ticket tracker (GitHub, GitLab, or Linear) and the labels or states that represent ticket states, and create the missing ones after the user approves. Also defines where that configuration lives.
disable-model-invocation: true
metadata:
  credits:
    skill: setup-matt-pocock-skills
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md"
---

# setup-harness-stack

Scaffold the per-project ticket configuration that ticket-aware skills read:

- **Issue tracker**: where tickets live and how each ticket operation runs on that platform.
- **State labels**: the label or state name the tracker uses for each canonical ticket state.

Explore, present what you found, confirm with the user, then write. Nothing goes into the repository.

## Where the configuration lives

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`). Every clone and worktree of a repository shares it.

| File | Content |
| --- | --- |
| `issue-tracker.md` | The platform, its target, and the commands for each ticket operation |
| `state-labels.md` | Each canonical state mapped to the tracker's name for it |

A skill that needs tickets reads both files. When they are missing, it tells the user to run `/setup-harness-stack`.

## 1. Explore

- `git remote -v`: the `origin` host and path give `<project>` and suggest the platform. Without `origin`, stop and tell the user: the configuration has no key.
- The configuration directory: update existing files in place.
- Tool access: `gh auth status`, `glab auth status`, or a Linear API key (see [issue-tracker-linear.md](issue-tracker-linear.md)). Report a missing login; the files can still be written.
- Existing labels (`gh label list`, `glab label list`) or the Linear team's workflow states. Note names that already mean a canonical state, such as `status: in review`.

## 2. Ask

Take one section at a time, leading with the recommended answer so the user can accept it in a word. Skip a section that exploration already settled.

**A. Issue tracker.** Recommend the platform `origin` points to (GitHub or GitLab), or the tracker the user already uses for this repository. Confirm the target:

- GitHub: `owner/repo`, defaulting to `origin`. In a fork, ask whether tickets go to `origin` or `upstream`.
- GitLab: the project path, defaulting to `origin`.
- Linear: the team key (for example `ENG`) and, optionally, the project new tickets are filed under.

The target must be reachable (`gh repo view`, `glab repo view`, or a Linear `teams` query). If it is not, write the files anyway and report what is missing.

**B. State labels.** Ask exactly one question: keep the default names from [state-labels.md](state-labels.md)? Recommend yes. On no, usually because the tracker already uses other names, collect the overrides so existing labels or states are reused instead of duplicated. If another tool already drives tickets on this tracker, its names must match.

**C. Create what is missing.** List the labels (GitHub, GitLab) or workflow states (Linear) the tracker lacks. Ask whether to create them now. This is the only tracker write this skill makes, and only after an explicit yes.

## 3. Confirm and write

Show drafts of both files and the list of labels or states to create. After the user confirms:

1. Write `issue-tracker.md` from the matching seed, with the target filled in: [issue-tracker-github.md](issue-tracker-github.md), [issue-tracker-gitlab.md](issue-tracker-gitlab.md), or [issue-tracker-linear.md](issue-tracker-linear.md).
2. Write `state-labels.md` from [state-labels.md](state-labels.md), with any overrides in the "Label in our tracker" column.
3. Create the approved labels or states with the seed's **Setup** commands. Report each failure with its error; do not retry under another name.

## 4. Report

List the files written, the labels or states created, and anything that still needs a person (a missing login, missing Linear admin rights). Tell the user both files can be edited by hand; skills read whatever they contain.
