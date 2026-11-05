---
name: write-spec
description: Write agreed requirements and design decisions as a complete spec an implementer can execute, returned as a draft (title and body). Use when a spec is wanted as text; it publishes nothing.
metadata:
  credits:
    skill: to-spec
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
---

# write-spec

Synthesize the conversation and codebase understanding into one spec an implementer can execute, and return it as a draft. This skill writes content only: it reads no project configuration, creates or edits no ticket, and changes no repository file. Publishing belongs to the caller (for example `to-spec`). Do not split the work into tickets or write a design file.

## 1. Gather context

If the existing discussion is sufficient, synthesize it without repeating the requirements interview. Read referenced files in full. For a referenced ticket, use the content the caller supplied; otherwise read its body and comments with the tools at hand, read-only. A source ticket supplies context; it does not become a parent or an edit target.

Read relevant code, domain documentation, and active ADRs as needed. Use project terminology. Distinguish current behavior, confirmed changes, and assumptions. Ask only for missing information that affects scope, behavior, or major trade-offs. If it remains unresolved, return a draft with blockers; do not present assumptions as confirmed decisions.

Identify the test seams. Prefer existing, higher-level behavioral interfaces that cover the feature with as few seams as practical. Reuse confirmed testing decisions. Explain any new test seam or change in test strategy and obtain the user's decision.

## 2. Write the spec

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

## 3. Return the draft

Return:

- **Title** and **body**.
- **Size**: whether one implementer can finish the spec in a single fresh context window, or it needs splitting into tickets first, with one line of reason. Callers use this to decide whether the spec is executable as it is.
- **Relied-on documents**: the glossary entries, ADRs, and design notes the spec links, so the caller can check they are on the default branch.
- **Blockers**: open questions that keep the spec from being executable, or "none".

Do not claim the spec was published.
