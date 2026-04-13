---
name: hs-requirements
description: Gathers and clarifies requirements. Use when requirements are vague, incomplete, or only exist as a conversation. Use before hs-spec when the problem space needs exploration.
---

# hs-requirements: Requirements Gathering

## Overview

Extract, clarify, and structure requirements from vague inputs. Transforms "I want a dashboard" into concrete, testable requirements that hs-spec can formalize.

## When to Use

- Requirements exist only as a vague idea or conversation
- Stakeholder needs are unclear or conflicting
- Before writing a spec (hs-spec) when the problem space needs exploration
- When inheriting a project with undocumented requirements

**Don't use when**: Requirements are already clear and documented. Go straight to hs-spec.

## Process

### Step 1: Identify Stakeholders

Who cares about this feature? List:
- Primary users (who uses it daily)
- Secondary users (who uses it occasionally)
- Affected systems (what integrates with it)

### Step 2: Ask Clarifying Questions

Use the 5W1H framework:
- **What** — What exactly should this do?
- **Who** — Who is the target user?
- **Why** — What problem does this solve?
- **When** — When do users need this?
- **Where** — Where does this fit in the existing system?
- **How** — How should it behave? Any constraints?

Surface assumptions immediately:
```
ASSUMPTIONS:
1. This feature is for logged-in users only
2. Data persists across sessions
3. Mobile support is not required for MVP
→ Correct me now or I'll proceed with these.
```

### Step 3: Define User Stories

```markdown
As a [role], I want to [action], so that [benefit].

Acceptance criteria:
- Given [context], when [action], then [result]
- Given [context], when [action], then [result]
```

### Step 4: Identify Boundaries

What is IN scope vs OUT of scope:
```
IN SCOPE:
- User can create and edit tasks
- Tasks have title, description, status

OUT OF SCOPE:
- Task sharing between users (future)
- File attachments (future)
- Mobile app (future)
```

### Step 5: Prioritize

Use MoSCoW:
- **Must have** — Launch blockers
- **Should have** — Important but not blocking
- **Could have** — Nice to have
- **Won't have** — Explicitly excluded

### Step 6: Hand Off to hs-spec

Package requirements into a format hs-spec can consume:
- User stories with acceptance criteria
- Scope boundaries
- Priority ranking
- Open questions

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The user already told me what they want" | Users describe solutions, not problems. Dig deeper. |
| "Requirements gathering is PM work" | If you build the wrong thing, you waste everyone's time. 10 minutes of questions saves hours. |
| "I'll discover requirements as I build" | That's called rework. Discover them upfront. |
| "This is too small for formal requirements" | Even small features need acceptance criteria. Scale the process, don't skip it. |

## Red Flags

- Building without asking a single clarifying question
- Assuming you know what the user wants
- No acceptance criteria defined
- Scope boundaries not established
- Conflicting requirements not resolved

## Verification

- [ ] At least 3 clarifying questions asked and answered
- [ ] User stories written with acceptance criteria
- [ ] Scope boundaries (in/out) defined
- [ ] Priorities established (must/should/could/won't)
- [ ] Open questions listed and assigned
- [ ] Requirements documented in a file (not just conversation)
