---
name: implement-ticket
description: Implement a ticket, or a spec ticket with sub-tickets, from GitHub, GitLab, or Linear, keeping the ticket's workpad, handoff comment, and state (Todo → In Progress → In Review) current. Use when the input is a ticket reference.
---

# implement-ticket

Implement the work a ticket describes and keep the ticket current while doing it. The work itself is done with `implement`; this skill owns everything on the tracker: reading the ticket, its workpad, the handoff comment, and its state.

Find this project's issue tracker and state labels as `setup-harness-stack` defines them. If there are none, tell the user to run `/setup-harness-stack`. Every tracker step below is an operation from the issue tracker file, and every state is a name from the state labels file.

## 1. Fetch the ticket

Fetch the ticket with all its comments and state its title. If it cannot be fetched, report the blocker; do not infer the requirements from the title.

| Current state | Action |
| --- | --- |
| `Todo` | Start (step 2). |
| `Backlog` | Start only if the user asked for this ticket explicitly; otherwise report that it is not ready. |
| `In Progress` | Resume: reconcile the workpad with Git and continue. |
| `In Review`, latest `## Code review` comment has verdict `issues` | Rework: implement fixes those findings (step 3). The state stays `In Review`. |
| Any other state | Report it and ask before doing anything. |

If the ticket has sub-tickets, it is a spec: follow [Spec tickets](#spec-tickets) instead of steps 2–4.

## 2. Start

1. Move the ticket to `In Progress`.
2. Find the comment that starts with `## Workpad` and keep its id; when there is none, comment on the ticket with an empty workpad in implement's progress record format. Keep exactly one workpad per ticket; if you lose its id, find it again in the comments.

## 3. Run implement

Run `implement` with:

- **Input**: the ticket's title, description, and relevant comments (decisions, clarifications), or for rework the findings in the latest `## Code review` comment.
- **Progress record**: the workpad comment, written with the update-comment operation. Read back each update.
- **Authorization**: what the user granted. Opening a PR is normal for this skill; ask once if the user has not said. The PR body links the ticket (the link-the-PR operation).
- **Delivery**: back to this skill.

## 4. Deliver to the ticket

1. Check that the workpad has no unchecked item before its final update.
2. Comment on the ticket with `## Handoff`, the verdict, and implement's handoff sections, in the ticket's language. Read back the result.
3. With verdict `done` and an open PR, move the ticket to `In Review` (rework stays there). With `blocked`, leave the state; the workpad must say where the work stopped and what is missing.
4. Report the ticket, its state, the PR, and the verdict.

## Spec tickets

List the sub-tickets and their blockers, and fetch each sub-ticket. Run `implement` with the sub-tickets as a task graph:

- One task per sub-ticket, its dependencies taken from the blockers.
- Each sub-ticket's own workpad as that task's progress record. Move a sub-ticket to `In Progress` when work on it starts.
- One PR whose body links the spec ticket and every sub-ticket.

When the graph is delivered, comment the handoff on the spec ticket, add a Notes line with the PR to each sub-ticket's workpad, and move the spec ticket and every finished sub-ticket to `In Review`. Leave blocked sub-tickets in `In Progress` and list them in the handoff.

## Boundaries

This skill moves tickets only to `In Progress` and `In Review`. Report a failed tracker write instead of assuming it landed.
