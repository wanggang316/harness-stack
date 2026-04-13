---
name: hs-design
description: Creates design docs capturing why and how behind features. Use when a change touches multiple domains, involves significant architectural decisions, or when multiple approaches exist and the choice matters.
---

# hs-design: Design Document

## Overview

Write a design doc before implementing complex changes. Design docs capture the **why** and **how** — the problem, the chosen approach, and the alternatives rejected. Use for new features, technical refactors, or any change where multiple approaches exist.

## When to Use

- New feature or system that touches multiple domains
- Significant architectural change or refactor
- Technical decision with long-term implications
- Multiple approaches exist and the choice matters
- Technical debt cleanup or migration planning

**When NOT to use:** Single-domain changes with one obvious implementation path. If there's no real choice to document, skip the design doc.

## Process

Two gated phases. Do not advance until the current phase is validated by the human.

```
ANALYZE ──→ DOCUMENT ──→ HAND OFF
  │            │            │
  ▼            ▼            ▼
Explore      Human        Proceed to
trade-offs   approves     hs-plan/hs-build
```

### Phase 1: Analyze

Before writing anything, explore the problem space.

**Understand the constraints:**
- Is there a product spec? (check `docs/product-specs/` if applicable)
- What does the existing architecture look like?
- What are the performance, scalability, and security requirements?
- What dependencies are involved?

**Identify candidate approaches:**
- List at least 2 viable approaches
- For each, note: effort, risk, trade-offs, dependencies
- Don't pre-commit to one — explore honestly

**Surface assumptions:**

```
ASSUMPTIONS I'M MAKING:
1. We can add a new database table without migration downtime
2. The existing auth middleware supports the new role
3. Read latency matters more than write latency here
→ Correct me now or I'll proceed with these.
```

### Phase 2: Write the Design Doc

Write a design doc following this template. Save to `docs/design-docs/<name>.md`:

```markdown
# Design Doc: [Title]

**Status:** Draft | In Review | Approved | Implemented | Deprecated
**Author:** [name]
**Date:** [date]

## Problem Statement

<!-- What problem does this solve? Who is affected? -->

## Goals

<!-- What are we trying to achieve? -->

## Non-Goals

<!-- What are we explicitly NOT trying to do? -->

## Proposed Solution

<!-- Describe the approach in detail -->

## Alternatives Considered

<!-- What other approaches were evaluated? Why were they rejected? -->

## Dependencies

<!-- What does this depend on? What depends on this? -->

## Risks

<!-- What could go wrong? How do we mitigate it? -->

## References

<!-- Links to related specs, prior art, relevant docs -->
```

**Key principles for writing design docs:**

- Goals and Non-Goals sharpen scope — if something feels like a goal but isn't, put it in Non-Goals explicitly
- Alternatives Considered is the most valuable section — it prevents re-litigating decisions later
- Every rejected alternative needs a concrete reason, not just "it didn't feel right"
- Risks must include mitigations, not just a list of worries
- Status field tracks the doc lifecycle: Draft → In Review → Approved → Implemented → Deprecated

### Phase 3: Hand Off

Present the design doc for human review. Do NOT proceed to implementation until approved.

```
DESIGN DOC READY FOR REVIEW:
- Title: [name]
- Proposed solution: [one line]
- Alternatives considered: [count]
- Open risks: [count]
→ Approve, or tell me what to change.
```

With approved design doc, proceed to:
- `/hs-plan` for task breakdown
- `/hs-build` for implementation

## Relationship to Other Skills

- **hs-spec** defines *what* to build (product requirements) — use hs-spec first when building a new product feature
- **hs-design** defines *how* to build it (technical approach) — can be used independently for refactors, migrations, or technical decisions that don't need a product spec
- **hs-architecture** defines system-level structure — use when the scope is broader than a single feature
- **hs-plan** breaks the approved design into tasks — comes after hs-design

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The implementation is obvious" | If it's truly obvious, the design doc takes 5 minutes. If you can't write it quickly, it wasn't obvious. |
| "I'll document the design after I build it" | That's a postmortem, not a design doc. The value is in evaluating alternatives *before* committing. |
| "Design docs are bureaucracy" | Re-implementing because you chose the wrong approach is the real bureaucracy. |
| "There's only one way to do this" | If you can't name an alternative, you haven't explored the problem space. |
| "The spec already covers this" | Specs cover *what*. Design docs cover *how* and *why this way*. |

## Red Flags

- Jumping to implementation without evaluating alternatives
- Design doc with no Alternatives Considered section
- Risks listed without mitigations
- "Approved" status but no human actually reviewed it
- Design doc written after the code is already merged

## Verification

- [ ] Problem statement clearly defines who is affected and why
- [ ] Goals and Non-Goals are explicitly separated
- [ ] At least 2 alternatives considered with concrete rejection reasons
- [ ] Risks identified with mitigations
- [ ] Human has reviewed and approved the design doc
- [ ] Design doc saved to `docs/design-docs/`
