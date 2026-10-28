---
name: implement-ticket
description: Implement a ticket (or a spec ticket with sub-tickets) from GitHub, GitLab, or Linear by running harness-stack:implement, while keeping the ticket's workpad, delivery comment, and state (Todo → In Progress → In Review) current. Use when the input is a ticket reference.
---

# implement-ticket

Drive `harness-stack:implement` for a ticket. That skill owns how the work is done; this one owns everything that touches the tracker: reading the ticket, the workpad comment, the delivery comment, and state transitions. Read [Working with tickets](../setup-harness-stack/references/tickets.md) for the configuration, the reference formats, and the platform commands, and the [state machine](../setup-harness-stack/references/state-machine.md) for the transitions this skill owns.

## 1. Read the ticket

Resolve the reference and read the ticket with all its comments. State its title. If it cannot be read, report the blocker; do not infer the requirements from the title.

Check the current state:

| State | Action |
| --- | --- |
| `Todo` | Start the work (step 2). |
| `Backlog` | Start only if the user asked for this ticket explicitly; otherwise report that it is not ready. |
| `In Progress` | Resume: reconcile the workpad with Git and continue. |
| `In Review` with an unresolved `## Code review` comment whose verdict is `issues` | Rework: run implement's fix mode on those findings (step 3). The state stays `In Review`. |
| `In Review` otherwise, `Reviewed`, `Merging`, `Done`, `Canceled` | Report the state and ask before doing anything. |

If the ticket has sub-tickets or its body lists tickets with blocking relationships, it is a spec: follow [Spec tickets](#spec-tickets) instead of steps 2–4.

## 2. Start

1. Move the ticket from `Todo` to `In Progress`.
2. Find the comment whose body starts with `## Workpad` and reuse its id; create it from implement's progress record template only when none exists. Keep exactly one workpad per ticket; if you lose its id, find it again in the comments.

## 3. Run implement

Run `harness-stack:implement` with this contract:

- **Input**: the ticket's title, description, and relevant comments (decisions, clarifications), or for rework the findings from the latest `## Code review` comment.
- **Progress record**: the workpad comment, written with the platform's comment-update command. Read back each update.
- **Authorization**: whatever the user granted. Opening a PR for the ticket is normal for this skill; ask once if the user has not said. The PR body links the ticket with the platform's closing keyword (see the platform file's **Link a change**).
- **Delivery**: back to this skill, which posts it in step 4.

## 4. Deliver to the ticket

1. Check that the workpad has no unchecked item before its final update; implement's `done` requires that.
2. Add a comment that starts with `## Handoff`, followed by the verdict and implement's handoff sections. Write in the ticket's language and read back the result.
3. With verdict `done` and an open PR, move the ticket to `In Review` (rework stays in `In Review`). With `blocked`, leave the state and make sure the workpad says where the work stopped and what is missing.
4. Report the ticket, its state, the PR, and the verdict in the conversation.

## Spec tickets

A spec ticket with sub-tickets is a task graph. Read every sub-ticket with its comments and its blockers (the platform file's **Create** section shows how blocking is represented), then run implement in [task graph mode](../implement/references/task-graph.md) with:

- One task per sub-ticket, with dependencies taken from the blocking relationships.
- Each sub-ticket's own workpad as that task's progress record. Move a sub-ticket to `In Progress` when its implementer starts.
- A PR whose body closes the spec ticket and every sub-ticket.

When the graph is delivered, post the handoff on the spec ticket, add a short Notes line with the PR to each sub-ticket's workpad, and move the spec and every finished sub-ticket to `In Review`. Leave blocked sub-tickets in `In Progress` and list them in the handoff.

## Boundaries

Never move a ticket to `Reviewed`, `Merging`, `Done`, or `Canceled`; review, human approval, and merge own those. Write to tickets only through the operations in the platform file, and report a failed write instead of assuming it landed.
