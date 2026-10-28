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

Break the work into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it. Publish nothing until the user approves the breakdown, and write nothing into the repository.

## 1. Resolve the tracker

Read [Working with tickets](../setup-harness-stack/references/tickets.md) to find the platform, target, and state names, and open the platform file it points to. Check that the CLI or API key works before drafting, so a publishing problem shows up early. An explicit target from the user takes priority.

## 2. Gather context

Work from the conversation. For a ticket reference, read its full body and comments; that ticket is the **parent**. Read a supplied file in full.

## 3. Explore the codebase as needed

If you have not explored the code yet, do so. Use the project's domain vocabulary in titles and descriptions, and respect the active decisions in the area. Look for prefactoring: make the change easy, then make the easy change.

## 4. Draft vertical slices

<vertical-slice-rules>

- Each slice cuts a narrow but complete path through every relevant layer (schema, API, UI, tests): vertical, not one horizontal layer.
- A completed slice is demoable or verifiable on its own.
- Each slice fits in a single fresh context window.
- Prefactoring comes first.
- Acceptance criteria must not already hold at the starting commit.

</vertical-slice-rules>

Give each ticket its **blocking edges**: the tickets that must be done before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception.** A mechanical change whose blast radius fans across the codebase (rename a column, retype a shared symbol) cannot land green as one vertical slice. Sequence it as **expand–contract**: expand first, adding the new form beside the old; migrate call sites in batches sized by blast radius (per package or directory), each batch its own ticket blocked by the expand; contract last, removing the old form in a ticket blocked by every batch. When even the batches cannot stay green alone, let them share an integration branch and all block a final integrate-and-verify ticket.

## 5. Quiz the user

Present the breakdown as a numbered list. For each ticket show:

- **Title**: a short descriptive name
- **Blocked by**: the tickets that must finish first
- **What it delivers**: the end-to-end behavior it makes work

Ask whether the granularity is right, whether each blocking edge genuinely gates its ticket, and whether any tickets should be merged or split. Then ask which state the tickets start in. Recommend `Backlog`: a ticket in `Todo` is ready for implementation, and automation may pick it up immediately without checking blockers. If the user wants work to start, move only the frontier (tickets with no open blockers) to `Todo`.

Iterate until the user explicitly approves.

## 6. Publish

Create the tickets in dependency order, blockers first, so each blocking edge can reference a real identifier. Use the platform file's **Create** operations:

- Set the agreed starting state.
- Add each blocking edge as a native relationship where the tracker has one; otherwise keep the `## Blocked by` section in the body.
- If the source was an existing ticket, make each new ticket its sub-ticket. Do not edit or close the parent.
- If creating a relationship fails, keep publishing (the body already lists the blockers) and report it at the end. If creating a ticket fails, stop and report the tickets already created; do not retry blindly after a timeout, since the first attempt may have succeeded: search for it first.

<ticket-template>

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

## 7. Report

List each ticket's identifier, title, URL, state, and blockers in dependency order. Mark the tickets that can start immediately, and list relationships that could not be created.
