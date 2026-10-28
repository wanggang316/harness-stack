---
name: code-review-ticket
description: Review the change delivered for a ticket on GitHub, GitLab, or Linear, post the review on the ticket, and move it from In Review to Reviewed when the review is clean. Use when the input is a ticket reference.
---

# code-review-ticket

Review the change a ticket delivered and record the result on the ticket. The review itself is done with `harness-stack:code-review`; this skill finds what to review from the ticket, posts the result, and moves the state.

Find this project's issue tracker and state labels as `harness-stack:setup-harness-stack` defines them. If there are none, tell the user to run `/harness-stack:setup-harness-stack`. Every tracker step below is an operation from the issue tracker file, and every state is a name from the state labels file.

## 1. Fetch the ticket

Fetch the ticket with all its comments and state its title. If it cannot be fetched, report the blocker.

The ticket should be in `In Review`. In any other state, report it and ask whether to review anyway; such a review leaves the state unchanged.

Collect:

- **Requirements**: the description, acceptance criteria, and clarifying comments.
- **The change**: the PR or branch named in the latest `## Handoff` comment or linked to the ticket. If none can be found, ask for it.
- **Earlier reviews**: every `## Code review` comment and the dispositions in later `## Handoff` comments. If one exists, this is a re-review.

## 2. Run code-review

Run `harness-stack:code-review` with:

- **Fixed point**: the PR's base, or the merge-base of the branch with the default branch.
- **Spec**: the collected requirements, as text.
- **Re-review input**: the earlier findings and their dispositions.
- **Delivery**: back to this skill.

## 3. Post the result

1. Comment on the ticket with `## Code review`, the reviewed head SHA, the round number, the verdict, and the two axis reports, in the ticket's language. Always add a new comment, so every round stays visible. Read back the result.
2. Move the state:

| Verdict | Action |
| --- | --- |
| `clean` | Move the ticket to `Reviewed`. |
| `issues` | Leave it in `In Review`. |
| `incomplete` | Leave it in `In Review` and say what is missing. |

3. Report the ticket, its state, the verdict, and the worst finding per axis.

## Boundaries

This skill never edits code and moves tickets only to `Reviewed`. Report a failed tracker write instead of assuming it landed.
