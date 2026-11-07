---
name: grill-tickets
description: Take a requirement from discussion to merged work, without a spec ticket. Grill it with grill-with-docs, split it into tickets and publish them with to-tickets, then follow them with shepherd-tickets until they are merged or need the user. Use when the work is clear enough to slice once the interview settles it.
disable-model-invocation: true
---

# grill-tickets

Run the short path for one requirement: interview until the design is settled, publish its tickets, then follow them to the end. Each stage is an existing skill; this skill decides the order, carries the context between them, and stops cleanly when a stage cannot finish. It implements nothing.

Use `grill-spec-tickets` instead when the requirement needs a spec ticket of its own: when it must wait in backlog, or when its decisions should live on one parent ticket.

## 1. Check the tracker

Read this project's `issue-tracker.md` and `workflow.md` as `setup-tracker` defines them. If they are missing, tell the user to run `/setup-tracker` now. The interview can still run, but nothing is published until the configuration exists. Checking first saves the user from finishing an interview that cannot be published.

## 2. Grill

Run `grill-with-docs` on the requirement. It interviews in rounds, records confirmed terms and ADRs on a discussion branch, and ends with a summary the user confirms.

- **The user confirms the summary**: continue.
- **The user ends the interview with branches still open**: stop. Report the open questions and the documents recorded so far. Tickets cut from an unsettled design make implementers guess.

When `grill-with-docs` offers to open a pull request for the documents, defer it: the documents reach the tickets through the base branch (step 3).

## 3. Publish the tickets

Run `to-tickets` with the confirmed summary as its source. The interview is done, so `to-tickets` skips its own. It proposes the discussion branch as the base branch, quizzes the user on the breakdown, pushes the base branch, and publishes the tickets as todo.

- **The discussion branch recorded no documents**: the tickets start from the default branch.
- **The user rejects the discussion branch as the base branch**: land it in its own pull request first, because the tickets rely on its documents.

If `to-tickets` stops before publishing or fails partway, report the tickets already created.

## Authorization

The ticket breakdown is shown and approved in `to-tickets` before anything is published, unless the user authorized the whole run up front for this target.

## 4. Shepherd the tickets

After the tickets are published, follow them by default: the requirement is finished when its work is merged, not when its tickets exist. Unless the user said not to, start a recurring runner that runs `shepherd-tickets` on every published ticket: the agent's loop or scheduler (in Claude Code, `/loop 10m /shepherd-tickets <ticket> <ticket> ...`), or a monitor that wakes on ticket changes. Write the identifiers in the command, because they survive context compaction and the conversation does not. `shepherd-tickets` stops the runner when every ticket is merged (done) or waits on the user.

If the agent has no recurring runner, run one pass of `shepherd-tickets` now and give the user the command to repeat it. If no ticket was published, skip this step.

## 5. Report

- The documents recorded and where they are (the base branch or its pull request).
- The tickets: identifier, title, URL, and blockers in dependency order, with the ones that can start immediately marked.
- Anything unfinished, and the stage it stopped at.
- How the tickets are followed: the recurring runner and its command from step 4, or why it did not start.
