---
name: grill-spec-tickets
description: Take a requirement from discussion to merged work. Grill it with grill-with-docs, publish the spec with to-spec, split it into tickets with to-tickets when it is too large for one implementer, then follow the work with shepherd-tickets until it is merged or needs the user.
disable-model-invocation: true
---

# grill-spec-tickets

Run the whole path for one requirement: interview until the design is settled, publish one spec, publish its tickets when the spec needs splitting, then follow the work to the end. Each stage is an existing skill; this skill decides the order, carries the context between them, and stops cleanly when a stage cannot finish. It implements nothing.

## 1. Check the tracker

Read this project's `issue-tracker.md` and `workflow.md` as `setup-tracker` defines them. If they are missing, tell the user to run `/setup-tracker` now. The interview can still run, but nothing is published until the configuration exists. Checking first saves the user from finishing an interview that cannot be published.

## 2. Grill

Run `grill-with-docs` on the requirement. It interviews in rounds, records confirmed terms and ADRs on a discussion branch, and ends with a summary the user confirms.

- **The user confirms the summary**: continue.
- **The user ends the interview with branches still open**: stop. Report the open questions and the documents recorded so far. Publishing an unsettled spec makes implementers guess.

When `grill-with-docs` offers to open a pull request for the documents, defer it: the spec's state decides where the documents land (step 3).

## 3. Publish the spec

Run `to-spec` with the confirmed summary. The interview is done, so `to-spec` skips its own. Its state choice decides the rest of the run:

- **todo**: one implementer can finish the spec in a single fresh context window. The documents it relies on must be on the default branch first, so land the discussion branch in its own pull request as `to-spec` recommends. Skip step 4.
- **backlog because it needs splitting**: continue with step 4. The discussion branch becomes the tickets' base branch, so the documents do not need to land first.
- **backlog for another reason** (waiting on an external condition, deferred by the user): skip step 4 and report what the spec waits on.

If `to-spec` stops at a draft or fails to publish, stop here and report it.

## 4. Publish the tickets

Run `to-tickets` with the published spec ticket as its source. The spec becomes the parent, and its sub-tickets are published as todo. `to-tickets` proposes the discussion branch as the base branch, quizzes the user on the breakdown, and pushes the base branch before it creates tickets.

If `to-tickets` stops before publishing or fails partway, report the tickets already created; the spec stays in backlog.

## Authorization

Every publishing stage shows its draft and asks for approval, unless the user authorized the whole run up front for this target. An approval covers only its own stage: approving the spec does not approve the ticket breakdown.

## 5. Shepherd the work

After the spec (and its tickets) are published, follow the work by default: the requirement is finished when its work is merged, not when its tickets exist. Unless the user said not to, start a recurring runner that runs `shepherd-tickets` on the spec ticket: the agent's loop or scheduler (in Claude Code, `/loop 10m /shepherd-tickets <spec>`), or a monitor that wakes on ticket changes. Its sub-tickets are managed with it. Write the identifier in the command, because it survives context compaction and the conversation does not. `shepherd-tickets` stops the runner when every ticket is merged (done) or waits on the user.

A spec left in backlog for another reason (step 3) still gets the runner: `shepherd-tickets` moves it to todo when its condition is met. If the agent has no recurring runner, run one pass of `shepherd-tickets` now and give the user the command to repeat it. If nothing was published, skip this step.

## 6. Report

- The documents recorded and where they are (the discussion branch, its pull request, or the base branch).
- The spec ticket: URL and state.
- The tickets, if any: identifier, title, URL, and blockers in dependency order, with the ones that can start immediately marked.
- Anything unfinished, and the stage it stopped at.
- How the work is followed: the recurring runner and its command from step 5, or why it did not start.
