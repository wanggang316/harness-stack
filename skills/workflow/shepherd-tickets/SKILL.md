---
name: shepherd-tickets
description: "Act as the requirement owner for the tickets this conversation manages: at the human gates (backlog, reviewed, needs-human) clarify and unblock, give feedback on thin evidence, approve well-evidenced work for merge, and hand the rest to the user; keep their state, assignee, and labels right. One pass per run; repeat with the agent's loop."
disable-model-invocation: true
---

# shepherd-tickets

Keep the managed tickets flowing to done the way their owner would. Automation (or a person) implements, reviews, and merges; this skill decides at the points where the workflow waits for a human. Each run is one pass over the managed tickets. Repeat it with the agent's built-in loop, for example `/loop 10m /shepherd-tickets <identifiers>`.

## Scope

The **managed tickets** are the identifiers passed in, plus the sub-tickets of any managed ticket. Without identifiers, collect the tickets that `to-spec` or `to-tickets` published in this conversation, and show the user the `/loop 10m /shepherd-tickets <identifiers>` command with them filled in: identifiers in the command survive context compaction, memory does not. Without any, ask for them and stop.

Leave every other ticket alone, even when it looks wrong.

Read this project's `issue-tracker.md` as `setup-tracker` defines it. If it is missing, tell the user to run `/setup-tracker` and stop. It gives the operations, the state names, the assignee, and the labels.

## 1. Read every managed ticket

Fetch each ticket's body, comments, state, assignee, and labels, its sub-tickets and open blockers, and its linked pull request: state, head SHA, checks, mergeability, and body. A failed fetch makes that ticket unknown for this pass; report it and act on nothing it would need.

Sign every comment this skill writes with a last line `— shepherd-tickets`. Before acting, check your own earlier comments: do not repeat an answer, feedback, or hand-off that already covers the ticket's current state and head SHA. This keeps repeated passes idempotent.

## 2. Repair the metadata

The managed tickets must carry what `issue-tracker.md` says:

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

### needs-human

Read why the work stopped: the latest attention or blocked comment, the progress record (workpad), and the latest `## Handoff`.

- **Missing information this project already answers** (the spec, the code, the domain documentation, the active ADRs, this conversation): answer in a comment with the source of each answer, then move the ticket back to the state the work stopped in (in-review when it stopped in review, in-progress when a branch or PR exists, otherwise todo).
- **A defect in the ticket** (acceptance criteria unclear, contradictory, or already true; the ticket too large for one context window): propose the corrected ticket or a split from `write-tickets`, and hand it to the user. Edit the ticket only after the user approves; then move it back as above.
- **Anything else** (a product decision, credentials or permissions, a broken environment, a failure that repeats after your answer): hand it to the user.

When a ticket returns to needs-human for the same reason after you answered once, do not answer again; hand it off.

### reviewed

Judge whether the delivered work proves the ticket's acceptance criteria. Read the PR body (its Evidence and Merge Danger), the handoff's Verification section, the latest review result and the head SHA it reviewed, and the checks on the current head.

| Decision | When |
| --- | --- |
| **Merge**: move to merging | Every acceptance criterion maps to evidence actually obtained (a named test, command output, a screenshot of the affected state), none marked `Not verified`; the review verdict is clean on the current head SHA; all required checks pass on that head; the PR is mergeable; Merge Danger is a two-way door |
| **Feedback**: move to in-progress | Any criterion lacks evidence, the evidence contradicts it, the review is on an older head, or checks fail. Comment `## Acceptance feedback (round N)` with one numbered item per gap: the criterion, what is missing or wrong, and what evidence would settle it |
| **Hand off**: leave in reviewed | Merge Danger is a one-way door (data migration, destructive operation, external release, public API others depend on); a criterion needs a person to verify it in a real environment or judge it (look and feel, product wording); or the change touches security |

When unsure between merge and hand off, hand off: a wrong merge costs more than a wait. Moving to merging is the approval; whoever drives the tickets performs the merge.

### done

Nothing to do. When every managed ticket is done, say so and tell the user the loop can stop; stop it when the agent can.

## 4. Report

One line per managed ticket: identifier, state before → after, the action taken, and its reason. Then the **hand-offs**, each with what the user must decide or verify and the link to start from. Then the failures: fetches or writes that did not succeed. An action whose write failed did not happen; say so.
