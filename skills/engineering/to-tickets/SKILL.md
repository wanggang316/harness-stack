---
name: to-tickets
description: Break a plan, spec, existing ticket, or the conversation into tracer-bullet tickets, each declaring its blocking edges, and publish them to the configured tracker (GitHub, GitLab, or Linear) with native blocking and sub-ticket links where available.
disable-model-invocation: true
metadata:
  credits:
    skill: to-tickets
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md"
---

# to-tickets

Break the work into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it. Publish nothing until the user approves the breakdown. Do not edit repository files; the only repository changes are committing and pushing the base branch after the user confirms it (step 7).

## 1. Resolve the tracker

Find this project's issue tracker as `setup-harness-stack` defines it. If there are none, tell the user to run `/setup-harness-stack`. Check that the tracker's tools work before drafting, so a publishing problem shows up early. An explicit target from the user takes priority.

## 2. Gather context

Work from the conversation. For a ticket reference, read its full body and comments; that ticket is the **parent**. Read a supplied file in full.

## 3. Choose the base branch

The **base branch** is where the tickets' work starts. Tickets start from the default branch unless earlier work for them exists only on another branch.

From the conversation and git (`git status`, `git log origin/<default>..HEAD`), decide whether the current branch holds changes these tickets rely on: glossary entries, ADRs, or design notes recorded while discussing them, or code that prepares for them. Judge by relevance to the tickets, not by the branch name. A branch that is not the default branch but holds unrelated work is not a base branch.

- **Relevant changes on the current branch**: propose the current branch as the base branch. The tickets then build on those changes without landing them on the default branch first.
- **No relevant changes**: use the default branch and write no branch line.

The branch line is one line in each ticket body, outside any section, so people and automation can read it. Write the branch name in plain text:

- **One ticket**: `Branch: <base branch>`. The ticket is implemented on the base branch itself, and its pull request merges the base branch into the default branch.
- **Several tickets**: `Base: <base branch>` in each. Each ticket gets its own branch from the base branch, and its pull request targets the base branch, so independent tickets can run in parallel. Add one integration ticket with `Branch: <base branch>`, blocked by all of them: it verifies the combined result on the base branch and merges the base branch into the default branch.

Link documents with URLs on the base branch, never with machine-local paths.

## 4. Explore the codebase as needed

If you have not explored the code yet, do so. Use the project's domain vocabulary in titles and descriptions, and respect the active decisions in the area. Look for prefactoring: make the change easy, then make the easy change.

## 5. Draft vertical slices

<vertical-slice-rules>

- Each slice cuts a narrow but complete path through every relevant layer (schema, API, UI, tests): vertical, not one horizontal layer.
- A completed slice is demoable or verifiable on its own.
- Each slice fits in a single fresh context window.
- Prefactoring comes first.
- Acceptance criteria must not already hold at the starting commit.

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must be done before it can start. A ticket with no blockers can start immediately. With a base branch and several tickets, include the integration ticket from step 3.

**Wide refactors are the exception.** A mechanical change whose blast radius fans across the codebase (rename a column, retype a shared symbol) cannot land green as one vertical slice. Sequence it as **expand–contract**: expand first, adding the new form beside the old; migrate call sites in batches sized by blast radius (per package or directory), each batch its own ticket blocked by the expand; contract last, removing the old form in a ticket blocked by every batch. When even the batches cannot stay green alone, let them share an integration branch and all block a final integrate-and-verify ticket.

## 6. Quiz the user

Present the base branch first: its name, the commits and files on it that the tickets rely on, and the branch line each ticket gets. Then present the breakdown as a numbered list. For each ticket show:

- **Title**: a short descriptive name
- **Blocked by**: the tickets that must finish first
- **What it delivers**: the end-to-end behavior it makes work

Ask whether the base branch is right, whether the granularity is right, whether each blocking edge genuinely gates its ticket, and whether any tickets should be merged or split. The user may choose another base branch or none.

Iterate until the user explicitly approves.

## 7. Publish

With a base branch, first make it available to whoever picks the tickets up. Commit uncommitted changes the tickets rely on only after the user confirms them, then push the base branch (`git push -u origin <base branch>`). If the push fails, stop before creating any ticket.

Create the tickets in dependency order, blockers first, so each blocking edge can reference a real identifier. Use the issue tracker's publish-a-ticket operation:

- Add each blocking edge as a native relationship where the tracker has one; otherwise keep the `## Blocked by` section in the body.
- If the source was an existing ticket, make each new ticket its sub-ticket. Do not edit or close the parent.
- If creating a relationship fails, keep publishing (the body already lists the blockers) and report it at the end. If creating a ticket fails, stop and report the tickets already created; do not retry blindly after a timeout, since the first attempt may have succeeded: search for it first.

<ticket-template>

Branch: <base branch>   (or `Base: <base branch>`; only with a base branch, see step 3)

## Parent

A reference to the parent ticket (only when the source was an existing ticket).

## What to build

The end-to-end behavior this ticket makes work, from the user's perspective, not a layer-by-layer implementation list.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)". Omit this section when every blocker is set as a native relationship.

</ticket-template>

Avoid file paths and code snippets; they go stale fast. Exception: when a prototype produced a snippet that states a decision more precisely than prose (a state machine, reducer, schema, or type shape), inline the decision-bearing part and note that it came from a prototype.

## 8. Report

Name the base branch, if any. List each ticket's identifier, title, URL, and blockers in dependency order. Mark the tickets that can start immediately, and list relationships that could not be created.
