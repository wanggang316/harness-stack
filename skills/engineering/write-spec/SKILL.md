---
name: write-spec
description: Write agreed requirements and design decisions as one complete spec an implementer can execute, in a fixed format, to a document, a tracker ticket, or a temporary file. Use when requirements need to be written down as a spec.
metadata:
  credits:
    skill: to-spec
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
---

# write-spec

Synthesize the conversation and codebase understanding into one spec an implementer can execute, in the format below, and put it where the user wants it. Do not split the work into tickets or write a design file.

## 1. Choose the destination

If the request already says where the spec goes, use that. Otherwise ask before anything else:

- **A document** at a path the user gives.
- **A tracker** the user names (for example a GitHub repository or a Linear team).
- **Default**: a temporary file (`mktemp -t spec.XXXXXX.md`), with the full content also shown in the conversation.

A request to return the content in the conversation (for example from another skill that uses it) is a destination too.

## 2. Gather context

If the existing discussion is sufficient, synthesize it without repeating the requirements interview. Read referenced files in full. For a referenced ticket, use its content when it is already in the conversation; otherwise read its body and comments, read-only. A source ticket supplies context; it does not become a parent or an edit target.

Read relevant code, domain documentation, and active ADRs as needed. Use project terminology. Distinguish current behavior, confirmed changes, and assumptions. Ask only for missing information that affects scope, behavior, or major trade-offs. If it remains unresolved, write the spec with blockers; do not present assumptions as confirmed decisions.

Identify the test seams. Prefer existing, higher-level behavioral interfaces that cover the feature with as few seams as practical. Reuse confirmed testing decisions. Explain any new test seam or change in test strategy and obtain the user's decision.

## 3. Write the spec

Follow the project's document language, or use English when there is no precedent. Use these seven sections; omit Further Notes when empty.

<spec-template>

## Problem Statement

The problem the user faces, from the user's perspective.

## Solution

The capability the user gains when the problem is solved, from the user's perspective.

## User Stories

A numbered list covering the feature's main behaviors, permissions, boundaries, and failure cases. Express requirements as observable outcomes; avoid repetition to inflate the list.

1. As an <actor>, I want <capability>, so that <benefit>.

## Implementation Decisions

Confirmed changes to modules and interfaces, technical constraints, architectural decisions, schemas, API contracts, and interactions. Include shared constraints that prevent implementers from guessing again. Link existing ADRs for relevant rationale.

## Testing Decisions

Base tests on observable behavior. Identify modules or interfaces under test, key success and failure cases, and reusable testing patterns in the codebase. This is a validation plan, not a claim that unrun tests passed.

## Out of Scope

Explicit exclusions, especially work a reader might reasonably expect but that has been excluded.

## Further Notes

Other information that affects execution, with accessible source links.

</spec-template>

Avoid specific file paths and code snippets because they become stale. Exception: when a prototype's state machine, schema, or type shape expresses a decision more precisely than prose, retain only the decision-bearing fragment and identify its prototype origin. Link repository documents with URLs a ticket reader can open, not machine-local paths. The body must stand alone without the original conversation and contain no unfilled placeholders.

## 4. Write it to the destination

- **Document or temporary file**: write the title as the first heading, then the body. Show the full content in the conversation when it is a temporary file.
- **Tracker**: create one ticket with the title and body, using that tracker's CLI or tools and passing the body through a heredoc. Read it back. A spec with blockers is not executable: ask before creating it there.

Then report:

- Where the spec is: the path or the ticket URL. A write that failed did not happen; say so and show the content instead.
- **Size**: whether one implementer can finish the spec in a single fresh context window, or it needs splitting into tickets first, with one line of reason.
- **Relied-on documents**: the glossary entries, ADRs, and design notes the spec links, and whether each is on the default branch.
- **Blockers**: open questions that keep the spec from being executable, or "none".
