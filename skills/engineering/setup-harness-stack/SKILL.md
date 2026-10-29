---
name: setup-harness-stack
description: Configure this project's ticket tracker (GitHub, GitLab, or Linear): where tickets live and how each ticket operation runs there. Also defines where that configuration lives.
disable-model-invocation: true
metadata:
  credits:
    skill: setup-matt-pocock-skills
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md"
---

# setup-harness-stack

Scaffold the per-project ticket configuration that ticket-aware skills read: where tickets live and how each ticket operation runs on that platform. This skill writes configuration only; it creates nothing on the tracker.

Explore, present what you found, confirm with the user, then write. Nothing goes into the repository.

## Where the configuration lives

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`). Every clone and worktree of a repository shares it.

| File | Content |
| --- | --- |
| `issue-tracker.md` | The platform, its target, and the commands for each ticket operation |

A skill that needs tickets reads this file. When it is missing, the skill tells the user to run `/setup-harness-stack`.

## 1. Explore

- `git remote -v`: the `origin` host and path give `<project>` and suggest the platform. Without `origin`, stop and tell the user: the configuration has no key.
- The configuration directory: update existing files in place.
- Tool access: `gh auth status`, `glab auth status`, or a Linear API key (see [issue-tracker-linear.md](issue-tracker-linear.md)). Report a missing login; the file can still be written.

## 2. Ask

Lead with the recommended answer so the user can accept it in a word; skip what exploration already settled.

Recommend the platform `origin` points to (GitHub or GitLab), or the tracker the user already uses for this repository. Confirm the target:

- GitHub: `owner/repo`, defaulting to `origin`. In a fork, ask whether tickets go to `origin` or `upstream`.
- GitLab: the project path, defaulting to `origin`.
- Linear: the team key (for example `ENG`) and, optionally, the project new tickets are filed under.

The target must be reachable, checked with the seed's **Check access** commands. If it is not, write the file anyway and report what is missing.

## 3. Confirm and write

Show the draft. After the user confirms, write `issue-tracker.md` from the matching seed, with the target filled in: [issue-tracker-github.md](issue-tracker-github.md), [issue-tracker-gitlab.md](issue-tracker-gitlab.md), or [issue-tracker-linear.md](issue-tracker-linear.md).

## 4. Report

Give the path written and anything that still needs a person (a missing login, an unreachable target). Tell the user the file can be edited by hand; skills read whatever it contains.
