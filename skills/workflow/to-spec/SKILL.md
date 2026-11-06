---
name: to-spec
description: Turn requirements and design decisions into a complete spec and publish it as one ticket on the configured tracker (GitHub, GitLab, or Linear), in the todo or backlog state, assigned and labelled.
metadata:
  credits:
    skill: to-spec
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
---

# to-spec

Publish one spec ticket that is ready for whoever drives the tickets: interview when information is missing, write the spec with `write-spec`, and publish it with its state, assignee, and labels set. Do not split the work into tickets or implement it. The spec is not automatically a parent ticket.

## 1. Resolve the target

For a draft-only request, skip tracker and authentication checks and go to step 2.

Read this project's `issue-tracker.md` and `workflow.md` as `setup-tracker` defines them. If they are missing, tell the user to run `/setup-tracker`. They give the operations, the state names, the assignee, and the labels. An explicit user target takes priority. Check that the tracker's tools work; if authentication or permissions are unavailable, still complete the draft and report publishing as incomplete.

## 2. Close the open questions

When decisions that change scope, observable behavior, failure semantics, or the design are still open, run `grill-with-docs` on them before writing. It interviews in rounds and records confirmed terms and decisions as it goes; continue here with its confirmed summary when the interview closes. If the user ends it with branches still open, carry them as blockers. If `grill-with-docs` is unavailable, interview in rounds yourself: only questions whose prerequisites are settled, numbered, each with a recommended answer, its reason, and the main trade-off.

Skip this step when the discussion already settled the spec.

## 3. Write the spec

Use `write-spec` with the conversation, the referenced files, and the full body and comments of any referenced ticket. It returns the title, body, size, relied-on documents, and blockers. If `write-spec` is unavailable, report the missing skill and stop; do not improvise a different spec format.

The spec is implemented from the default branch, so the documents it relies on must be there. If any are uncommitted or exist only on an unmerged branch, say which files and recommend landing them first in a pull request of their own; a spec published before then links that pull request.

## 4. Choose the initial state

- **todo**: the spec has no blockers and one implementer can finish it in a single fresh context window. Work starts as soon as it is published.
- **backlog**: it must not start now. It needs splitting into tickets first (run `to-tickets` on it later), waits on something other than a ticket, or the user defers it.

Recommend one with the reason from `write-spec`'s size and blockers. A spec with unresolved blockers is never todo.

## 5. Confirm and publish

Search the tracker for open tickets that cover the same work. Show possible duplicates with the draft; the user decides whether to publish, merge into the existing ticket, or stop.

Show the target, title, body, initial state, assignee, and labels (the state label, the type label that fits, and the labels on every ticket). Publishing requires explicit user authorization. Proceed without asking again if the conversation already authorizes this spec scope and target. Stop at a draft when that is all the user requested or key decisions remain open.

Publish with the publish-a-ticket operation, setting the state, assignee, and labels in the same call, and passing the body through a heredoc.

- Create only this spec ticket. Do not edit or close a source ticket or create parent-child or blocking relationships.
- After a timeout, ambiguous response, or failed readback, search recent tickets in the target and compare author, title, and body. Do not retry creation until you know whether it succeeded.
- After obtaining a URL, read the ticket back and check the target, title, body, state, assignee, and labels. Fix a missing state, assignee, or label with the set-the-state or set-the-assignee-and-labels operation. If readback fails, distinguish the observed creation result from content that remains unverified.

## 6. Report

Return the ticket URL, its state, and any unverified items. Tell the user they can follow it with `/loop 10m /shepherd-tickets <ticket>`. For draft-only or blocked publishing, return the complete draft and the conditions needed to publish. Do not claim publication without a confirmed result.
