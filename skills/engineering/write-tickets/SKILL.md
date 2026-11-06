---
name: write-tickets
description: Break a plan, spec, ticket, or the conversation into tracer-bullet tickets, each declaring the tickets that block it, in a fixed format, and return them. Use when work needs splitting into tickets.
metadata:
  credits:
    skill: to-tickets
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md"
---

# write-tickets

Break the work into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it, in the format below, and return them.

## Inputs

- The source: the conversation, a plan or spec file, or a ticket. For a ticket, read its full body and comments; that ticket is the **parent**.
- Optionally a **base branch**: the branch the tickets' work starts from when it is not the default branch, when the request names one.

## 1. Explore the codebase as needed

If you have not explored the code yet, do so. Use the project's domain vocabulary in titles and descriptions, and respect the active decisions in the area. Look for prefactoring: make the change easy, then make the easy change.

## 2. Draft vertical slices

<vertical-slice-rules>

- Each slice cuts a narrow but complete path through every relevant layer (schema, API, UI, tests): vertical, not one horizontal layer.
- A completed slice is demoable or verifiable on its own.
- Each slice fits in a single fresh context window.
- Prefactoring comes first.
- Acceptance criteria must not already hold at the starting commit.

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must be done before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception.** A mechanical change whose blast radius fans across the codebase (rename a column, retype a shared symbol) cannot land green as one vertical slice. Sequence it as **expand–contract**: expand first, adding the new form beside the old; migrate call sites in batches sized by blast radius (per package or directory), each batch its own ticket blocked by the expand; contract last, removing the old form in a ticket blocked by every batch. When even the batches cannot stay green alone, let them share an integration branch and all block a final integrate-and-verify ticket.

## 3. Write the branch line

Skip this step without a base branch. The branch line is one line in each ticket body, outside any section, so people and automation can read it. Write the branch name in plain text:

- **One ticket**: `Branch: <base branch>`. The ticket is implemented on the base branch itself, and its pull request merges the base branch into the default branch.
- **Several tickets**: `Base: <base branch>` in each. Each ticket gets its own branch from the base branch, and its pull request targets the base branch, so independent tickets can run in parallel. Add one integration ticket with `Branch: <base branch>`, blocked by all of them: it verifies the combined result on the base branch and merges the base branch into the default branch.

Link documents with URLs on the base branch (or the default branch without one), never with machine-local paths.

## 4. Quiz the user

Present the breakdown as a numbered list. For each ticket show:

- **Title**: a short descriptive name
- **Blocked by**: the tickets that must finish first
- **What it delivers**: the end-to-end behavior it makes work

Ask whether the granularity is right, whether each blocking edge genuinely gates its ticket, and whether any tickets should be merged or split. Iterate until the user explicitly approves.

## 5. Return the tickets

Return the approved tickets in dependency order, blockers first, each with its title and body; refer to blockers by title. Write each body with this template:

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

- A reference to each blocking ticket, or "None (can start immediately)".

</ticket-template>

Give each ticket the type that fits it (bug, enhancement, or documentation).

Avoid file paths and code snippets; they go stale fast. Exception: when a prototype produced a snippet that states a decision more precisely than prose (a state machine, reducer, schema, or type shape), inline the decision-bearing part and note that it came from a prototype.

Mark the tickets that can start immediately.
