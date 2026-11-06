# Workflow

The workflow skills speak in workflow states. This file maps each state to the label (or Linear state) this project's tracker uses, and records who tickets are assigned to and how they are labelled.

| State | On our tracker | Meaning |
| --- | --- | --- |
| backlog | `Backlog` | Published, but must not start now: a spec waiting to be split, work waiting on something other than a ticket, or deferred work |
| todo | `Todo` | Ready; work starts once no open ticket blocks it |
| in-progress | `In Progress` | Being implemented |
| in-review | `In Review` | Implemented, under review |
| reviewed | `Reviewed` | Review is clean; waits for a merge decision |
| merging | `Merging` | Approved to merge |
| blocked | `Blocked` | The work cannot continue without a person. Not a blocking edge: a todo ticket waiting for its blockers stays in todo |
| done | the issue is closed | Merged or otherwise complete |

On GitHub and GitLab each state is a label, and an open issue carries exactly one state label. On Linear each state is a workflow state of the team.

When a skill names a state (for example "move it to reviewed"), use the corresponding value from the middle column.

## Assignee

Every published ticket is assigned to `<login>`.

## Labels

- **Type labels**, one per ticket, the one that fits: `bug`, `enhancement`, `documentation`
- **Labels on every ticket**: none

Edit any value here to match the vocabulary you actually use; rerun `/setup-tracker` to apply a change to the tracker's labels.
