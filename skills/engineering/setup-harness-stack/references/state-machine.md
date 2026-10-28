# Ticket state machine

The canonical states a ticket moves through and who moves it. Skills speak in these canonical names; the project's `state-machine.md` maps each one to the name used on its tracker.

## States

| State | Meaning | Entered by |
| --- | --- | --- |
| `Backlog` | Captured, not ready to start. | `to-tickets`, `to-spec`, a person |
| `Todo` | Ready for implementation. Automation may pick it up. | A person |
| `In Progress` | An implementer is working on it. | `implement-ticket` when it starts |
| `In Review` | Implementation delivered with a PR; waiting for code review. | `implement-ticket` when it hands off |
| `Reviewed` | Code review found no blocking issues; waiting for a human decision. | `code-review-ticket` with a clean result |
| `Merging` | A person approved the change for merge. | A person |
| `Done` | The PR is merged. | Whoever merges: a person, or the tracker closing the ticket through the PR's closing keyword |
| `Canceled` | Dropped without a merge. | A person |

```text
Backlog → Todo → In Progress → In Review → Reviewed → Merging → Done
                      ↑             │                      │
                      └── rework ───┴──── conflicts ───────┘
```

- Rework: review findings are fixed while the ticket stays in `In Review`; a person may also move it back to `Todo` or `In Progress`.
- A merge that hits conflicts needing new work goes back to `In Progress`.
- `Merging` and `Canceled` are human decisions. No skill moves a ticket there.
- A skill moves a ticket only along the transitions it owns in the table above, and only from the state the transition starts at. Report an unexpected current state instead of forcing the move.
- The core skills (`implement`, `code-review`) never move tickets. Whatever drives them, a ticket-driven skill or another tool, owns the transitions.

## Platform representation

| State | GitHub | GitLab | Linear |
| --- | --- | --- | --- |
| `Backlog` … `Merging` | Label with the state name on an open issue | Label with the state name on an open issue | Workflow state of the team |
| `Done` | Issue closed as completed | Issue closed | Workflow state (type `completed`) |
| `Canceled` | Issue closed as not planned | Issue closed, with a comment | Workflow state (type `canceled`) |

- On GitHub and GitLab an open issue carries at most one state label. Changing state adds the new label and removes every other state label in the same command.
- On Linear, `Backlog`, `Todo`, `In Progress`, `In Review`, `Done` and `Canceled` exist in a new team by default. `Reviewed` and `Merging` usually need to be created, with type `started`.
- This representation is a contract: any other tool that reads or moves the same tickets must use the same names and the same label or state per canonical state. Keep the names identical to the canonical ones unless the project already has its own.
