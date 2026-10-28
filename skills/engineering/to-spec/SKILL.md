---
name: to-spec
description: Turn agreed requirements and design decisions into a complete spec and publish it as one ticket on the configured tracker (GitHub, GitLab, or Linear).
disable-model-invocation: true
metadata:
  credits:
    skill: to-spec
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
---

# to-spec

Synthesize the current conversation and codebase understanding into a spec an implementer can execute. Publish one ticket. Do not split work into tickets, implement it, or write a design file by default. The spec is not automatically a parent task.

## 1. Resolve the target

For a draft-only request, skip tracker and authentication checks and go to step 2. Use this section only when preparing to publish.

Find this project's issue tracker and state labels as `harness-stack:setup-harness-stack` defines them. If there are none, tell the user to run `/harness-stack:setup-harness-stack`. An explicit user target takes priority. Check that the tracker's tools work; if authentication or permissions are unavailable, still complete the draft and report publishing as incomplete.

A spec starts in `Backlog` unless the user asks otherwise: it describes work, and moving it to `Todo` would mark it ready for implementation.

## 2. Gather context

If the existing discussion is sufficient, synthesize it without repeating the requirements interview. Read referenced files or tickets in full, including comments. A source ticket supplies context; it does not automatically become a parent or an edit target.

Read relevant code, domain documentation, and active ADRs as needed. Use project terminology. Distinguish current behavior, confirmed changes, and assumptions. Ask only for missing information that affects scope, behavior, or major trade-offs. If it remains unresolved, deliver a draft with blockers; do not present assumptions as confirmed decisions or publish an executable task.

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

Avoid specific file paths and code snippets because they become stale. Exception: when a prototype's state machine, schema, or type shape expresses a decision more precisely than prose, retain only the decision-bearing fragment and identify its prototype origin. Link repository documents with URLs accessible from the ticket, not machine-local paths. The body must stand alone without the original conversation and contain no unfilled placeholders.

## 4. Confirm and publish

Show the target, title, body, and starting state. Publishing requires explicit user authorization. Proceed without asking again if the conversation already authorizes this spec scope and target. Stop at a draft when that is all the user requested or key decisions remain open.

Publish with the issue tracker's publish-a-ticket operation, passing the body through a heredoc, and set the starting state.

- Create only this spec ticket. Do not edit or close a source ticket or create parent-child or blocking relationships.
- After a timeout, ambiguous response, or failed readback, search recent tickets in the target and compare author, title, and body. Do not retry creation until you know whether it succeeded.
- After obtaining a URL, read the ticket back and check the target, title, body, and state. If readback fails, distinguish the observed creation result from content that remains unverified.

## 5. Report

Return the ticket URL and any unverified items. For draft-only or blocked publishing, return the complete draft and the conditions needed to publish. Do not claim publication without a confirmed result.
