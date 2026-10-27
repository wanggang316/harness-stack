# Working with tickets

Read this when a skill needs to find, read, update, or publish a ticket, or needs the project's tracker platform or state names. It resolves the configuration, chooses how to run ticket operations, and lists the operations by name. Platform commands live in [github.md](github.md), [gitlab.md](gitlab.md), and [linear.md](linear.md); the states live in [state-machine.md](state-machine.md).

## 1. Resolve the project configuration

The configuration directory is `~/.harness-stack/<project>/`. Derive `<project>` from the `origin` remote: take the repository path after the host, drop a trailing `.git`, and replace `/` with `.` (`github.com/acme/api` → `acme.api`, `gitlab.com/group/sub/app` → `group.sub.app`).

- `issue-tracker.md` names the platform (`github`, `gitlab`, or `linear`) and its target: the `owner/repo` or GitLab project path, or the Linear team key and optional project.
- `state-machine.md` maps each canonical state to the tracker's name for it.

When the files are missing, infer the platform from `origin` (GitHub or GitLab host) and use the canonical state names. An explicit target from the user takes priority over both. When neither config nor inference gives a platform, ask for it and suggest `/harness-stack:setup-harness-stack`; do not stop work that does not need a ticket.

## 2. Recognize a ticket reference

A ticket is present when the input names one: a GitHub or GitLab issue number or URL (`#42`, `acme/api#42`, an issue URL), a Linear identifier or URL (`ENG-123`), or an agent-workflow identifier (`$ISSUE_IDENTIFIER`). A PR or merge request is not a ticket, but its body may reference one (`Closes #42`). Without a reference, the work has no ticket: skills report in the conversation and make no tracker writes.

If a reference is ambiguous or cannot be read, say so and continue without tracker writes rather than guessing which ticket to update.

## 3. Choose the operation backend

1. **Inside an agent-workflow turn** (`$AGENT_WORKFLOW_RUN` is set and `agent-workflow` is on `PATH`): use `agent-workflow ticket <ISSUE_IDENTIFIER> …` for every operation it covers. It works the same on Linear and GitHub, knows the state catalog, and checks the workpad on `comment-update --final`. Do not change state labels by hand there; `state` swaps them.
2. **Otherwise**: use the platform file for the configured tracker.

| Operation | agent-workflow | Platform file section |
| --- | --- | --- |
| Read a ticket with its comments | `get`, `comments` | Read |
| Create a comment, returning its id | `comment -` | Comment |
| Update a comment by id | `comment-update <id> -` (`--final` for the last update) | Comment |
| Move to a canonical state | `state "<name>"` | State |
| Link a PR or merge request | `attach <url>` plus `Closes …` in the PR body | Link a change |
| Create a ticket, blockers, sub-tickets | not covered: use the platform file | Create |
| Create missing labels or states | not covered: use the platform file | Setup |

Feed multi-line bodies through a heredoc on stdin (`<<'EOF' … EOF`), not through a shared temporary file: if an earlier step failed, a stale file would be published. Run each tracker write as its own command, then check its output before relying on it.

## 4. Write to tickets

- Write in the ticket description's language.
- Mention a person only by the author handle shown in the ticket's comments; never mention your own account.
- A tracker write is a claim others act on. After a write, read back the result (the command output or a follow-up read) and report a failed write instead of assuming it landed.
- Use the state names from `state-machine.md` and move only along transitions the calling skill owns there.
