# State labels

The skills speak in terms of the canonical ticket states below. This file maps each state to the label or state name used on this project's tracker.

| State | Label in our tracker | Meaning |
| --- | --- | --- |
| `Backlog` | `Backlog` | Captured, not ready to start |
| `Todo` | `Todo` | Ready for implementation; automation may pick it up |
| `In Progress` | `In Progress` | An implementer is working on it |
| `In Review` | `In Review` | Implementation delivered with a PR; waiting for code review |
| `Reviewed` | `Reviewed` | Code review found no blocking issues; waiting for a human decision |
| `Merging` | `Merging` | A person approved the change for merge |
| `Done` | `Done` | The PR is merged |
| `Canceled` | `Canceled` | Dropped without a merge |

When a skill says "move the ticket to `<State>`", use the corresponding name from this table and the tracker's **Move a ticket to a state** operation.

A ticket is in one state at a time. Report an unexpected current state instead of forcing a move.

Edit the "Label in our tracker" column to match the names this tracker actually uses. Any other tool that reads or moves the same tickets must use the same names.
