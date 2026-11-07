---
name: shepherd-tickets
description: "Act as the requirement owner for the tickets this conversation manages: at the human gates (backlog, reviewed, blocked) clarify and unblock, give feedback on thin evidence, approve well-evidenced work for merge, and hand the rest to the user; turn important work found on the way into follow-up tickets; keep their state, assignee, and labels right. One pass per run, repeated by the agent's loop or scheduler until every ticket is done or waits on the user. Use after tickets are published, for example by grill-tickets or grill-spec-tickets."
---

# shepherd-tickets

Keep the managed tickets flowing to done the way their owner would. Automation (or a person) implements, reviews, and merges; this skill decides at the points where the workflow waits for a human, and keeps track of important work that the tickets did not plan for. Each run is one pass over the managed tickets. A recurring runner repeats it: the agent's loop or scheduler, for example `/loop 10m /shepherd-tickets <identifiers>`, or a monitor that wakes on ticket changes.

## Scope

The **managed tickets** are the identifiers passed in, plus the sub-tickets of any managed ticket, plus the tickets named in a `Follow-up:` comment that this skill wrote on a managed ticket (step 4). Without identifiers, collect the tickets that `to-spec` or `to-tickets` published in this conversation, and show the user the `/loop 10m /shepherd-tickets <identifiers>` command with them filled in: identifiers in the command survive context compaction, memory does not. Without any, ask for them and stop.

Leave every other ticket alone, even when it looks wrong.

Read this project's `issue-tracker.md` and `workflow.md` as `setup-tracker` defines them. If they are missing, tell the user to run `/setup-tracker` and stop. They give the operations, the state names, the assignee, and the labels.

## 1. Read every managed ticket

Fetch each ticket's body, comments, state, assignee, and labels, its sub-tickets and open blockers, and its linked pull request: state, head SHA, checks, mergeability, and body. A failed fetch makes that ticket unknown for this pass; report it and act on nothing it would need.

Sign every comment this skill writes with a last line `— shepherd-tickets`. Before acting, check your own earlier comments: do not repeat an answer, feedback, or hand-off that already covers the ticket's current state and head SHA. This keeps repeated passes idempotent.

## 2. Repair the metadata

The managed tickets must carry what `workflow.md` says:

- The configured assignee. Add a missing one; replace a different one only when nobody else has started work on the ticket (no linked branch or PR), otherwise report it.
- Exactly one state on an open ticket. With none, restore the state the ticket was published with when this conversation shows it; otherwise derive it from unambiguous evidence (a merged PR means done), or hand it off. With several, keep the one the evidence supports and remove the rest.
- The type label and the labels on every ticket.

Use the set-the-state and set-the-assignee-and-labels operations, and report each repair.

## 3. Decide at the human gates

Tickets in todo, in-progress, in-review, and merging belong to whoever drives them; touch them only in step 2. Report one that has not moved for a long time (an hour in todo with no open blocker, a day in progress without a commit or comment), without changing it.

### backlog

- A parent whose sub-tickets are all done: close it (done) with a comment that lists them.
- Work that waited on a condition that is now met (a decision recorded, an external dependency available): move it to todo with a comment that names the evidence.
- A spec that must be split first, or deferred work whose condition is not met: leave it, and in the report propose the next step (`to-tickets` on the spec, or what is still awaited).

### blocked

Read why the work stopped: the latest attention or blocked comment, the progress record (workpad), and the latest `## Handoff`.

- **Missing information this project already answers** (the spec, the code, the domain documentation, the active ADRs, this conversation): answer in a comment with the source of each answer, then move the ticket back to the state the work stopped in (in-review when it stopped in review, in-progress when a branch or PR exists, otherwise todo).
- **A defect in the ticket** (acceptance criteria unclear, contradictory, or already true; the ticket too large for one context window): propose the corrected ticket or a split from `write-tickets`, and hand it to the user. Edit the ticket only after the user approves; then move it back as above.
- **Anything else** (a product decision, credentials or permissions, a broken environment, a failure that repeats after your answer): hand it to the user.

