# Ticket state machine

The canonical states a ticket moves through, who moves it, and how each platform represents them. Skills speak in these canonical names; the project's `state-machine.md` maps each one to the name used on its tracker.

## States

| State | Meaning | Entered by |
| --- | --- | --- |
| `Backlog` | Captured, not ready to start. No automation acts on it. | `to-tickets`, `to-spec`, a person |
| `Todo` | Ready for implementation. Automation may pick it up. | A person |
| `In Progress` | An implementer is working on it. | `implement` when it starts |
| `In Review` | Implementation delivered with a PR; waiting for code review. | `implement` when it hands off; the engine in agent-workflow |
| `Reviewed` | Code review found no blocking issues; waiting for a human decision. | `code-review` with a clean result; the engine in agent-workflow |
| `Merging` | A human approved the change for merge. | A person |
| `Done` | The PR is merged. | `merge` |
| `Canceled` | Dropped without a merge. | A person |

```text
Backlog → Todo → In Progress → In Review → Reviewed → Merging → Done
                      ↑             │                      │
                      └── rework ───┴──── conflicts ───────┘
```

- Rework: review findings are fixed while the ticket stays in `In Review`; a person may also move it back to `Todo` or `In Progress`.
- A merge that hits conflicts moves the ticket back to `In Progress`.
- `Merging` and `Canceled` are human decisions. No skill moves a ticket there on its own.
- A skill moves a ticket only along the transitions it owns in the table above, and only from the state the transition starts at. Report an unexpected current state instead of forcing the move.

## Who owns the transition

When the work runs inside an agent-workflow turn (`$AGENT_WORKFLOW_RUN` is set), the engine owns every transition after the agent's own start move (`In Progress`). The agent delivers its result and leaves the rest to the engine. Outside agent-workflow, the skill named in the table makes the move itself.

## Platform representation

| State | GitHub | GitLab | Linear |
| --- | --- | --- | --- |
| `Backlog` … `Merging` | Label with the state name on an open issue | Label with the state name on an open issue | Workflow state of the team |
| `Done` | Issue closed as completed | Issue closed | Workflow state (type `completed`) |
| `Canceled` | Issue closed as not planned | Issue closed, with a comment | Workflow state (type `canceled`) |

- On GitHub and GitLab an open issue carries at most one state label. Changing state adds the new label and removes every other state label in the same command.
- On Linear, `Backlog`, `Todo`, `In Progress`, `In Review`, `Done` and `Canceled` exist in a new team by default. `Reviewed` and `Merging` usually need to be created, with type `started`.
- agent-workflow uses the same names: state labels on GitHub, workflow states on Linear, and `Closed` for a closed GitHub issue. Keep the label and state names identical to the canonical names unless the project has existing names; a rename must also go into agent-workflow's `state_alias`.
