---
name: to-tickets
description: Break a plan, spec, existing ticket, or the conversation into tracer-bullet tickets and publish them to the configured tracker (GitHub, GitLab, or Linear) in the todo state, assigned and labelled, with native blocking and sub-ticket links where available.
metadata:
  credits:
    skill: to-tickets
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md"
---

# to-tickets

Publish a set of tickets that is ready for whoever drives the tickets: interview when information is missing, choose the base branch, write the breakdown with `write-tickets`, and publish it with states, assignee, labels, and relationships set. Publish nothing until the user approves the breakdown. Do not edit repository files; the only repository changes are committing and pushing the base branch after the user confirms it (step 6).

## 1. Resolve the tracker

Read this project's `issue-tracker.md` and `workflow.md` as `setup-tracker` defines them. If they are missing, tell the user to run `/setup-tracker`. They give the operations, the state names, the assignee, and the labels. Check that the tracker's tools work before drafting, so a publishing problem shows up early. An explicit target from the user takes priority.

## 2. Gather context and close the open questions

Work from the conversation. For a ticket reference, fetch its full body and comments; that ticket is the **parent**. Read a supplied file in full.

When decisions that change scope, slicing, or observable behavior are still open, run `grill-with-docs` on them before writing. It interviews in rounds and records confirmed terms and decisions as it goes; continue here with its confirmed summary when the interview closes. If the user ends it with branches still open, carry them as blockers. If `grill-with-docs` is unavailable, interview in rounds yourself: only questions whose prerequisites are settled, numbered, each with a recommended answer, its reason, and the main trade-off.

Skip the interview when the source already settles the work.

## 3. Choose the base branch

The **base branch** is where the tickets' work starts. Tickets start from the default branch unless earlier work for them exists only on another branch.

From the conversation and git (`git status`, `git log origin/<default>..HEAD`), decide whether the current branch holds changes these tickets rely on: glossary entries, ADRs, or design notes recorded while discussing them, or code that prepares for them. Judge by relevance to the tickets, not by the branch name. A branch that is not the default branch but holds unrelated work is not a base branch.

- **Relevant changes on the current branch**: propose the current branch as the base branch. The tickets then build on those changes without landing them on the default branch first.
- **A dedicated worktree for this work**: the current branch is not the default branch, is checked out in a linked worktree (`git rev-parse --git-dir` differs from `git rev-parse --git-common-dir`), and holds nothing yet (`git log origin/<default>..HEAD` and `git status --porcelain` are empty). The user opened it to follow this work, so propose it as the base branch. The tickets' work then lands on a branch the user already has checked out: automation on the same machine can work in that worktree, and on another machine the user pulls the branch.
- **Otherwise**: use the default branch; the tickets get no branch line.

Present the base branch to the user: its name and the commits and files on it that the tickets rely on. The user may choose another base branch or none.

## 4. Write the tickets

Use `write-tickets` with the source, the parent ticket's content, and the base branch. It drafts the slices, quizzes the user until they approve the breakdown, and returns the tickets in dependency order with their types. If `write-tickets` is unavailable, report the missing skill and stop.

Search the tracker for open tickets that already cover the same work. Show possible duplicates; the user decides whether to drop, merge, or keep each overlapping ticket.

## 5. Confirm the publication

Show the target, the base branch, and for every ticket its title, `todo` state, assignee, and labels (the state label, its type label, and the labels on every ticket). Every ticket starts in todo, including blocked ones: whoever picks them up waits until no open ticket blocks them. The approval in step 4 authorizes publishing this breakdown to this target unless the user said otherwise.

## 6. Publish

With a base branch, first make it available to whoever picks the tickets up. Commit uncommitted changes the tickets rely on only after the user confirms them, then push the base branch (`git push -u origin <base branch>`), also when it holds no commits yet. `-u` makes the local branch track its own remote branch, so the user sees the work arrive there. If the push fails, stop before creating any ticket.

Create the tickets in dependency order, blockers first, so each blocking edge can reference a real identifier. Use the publish-a-ticket operation, setting the state, assignee, and labels in the same call:

- Replace each positional blocker reference with the real identifier. Add each blocking edge as a native relationship where the tracker has one; then drop the `## Blocked by` section from the body, otherwise keep it.
- If the source was an existing ticket, make each new ticket its sub-ticket. Do not edit or close the parent; a parent in backlog stays there until `shepherd-tickets` or a person closes it when its sub-tickets are done.
- If creating a relationship fails, keep publishing (keep the `## Blocked by` section for that ticket) and report it at the end. If creating a ticket fails, stop and report the tickets already created; do not retry blindly after a timeout, since the first attempt may have succeeded: search for it first.
- Read each ticket back and fix a missing state, assignee, or label with the set-the-state or set-the-assignee-and-labels operation.

## 7. Report

Name the base branch, if any. List each ticket's identifier, title, URL, and blockers in dependency order. Mark the tickets that can start immediately, and list relationships that could not be created. Tell the user they can follow the tickets with `/loop 10m /shepherd-tickets <identifiers>`.
