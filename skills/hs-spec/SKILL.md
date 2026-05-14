---
name: hs-spec
description: Creates product specs before coding. Use when starting a new project, feature, or significant change. Handles requirements gathering through specification in one workflow.
---

# hs-spec: Product Specification

## Overview

Write a structured product specification before writing any code. The spec is the shared source of truth — it defines what we're building, for whom, and how we'll know it's done. Code without a spec is guessing.

## When to Use

- Starting a new project or feature
- Requirements are vague, ambiguous, or incomplete
- The change touches multiple files or modules
- You're about to make an architectural decision
- The task would take more than 30 minutes to implement

**When NOT to use:** Single-line fixes, typo corrections, or changes where requirements are unambiguous and self-contained.

## Process

Three gated phases. Do not advance until the current phase is validated by the human.

```
GATHER ──→ SPECIFY ──→ HAND OFF
  │           │           │
  ▼           ▼           ▼
Human       Human       Proceed to
reviews     approves    hs-planner
```

### Phase 1: Gather Requirements

When requirements are vague, start here. Skip to Phase 2 if requirements are already clear and documented.

**Identify stakeholders:**
- Primary users (who uses it daily)
- Secondary users (who uses it occasionally)
- Affected systems (what integrates with it)

**Ask clarifying questions using 5W1H:**
- **What** — What exactly should this do?
- **Who** — Who is the target user?
- **Why** — What problem does this solve?
- **When** — When do users need this?
- **Where** — Where does this fit in the existing system?
- **How** — How should it behave? Any constraints?

**Surface assumptions immediately:**

```
ASSUMPTIONS I'M MAKING:
1. This feature is for logged-in users only
2. Data persists across sessions
3. Mobile support is not required for MVP
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The spec's entire purpose is to surface misunderstandings *before* code gets written — assumptions are the most dangerous form of misunderstanding.

**Define scope boundaries:**

```
IN SCOPE:
- User can create and edit tasks
- Tasks have title, description, status

OUT OF SCOPE:
- Task sharing between users (future)
- File attachments (future)
```

**Prioritize with MoSCoW:**
- **Must have** — Launch blockers
- **Should have** — Important but not blocking
- **Could have** — Nice to have
- **Won't have** — Explicitly excluded

**Reframe vague instructions as concrete criteria:**

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED ACCEPTANCE CRITERIA:
- Dashboard LCP < 2.5s on 4G connection
- Initial data load completes in < 500ms
- No layout shift during load (CLS < 0.1)
→ Are these the right targets?
```

### Phase 2: Write the Spec

Write a product spec following this template. Save to `docs/product-specs/<name>.md`:

```markdown
# Product Spec: [Title]

**Status:** Draft | Approved | In Progress | Shipped
**Author:** [name]
**Date:** [date]

## Summary

<!-- One paragraph: what we're building and why -->

## User Stories

<!-- Format: As a [role], I want [capability] so that [benefit] -->

## Requirements

### Must Have
- [ ] Requirement 1

### Nice to Have
- [ ] Requirement 2

## Acceptance Criteria

<!-- Specific, testable conditions for "done" -->
<!-- Format: Given [context], when [action], then [result] -->

## Acceptance Assertions

<!--
A flat numbered list of behaviour-level assertions. Each one MUST:
- Be binary (PASS / FAIL); no "good enough" wording.
- Reference observable state only: HTTP response, DOM, DB row, log line, file
  on disk. Never reference function names, file paths, or implementation
  internals.
- Be verifiable by a single runtime probe (one HTTP call, one DOM query, one
  SQL select) so an independent validator that has never seen the code can
  decide PASS / FAIL.

Use these later as the contract every implementation task must cover.
-->

| ID | Assertion | Verification method |
|----|-----------|---------------------|
| A1 | Anonymous user visiting /login sees a form with email + password fields | DOM query |
| A2 | Submitting valid credentials redirects to /dashboard within 2s | network log |
| A3 | Invalid password returns HTTP 401 with body `{"error":"invalid_credentials"}` | API call |

## Design

<!-- Link to design doc or architecture decisions if applicable -->

## Open Questions

<!-- Unresolved questions that need answers before implementation -->
```

**Key principles for writing specs:**

- User stories drive requirements, not the reverse
- Every must-have requirement needs a matching acceptance criterion
- Every acceptance criterion expands into one or more **acceptance assertions** — assertions are the verifier-facing form: binary, behaviour-only, independently probable
- Open questions must be resolved before implementation begins
- Status field tracks the spec lifecycle: Draft → Approved → In Progress → Shipped

### Phase 3: Hand Off

Present the spec for human review. Do NOT proceed to implementation until approved.

```
SPEC READY FOR REVIEW:
- Title: [name]
- Must-haves: [count] requirements
- Nice-to-haves: [count] requirements
- Open questions: [count] unresolved
→ Approve, or tell me what to change.
```

With approved spec, proceed to:
- `/hs-design` for technical design decisions (if multiple approaches exist)
- `/hs-planner` for creating the execution plan
- `/hs-exec-plan` for implementation

## Keeping the Spec Alive

- **Update when decisions change** — Spec first, then code
- **Update when scope changes** — Features added or cut must be reflected
- **Commit the spec** — Version control alongside the code
- **Reference in PRs** — Link back to the spec section each PR implements

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This is simple, I don't need a spec" | Simple tasks don't need *long* specs, but they still need acceptance criteria. A two-line spec is fine. |
| "I'll write the spec after I code it" | That's documentation, not specification. The spec's value is in forcing clarity *before* code. |
| "The spec will slow us down" | A 15-minute spec prevents hours of rework. |
| "Requirements will change anyway" | That's why the spec is a living document. An outdated spec is still better than no spec. |
| "The user already told me what they want" | Users describe solutions, not problems. Dig deeper. |
| "Requirements gathering is PM work" | If you build the wrong thing, you waste everyone's time. 10 minutes of questions saves hours. |

## Red Flags

- Starting to write code without written requirements
- Asking "should I just start building?" before defining "done"
- Implementing features not mentioned in the spec
- Making architectural decisions without documenting them
- Skipping the spec because "it's obvious what to build"
- Building without asking a single clarifying question
- No acceptance criteria defined
- Scope boundaries not established

## Verification

- [ ] At least 3 clarifying questions asked and answered
- [ ] User stories written with acceptance criteria
- [ ] Acceptance assertions written — every must-have criterion has ≥ 1 assertion, every assertion is binary and references observable state only
- [ ] Scope boundaries (in/out) defined
- [ ] Requirements prioritized (must/should/could/won't)
- [ ] Human has reviewed and approved the spec
- [ ] Spec saved to `docs/product-specs/`
