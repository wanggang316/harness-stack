---
name: to-spec
description: Turn agreed requirements and design decisions into a complete spec and publish it as one GitHub issue.
disable-model-invocation: true
metadata:
  credits:
    skill: to-spec
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md"
---

# to-spec

Synthesize the current conversation and codebase understanding into a spec an implementer can execute. Publish one issue. Do not split work into tickets, implement it, or write a design file by default. The spec is not automatically a parent task.

## 1. Resolve the target

For a draft-only request, skip repository, authentication, and label checks and go to step 2. Use this section only when preparing to publish.

Derive the project's `<owner>/<repo>` from `origin`, then read `~/.harness-stack/<owner>.<repo>/`:

- `issue-tracker.md` specifies the publishing repository. Fall back to `origin` when absent. An explicit user target takes priority.
- `triage-labels.md` maps triage roles to labels. Apply no triage label when absent.

Without a GitHub `origin`, skip project configuration and ask for a target if the user has not supplied one. Confirm that `gh` is authenticated and read the target repository's existing labels. Use the `agent-todo` mapping only if its label exists; do not guess or automatically create labels. Report invalid mappings and confirm whether to publish without that label. If authentication or permissions are unavailable, still complete the draft and report publishing as incomplete.

## 2. Gather context

If the existing discussion is sufficient, synthesize it without repeating the requirements interview. Read referenced files or issues in full, including issue comments. A source issue supplies context; it does not automatically become a parent or an edit target.

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

Avoid specific file paths and code snippets because they become stale. Exception: when a prototype's state machine, schema, or type shape expresses a decision more precisely than prose, retain only the decision-bearing fragment and identify its prototype origin. Link repository documents with URLs accessible from the GitHub issue, not machine-local paths. The body must stand alone without the original conversation and contain no unfilled placeholders.

## 4. Confirm and publish

Show the target repository, title, body, and labels. Publishing requires explicit user authorization. Proceed without asking again if the conversation already authorizes this spec scope and target. Stop at a draft when that is all the user requested or key decisions remain open.

Write the body to a temporary file outside the repository. Publish with `gh issue create --repo "$repo" --title "$title" --body-file "$body_file"`. Add `--label` only for confirmed labels.

- Create only this spec issue. Do not edit or close a source issue or create parent-child or blocked-by relationships.
- After a timeout, ambiguous response, or failed readback, query recent issues in the target repository and compare author, title, and body. Do not retry creation until you know whether it succeeded.
- After obtaining a URL, use `gh issue view` to check the repository, title, body, and labels. If readback fails, distinguish the observed creation result from content that remains unverified.

## 5. Report

Return the issue URL and any unverified items. For draft-only or blocked publishing, return the complete draft and the conditions needed to publish. Do not claim publication without a confirmed result.
