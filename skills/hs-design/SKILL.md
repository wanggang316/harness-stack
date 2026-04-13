---
name: hs-design
description: Creates design docs before coding. Use when the solution is ambiguous due to problem complexity or solution complexity. Covers feature design, technical refactors, architecture decisions, and migrations.
---

# hs-design: Design Document

## Overview

Write a design doc before implementing complex changes. Design docs document the high-level implementation strategy and key design decisions, with emphasis on the **trade-offs** considered. Our job is not to produce code, but to solve problems — design docs force clarity on the problem before committing to a solution.

## When to Use

Answer these questions. If 3+ are "yes", write a design doc:

1. Are you unsure about the right design, and would upfront time to gain certainty make sense?
2. Would involving senior engineers (who can't review every code change) in the design help?
3. Is the design ambiguous or contentious enough that organizational consensus would be valuable?
4. Do cross-cutting concerns (security, performance, observability) need explicit consideration?
5. Is there strong need for a document explaining why this system was designed this way?

**When NOT to use:** The solution is obvious and there are no real trade-offs. If your design doc would just say "this is how we're implementing it" with no alternatives or trade-off discussion, skip it and write the code.

## Process

```
CREATE ──→ REVIEW ──→ IMPLEMENT ──→ MAINTAIN
  │           │          │             │
  ▼           ▼          ▼             ▼
Iterate     Wider      Update doc    Re-read
with close  audience   as plans      after 1 year
collaborators approves  meet reality
```

### Phase 1: Create and Iterate

Write the doc and rapidly iterate with colleagues who know the problem space best. Clarifying questions and suggestions drive the doc to a first stable version.

**Surface assumptions immediately:**

```
ASSUMPTIONS I'M MAKING:
1. We can add a new database table without migration downtime
2. The existing auth middleware supports the new role
3. Read latency matters more than write latency here
→ Correct me now or I'll proceed with these.
```

Write the design doc following this template. Save to `docs/design-docs/<name>.md`:

```markdown
# Design Doc: [Title]

**Status:** Draft | In Review | Approved | Implemented | Deprecated
**Author:** [name]
**Date:** [date]

## Context and Scope

<!-- Objective background facts. Rough overview of the landscape: what
     is being built or changed, and what already exists. Keep succinct —
     bring readers up to speed without restating what they already know. -->

## Goals and Non-Goals

<!-- Short bullet-point lists.
     Goals: what the system must achieve.
     Non-Goals: things that could reasonably be goals but are
     intentionally excluded. Not negated goals ("shouldn't crash")
     but deliberate scope cuts ("ACID compliance is not a goal"). -->

## Design

<!-- Start with a high-level overview, then drill into details.
     This is where trade-offs live — the most valuable part.
     Explain WHY this solution best satisfies the stated goals. -->

<!-- Include as needed:
     - System context diagram (how this fits in the larger landscape)
     - Component diagram (internal structure and boundaries)
     - API sketches (relevant parts only, not full interface definitions)
     - Data storage approach (trade-off relevant portions, not full schemas)
     - Dependency directions and module boundaries -->

## Alternatives Considered

<!-- For each alternative: what trade-offs does it make, and how do
     those trade-offs compare to the chosen design? Be thorough about
     WHY alternatives were rejected — this is what prevents
     re-litigating the decision later. -->

## Cross-Cutting Concerns

<!-- How does this design address: security, privacy, observability,
     error handling, testing strategy, migration path, rollback plan?
     Only include concerns relevant to this design. -->

## Risks

<!-- What could go wrong? Each risk needs a mitigation, not just a worry. -->
```

**Writing principles:**

- **Focus on trade-offs.** A design doc without trade-offs is an implementation manual — it misses the point. Given context (facts), goals (requirements), the doc should show why a particular solution best satisfies those goals.
- **Keep it informal.** Design docs are not formal specifications. Write in whatever form makes the most sense for the problem.
- **Length sweet spot:** 10-20 pages for major designs, 1-3 pages for incremental improvements. If it exceeds 20 pages, split into sub-problems.
- **Sketch APIs, don't copy-paste.** Formal interface definitions are verbose, contain unnecessary detail, and become outdated. Focus on the parts relevant to design trade-offs.
- **Code belongs in prototypes, not docs.** Design docs should rarely contain code. "I tried it out and it works" is a strong design argument — link to the prototype instead.

### Phase 2: Review

Share the doc with a wider audience than the original collaborators.

**Lightweight review:** Send to team; discussion happens in document comments.
**Heavyweight review:** Formal meeting where author presents to senior engineering audience.

The primary value of review is catching issues early when changes are still cheap. Don't block on heavyweight reviews for every design — seek crucial feedback directly.

```
DESIGN DOC READY FOR REVIEW:
- Title: [name]
- Trade-offs: [key trade-off in one line]
- Alternatives considered: [count]
- Cross-cutting concerns addressed: [list]
→ Approve, or tell me what to change.
```

Do NOT start implementation until there is confidence that further reviews won't require major design changes.

### Phase 3: Implement and Update

As plans meet reality, shortcomings and unaddressed requirements will surface. **Update the design doc** when this happens. Rule of thumb: if the system hasn't shipped, update the doc. If major changes happen post-ship, add an "Amendments" section linking to follow-up design docs.

With approved design doc, proceed to:
- `/hs-plan` for task breakdown
- `/hs-build` for implementation

### Phase 4: Maintain

Design docs drift from reality over time, but they remain the most accessible entry point for understanding why a system was built the way it was. When engineers encounter an unfamiliar system, their first question is often "Where is the design doc?"

**Re-read your own design docs a year later.** What did you get right? Wrong? What would you decide differently today?

## Relationship to Other Skills

- **hs-spec** defines *what* to build (product requirements) — use hs-spec first when building a new product feature; hs-design is not required for every spec
- **hs-design** defines *how* to build it and *why this way* — can be used independently for refactors, migrations, or technical decisions that don't need a product spec
- **hs-plan** breaks the approved design into tasks — comes after hs-design

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The implementation is obvious" | If it's truly obvious, the design doc takes 5 minutes. If you can't write it quickly, it wasn't obvious. |
| "I'll document the design after I build it" | That's a postmortem, not a design doc. The value is in evaluating alternatives *before* committing. |
| "Design docs are bureaucracy" | Re-implementing because you chose the wrong approach is the real bureaucracy. Design docs save money by avoiding coding rabbit holes. |
| "There's only one way to do this" | If you can't name an alternative, you haven't explored the problem space. |
| "Agile means no upfront design" | Agile isn't an excuse for not solving actually known problems correctly. Prototyping can be part of design doc creation. |

## Red Flags

- Design doc that reads like an implementation manual — describes *how* without explaining *why* or what alternatives were considered
- No Alternatives Considered section
- Risks listed without mitigations
- "Approved" status but no one outside the author actually reviewed it
- Design doc written after the code is already merged
- Doc exceeds 20 pages without splitting into sub-problems

## Verification

- [ ] Context and Scope provide objective background facts
- [ ] Goals and Non-Goals are explicitly separated
- [ ] Design section focuses on trade-offs, not just implementation details
- [ ] At least 2 alternatives considered with concrete rejection reasons
- [ ] Cross-cutting concerns addressed (security, observability, etc.)
- [ ] Risks identified with mitigations
- [ ] Human has reviewed and approved the design doc
- [ ] Design doc saved to `docs/design-docs/`
