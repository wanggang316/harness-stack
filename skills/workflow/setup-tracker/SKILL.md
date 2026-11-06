---
name: setup-tracker
description: "Configure this project's ticket tracker (GitHub, GitLab, or Linear): where tickets live, the workflow states and labels, who tickets are assigned to, and how each ticket operation runs there. Also defines where that configuration lives."
disable-model-invocation: true
---

# setup-tracker

Write the per-project tracker configuration that the workflow skills read, and make the tracker able to hold the workflow: its states and labels. This skill creates no tickets. Nothing goes into the repository.

Explore, present what you found, confirm with the user, then write.

## Where the configuration lives

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`). Every clone and worktree of a repository shares it.

| File | Content |
| --- | --- |
| `issue-tracker.md` | The platform, its target, the workflow states, assignee, and labels, and the commands for each ticket operation |

A skill that needs tickets reads this file. When it is missing, the skill tells the user to run `/setup-tracker`.

## The workflow states

Every tracker holds the same states, so tickets move the same way whoever drives them (a person, `shepherd-tickets`, or an automation such as agent-workflow):

| State | Meaning | Default name |
| --- | --- | --- |
| backlog | Published, but must not start now: a spec waiting to be split, work waiting on something other than a ticket, or deliberately deferred work | `Backlog` |
| todo | Ready; work starts once no open ticket blocks it | `Todo` |
| in-progress | Being implemented | `In Progress` |
| in-review | Implemented, under review | `In Review` |
| reviewed | Review is clean; waits for a merge decision | `Reviewed` |
| merging | Approved to merge | `Merging` |
| needs-human | A run cannot continue without a person | `Needs Human` |
| done | Merged or otherwise complete | GitHub/GitLab: closed issue; Linear: `Done` |

On GitHub and GitLab a state is a label; an open issue carries exactly one state label. On Linear it is the team's workflow state. Keep the default names unless the user or an existing tracker already spells them differently; whatever drives the tickets must use the same names.

## 1. Explore

- `git remote -v`: the `origin` host and path give `<project>` and suggest the platform. Without `origin`, stop and tell the user: the configuration has no key.
- The configuration directory: update existing files in place and keep what the user edited by hand.
- Tool access: `gh auth status`, `glab auth status`, or a Linear API key (see [issue-tracker-linear.md](issue-tracker-linear.md)). Report a missing login; the file can still be written.
- With access: the states and labels the target already has, and the authenticated user (the default assignee). Use the seed's **Check access** and **List the states and labels** commands.

## 2. Ask

Lead with the recommended answer so the user can accept it in a word; skip what exploration already settled.

- **Platform and target.** Recommend the platform `origin` points to (GitHub or GitLab), or the tracker the user already uses for this repository.
  - GitHub: `owner/repo`, defaulting to `origin`. In a fork, ask whether tickets go to `origin` or `upstream`.
  - GitLab: the project path, defaulting to `origin`.
  - Linear: the team key (for example `ENG`) and, optionally, the project new tickets are filed under.
- **State names.** The defaults above, or the existing spelling when the tracker already has an equivalent state.
- **Assignee.** Who published tickets are assigned to, defaulting to the authenticated user. Automation that picks tickets by assignee only sees tickets assigned to this account, so record the concrete login or user, not "me".
- **Labels.** The type labels a publishing skill picks one from per ticket (default `bug`, `enhancement`, `documentation`), and labels every published ticket gets (default none).

## 3. Confirm and write

Show the draft, and list the states and labels the tracker lacks. After the user confirms:

1. Write `issue-tracker.md` from the matching seed, with the target, state names, assignee, and labels filled in: [issue-tracker-github.md](issue-tracker-github.md), [issue-tracker-gitlab.md](issue-tracker-gitlab.md), or [issue-tracker-linear.md](issue-tracker-linear.md).
2. Create the missing states and labels with the seed's **Create a missing state or label** commands, one per command, checking each result. Existing ones stay as they are. When an item cannot be created (no permission, a Linear state type the API rejects), keep going and report it for a person to add.

When the target is unreachable, write the file anyway, create nothing, and report what is missing.

## 4. Report

Give the path written, the states and labels created, and anything that still needs a person (a missing login, an unreachable target, an item that could not be created). Tell the user the file can be edited by hand; skills read whatever it contains.