When a ticket returns to blocked for the same reason after you answered once, do not answer again; hand it off.

### reviewed

Judge whether the delivered work proves the ticket's acceptance criteria. Read the PR body (its Evidence and Merge Danger), the handoff's Verification section, the latest review result and the head SHA it reviewed, and the checks on the current head.

| Decision | When |
| --- | --- |
| **Merge**: move to merging | Every acceptance criterion maps to evidence actually obtained (a named test, command output, a screenshot of the affected state), none marked `Not verified`; the review verdict is clean on the current head SHA; all required checks pass on that head; the PR is mergeable; Merge Danger is a two-way door |
| **Feedback**: move to in-progress | Any criterion lacks evidence, the evidence contradicts it, the review is on an older head, or checks fail. Comment `## Acceptance feedback (round N)` with one numbered item per gap: the criterion, what is missing or wrong, and what evidence would settle it |
| **Hand off**: leave in reviewed | Merge Danger is a one-way door (data migration, destructive operation, external release, public API others depend on); a criterion needs a person to verify it in a real environment or judge it (look and feel, product wording); or the change touches security |

When unsure between merge and hand off, hand off: a wrong merge costs more than a wait. Moving to merging is the approval; whoever drives the tickets performs the merge, for example with `pr-land`.

### done

Nothing to do.

## 4. Turn important discoveries into follow-up tickets

An owner keeps the current work on course and does not lose what the work found on the way. Read what the managed tickets surfaced since your last pass: the `## Adjacent issues` of each handoff, problems an implementer reported, review findings or open questions outside the ticket's scope, and gaps you found while you judged evidence.

Sort each item:

- **Not important** (style drift, a nice-to-have, already covered by an open ticket): list it in the report only. An item is important when, without it, correctness, security, data, or user-visible behavior is wrong, or the requirement's goal is not met.
- **The current ticket cannot meet its acceptance criteria without it**: it is not follow-up work. Handle it at the ticket's gate (feedback, or the blocked rules).
- **Outside the requirement** (a new feature, a product decision): hand it to the user.
- **Otherwise**: it is follow-up work. Do not add it to the current ticket, and do not stop or move the current ticket for it: the current ticket finishes against its own acceptance criteria.

Publish the follow-up work at the right time:

- **It does not depend on the current ticket's change**: publish it now, so it runs in parallel.
- **It builds on that change** (the same code, or behavior that exists only after the merge): wait until the current ticket is done, then publish it. Until then, comment on the current ticket `Follow-up planned after this ticket is done:` with the item, so later passes remember it.

Publish with `to-tickets`, from the default branch. Give it the item as the source, with a link to the ticket it came from. When the requirement has a spec ticket, give that spec as the parent so the new tickets become its sub-tickets; never use the current ticket as the parent, because a sub-ticket would hold the current ticket open. Before publishing, check your earlier `Follow-up:` comments, so a later pass does not publish the same item again. You act as the owner in its quiz and approval: approve a breakdown that stays inside the requirement, gives each ticket to one implementer, and does not duplicate an open ticket. The user's request to shepherd these tickets authorizes this publication. Then comment `Follow-up: <identifiers>` on the source ticket. The new tickets are now managed tickets, and the comment keeps them in scope after context compaction.

If `to-tickets` is unavailable or fails, report the item as a hand-off; report tickets already created.

## 5. Stop or continue

When no managed ticket can move without the user (each is done, or waits on a hand-off that has not changed since you made it) and no follow-up waits to be published, stop the recurring runner when the agent can, and say so in the report. Otherwise the runner continues.

## 6. Report

One line per managed ticket: identifier, state before → after, the action taken, and its reason. Then the **follow-ups**: tickets published this pass, follow-ups planned after a ticket is done, and items judged not important. Then the **hand-offs**, each with what the user must decide or verify and the link to start from. Then the failures: fetches or writes that did not succeed. An action whose write failed did not happen; say so.
