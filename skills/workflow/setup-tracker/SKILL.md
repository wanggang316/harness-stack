---
name: setup-tracker
description: "Set up this project's ticket tracker for the workflow skills: where tickets live (GitHub, GitLab, or Linear), the workflow state labels, the assignee, and the type labels. Run before the first to-spec, to-tickets, grill-spec-tickets, or shepherd-tickets, or to change any of these."
disable-model-invocation: true
---

# setup-tracker

Scaffold the per-project configuration that the workflow skills assume, and bring the tracker's labels in line with it:

- **Issue tracker**: where tickets live and the commands for each ticket operation
- **Workflow states**: the label (or Linear state) used for each workflow state
- **Assignee and type labels**: who published tickets are assigned to, and how they are classified

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, let the user decide, confirm, then write. It creates no tickets and writes nothing into the repository.

## Where the configuration lives

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`). Every clone and worktree of a repository shares it.

| File | Content | Seed |
| --- | --- | --- |
| `issue-tracker.md` | The platform, its target, and the commands for each ticket operation | [GitHub](issue-tracker-github.md), [GitLab](issue-tracker-gitlab.md), [Linear](issue-tracker-linear.md) |
| `workflow.md` | The state labels, the assignee, and the type labels | [workflow.md](workflow.md) |

Skills that need tickets read both files. When they are missing, the skill tells the user to run `/setup-tracker`.

## Process

### 1. Explore

Read whatever exists; do not assume:

- `git remote -v`: the `origin` host and path give `<project>` and suggest the platform. Without `origin`, stop: the configuration has no key.
- `~/.harness-stack/<project>/`: does earlier output of this skill exist? Then this run updates it in place and keeps the user's hand edits.
- Tool access: `gh auth status`, `glab auth status`, or a Linear API key (see the Linear seed). Report a missing login; the files can still be written.
- With access: every label (and on Linear, every workflow state) the target has, and how many open tickets carry each one; and the authenticated user. Use the seed's **list the states and labels** commands.

### 2. Present findings and ask

Summarize what exists and what is missing. Then walk the user through the decisions **one section at a time**: present a section, get the answer, then move on. Each section starts with a short explainer (what it is, why the skills need it, what changes with a different choice), then the options with the recommended one first.

**Section A: Issue tracker.**

> Explainer: the workflow skills publish and follow tickets on one tracker. They need to know which one, and which repository or team, to run the right commands.

Recommend the platform `origin` points to (GitHub or GitLab), or the tracker the user already uses for this repository. Confirm the target:

- **GitHub**: `owner/repo`, defaulting to `origin`. In a fork, ask whether tickets go to `origin` or `upstream`.
- **GitLab**: the project path, defaulting to `origin`.
- **Linear**: the team key (for example `ENG`) and, optionally, the project new tickets are filed under.

**Section B: Workflow states.**

> Explainer: a ticket moves through `backlog → todo → in-progress → in-review → reviewed → merging → done`, and goes to `blocked` when the work cannot continue without a person. `blocked` is a state, not a blocking edge: a todo ticket waiting for its blockers stays in todo. Publishing skills set the first state; whoever drives the tickets (a person, `shepherd-tickets`, or automation such as agent-workflow) moves them on. Every one of them must use the same names, or a ticket stops being seen.

The standard names, used unless the user chooses otherwise:

| State | GitHub / GitLab label | Linear state (type) |
| --- | --- | --- |
| backlog | `backlog` | `Backlog` (backlog) |
| todo | `todo` | `Todo` (unstarted) |
| in-progress | `in-progress` | `In Progress` (started) |
| in-review | `in-review` | `In Review` (started) |
| reviewed | `reviewed` | `Reviewed` (started) |
| merging | `merging` | `Merging` (started) |
| blocked | `blocked` | `Blocked` (started) |
| done | the issue is closed | `Done` (completed) |

Labels are lowercase and hyphenated, like the platforms' own default labels (`bug`, `good first issue` aside). Linear states follow Linear's own Title Case. On GitHub and GitLab an open issue carries exactly one state label.

Compare the standard names with what exploration found, and sort every state into one case:

| Case | Example | Options (recommended first) |
| --- | --- | --- |
| The standard label exists | `todo` | Use it. Nothing to decide |
| An equivalent exists under another spelling | `In Progress` for in-progress | **Rename** it to the standard name: issues keep the label, only its name changes. **Keep** the existing name and record it in `workflow.md`. |
| No equivalent exists | no `merging` label | **Create** the standard label. **Map** the state to another existing label the user names. |

Then list the labels that look like retired workflow states (for example `Needs Info`, `needs-triage`, `Triage`), with the number of open tickets carrying each:

- **Keep** it untouched (recommended when unsure).
- **Move and delete**: move its open tickets to a state the user picks, then delete the label.
- **Delete** it (only when no open ticket carries it).

Leave every other label alone (`duplicate`, `good first issue`, and so on); the skills neither use nor manage them.

Ask for one choice that applies to every row of a case (for example "rename all equivalents"), then let the user override single rows. A rename changes a name other tools may match on: when something else drives the tickets, such as an agent-workflow rule set, say which of its state names must change too (for agent-workflow: `state_alias`, `other_states`, `attention_state`). This skill does not edit those files.

**Section C: Assignee.**

> Explainer: published tickets are assigned to one account. Automation that picks tickets by assignee sees only tickets assigned to the account it watches.

Default: the authenticated user. Record the concrete login or user, not "me".

**Section D: Type labels.**

> Explainer: publishing skills give each ticket one type label, so the backlog can be filtered by kind of work. Labels on every ticket are for project-wide tags, such as a team label.

Default type labels `bug`, `enhancement`, `documentation`; labels on every ticket: none. Offer the same rename, keep, or create options for type labels that are missing or spelled differently.

### 3. Confirm

Show the user:

- The draft of `issue-tracker.md` and `workflow.md`.
- The tracker changes, grouped: labels or states to create, to rename (old → new), tickets to move, labels to delete. Show the number of open tickets each change touches.
- The changes another tool needs because of a rename, if any.

Let the user edit before anything is written or changed.

### 4. Write and apply

1. Write `issue-tracker.md` from the matching seed with the target filled in, and `workflow.md` from [workflow.md](workflow.md) with the chosen names, assignee, and labels.
2. Apply the tracker changes in this order, so no open ticket is ever left without a state: create, then rename, then move tickets, then delete. Use the seed's commands, one change per command, and check each result. When a change fails (no permission, a Linear state type the API rejects), keep going with the rest and report it.

When the target is unreachable, write the files, change nothing on the tracker, and report what is missing.

### 5. Done

Report the paths written, the tracker changes made, the ones that failed, and anything that still needs a person (a missing login, an unreachable target, another tool's names to update). Tell the user both files can be edited by hand; skills read whatever they contain. Rerun this skill to switch trackers or to bring the tracker's labels in line again.
