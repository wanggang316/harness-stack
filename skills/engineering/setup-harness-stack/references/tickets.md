# Working with tickets

Read this when a skill needs to find, read, update, or publish a ticket, or needs the project's tracker platform or state names. It resolves the configuration and points to the platform commands in [github.md](github.md), [gitlab.md](gitlab.md), and [linear.md](linear.md); the states live in [state-machine.md](state-machine.md).

Only the ticket-driven skills (`implement-ticket`, `code-review-ticket`, `to-tickets`, `to-spec`) read this. The core skills (`implement`, `code-review`) never touch a tracker; their callers decide where progress and results go.

## 1. Resolve the project configuration

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`).

- `issue-tracker.md` names the platform (`github`, `gitlab`, or `linear`) and its target: the `owner/repo` or GitLab project path, or the Linear team key and optional project.
- `state-machine.md` maps each canonical state to the tracker's name for it.

When the files are missing, infer the platform from `origin` (GitHub or GitLab host) and use the canonical state names. An explicit target from the user takes priority over both. When neither config nor inference gives a platform, ask for it and suggest `/harness-stack:setup-harness-stack`.

## 2. Recognize a ticket reference

A ticket reference is a GitHub or GitLab issue number or URL (`#42`, `acme/api#42`, an issue URL) or a Linear identifier or URL (`ENG-123`). A PR or merge request is not a ticket, but its body may reference one (`Closes #42`). If a reference is ambiguous or cannot be read, say so rather than guessing which ticket to update.

## 3. Operations

Each platform file has the same sections:

| Operation | Section |
| --- | --- |
| Read a ticket with its comments | Read |
| Create a comment and get its id; update a comment by id | Comment |
| Move to a canonical state | State |
| Link a PR or merge request | Link a change |
| Create a ticket, blockers, sub-tickets | Create |
| Create missing labels or states | Setup |

Feed multi-line bodies through a heredoc on stdin, not through a shared temporary file: if an earlier step failed, a stale file would be published. Run each tracker write as its own command and check its output before relying on it.

## 4. Write to tickets

- Write in the ticket description's language.
- Mention a person only by the author handle shown in the ticket's comments; never mention your own account.
- A tracker write is a claim others act on. After a write, read back the result and report a failed write instead of assuming it landed.
- Use the state names from `state-machine.md` and move only along transitions the calling skill owns there.
- Comments that other skills look for start with a fixed heading: `## Workpad` (one per ticket, updated in place), `## Handoff` and `## Code review` (one new comment per delivery or review round).
