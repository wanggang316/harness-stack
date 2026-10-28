---
name: code-review-ticket
description: Review the change delivered for a ticket on GitHub, GitLab, or Linear by running harness-stack:code-review, post the review on the ticket, and move it from In Review to Reviewed when the review is clean. Use when the input is a ticket reference.
---

# code-review-ticket

Drive `harness-stack:code-review` for a ticket. That skill owns how the review is done; this one finds what to review from the ticket, posts the result, and moves the state. Read [Working with tickets](../setup-harness-stack/references/tickets.md) for the configuration, reference formats, and platform commands, and the [state machine](../setup-harness-stack/references/state-machine.md) for the transition this skill owns.

## 1. Read the ticket

Resolve the reference and read the ticket with all its comments. State its title. If it cannot be read, report the blocker.

The ticket should be in `In Review`. In any other state, report it and ask whether to review anyway; a review of a ticket outside `In Review` never changes its state.

Collect from the ticket:

- **Requirements**: the description, acceptance criteria, and clarifying comments. These are the Spec axis's basis.
- **The change**: the PR or branch from the latest `## Handoff` comment, the workpad's final Notes line, or the linked PR. If none can be found, ask for it.
- **Earlier reviews**: every `## Code review` comment, and the author's dispositions in later `## Handoff` comments. If one exists, this is a re-review.

## 2. Run code-review

Run `harness-stack:code-review` with this contract:

- **Fixed point**: the PR's base, or the merge-base of the branch with the default branch.
- **Spec**: the requirements collected in step 1, passed as text.
- **Re-review input**: the previous findings and the author's dispositions.
- **Delivery**: back to this skill.

## 3. Post the result

1. Add a new comment to the ticket; do not edit earlier reviews, so every round stays visible. Start it with `## Code review`, then the reviewed head SHA, the round number, the verdict, and the two axis reports. Write in the ticket's language and read back the result.
2. Move the state:

| Verdict | Action |
| --- | --- |
| `clean` | Move the ticket from `In Review` to `Reviewed`. |
| `issues` | Leave it in `In Review`. Say that `harness-stack:implement-ticket` will pick up the findings as rework. |
| `incomplete` | Leave it in `In Review` and say what is missing (requirements, a failed reviewer, invalid coverage). |

3. Report the ticket, its state, the verdict, and the worst finding per axis in the conversation.

## Boundaries

This skill never edits code and never moves a ticket to `Merging`, `Done`, or `Canceled`; a person approves the merge. Write to tickets only through the operations in the platform file, and report a failed write instead of assuming it landed.
