---
name: hs-design
description: Creates design docs before coding. Use when the solution is ambiguous due to problem complexity or solution complexity. Covers feature design, technical refactors, architecture decisions, and migrations.
---

# hs-design: Design Document

## Overview

Write a design doc before implementing complex changes. Design docs document the high-level implementation strategy and key design decisions, with emphasis on the **trade-offs** considered. Our job is not to produce code, but to solve problems — design docs force clarity on the problem before committing to a solution.

This is a serious document. It serves as the source of truth for why a system was designed the way it was, and as the most accessible entry point when engineers encounter an unfamiliar system.

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
RESEARCH ──→ DESIGN ──→ APPROVE ──→ UPDATE
  │             │          │           │
  ▼             ▼          ▼           ▼
Load context  Propose    Human       Update doc
Read code     complete   confirms    as plans
Ask questions solution              meet reality
```

### Phase 1: Research

Before proposing anything, deeply understand the problem space. This phase is critical — a design built on shallow understanding produces shallow solutions.

**Load context:**
- Read the product spec if one exists (`docs/product-specs/`)
- Read existing design docs for related systems (`docs/design-docs/`)
- Read the architecture documentation
- Load and read the relevant source code — understand how the system works today, not just how you think it works

**Understand the constraints:**
- What does the existing architecture look like? What are its invariants?
- What are the performance, scalability, and security requirements?
- What dependencies are involved — what does this depend on, and what depends on this?
- What are the team's capabilities and the project's timeline constraints?

**Surface assumptions immediately:**

```
ASSUMPTIONS I'M MAKING:
1. We can add a new database table without migration downtime
2. The existing auth middleware supports the new role
3. Read latency matters more than write latency here
→ Correct me now or I'll proceed with these.
```

**Ask clarifying questions.** Don't guess — if something is ambiguous, ask. Design docs built on wrong assumptions waste more time than the questions would have cost.

### Phase 2: Design

Propose a complete, actionable design. Think thoroughly — the human is relying on you to consider angles they may not have thought of. Iterate with the human on specifics until the design is solid.

Write the design doc following this template. Save to `docs/design-docs/<name>.md`:

```markdown
# Design Doc: [Title]

**Status:** Draft | Approved | Implemented | Deprecated
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

### Overview

<!-- High-level summary of the chosen approach. Start here so readers
     can decide how deep to go. Explain WHY this approach best satisfies
     the stated goals — this is where trade-offs live. -->

### System Context Diagram

<!-- How does this system fit in the larger technical landscape?
     Show the system as a box within its surrounding environment —
     external systems, users, data flows in and out. This lets readers
     contextualize the design within what they already know.

     Use ASCII diagrams:
     ┌─────────┐     ┌─────────┐     ┌──────────┐
     │  Client  │────→│   API   │────→│ Database │
     └─────────┘     └─────────┘     └──────────┘  -->

### API Design

<!-- Sketch the APIs this system exposes or consumes. Focus on the parts
     relevant to design trade-offs — do NOT copy-paste formal interface
     definitions (verbose, unnecessary detail, quickly outdated).

     Show: endpoints/methods, key parameters, response shapes,
     error handling approach. -->

### Data Storage

<!-- How and in what form is data stored? Focus on trade-off relevant
     portions, not complete schema definitions.

     Cover: storage technology choice and why, key entities and
     relationships, access patterns, migration strategy if applicable. -->

### Component Boundaries

<!-- Internal structure: what are the components, what is each
     responsible for, and what is each NOT responsible for?

     Define dependency directions (who can import from whom),
     communication patterns (APIs, events, shared types),
     and module boundaries. -->

## Alternatives Considered

<!-- For each alternative: what trade-offs does it make, and how do
     those trade-offs compare to the chosen design? Be thorough about
     WHY alternatives were rejected — this is what prevents
     re-litigating the decision later.

     Every rejected alternative needs a concrete reason,
     not just "it didn't feel right." -->

## Cross-Cutting Concerns

<!-- How does this design address concerns that span the system:
     security, privacy, observability, error handling, testing strategy,
     migration path, rollback plan.
     Only include concerns relevant to this design. -->

## Risks

<!-- What could go wrong? Each risk needs a mitigation strategy,
     not just a worry. -->
```

**Not every subsection is required for every design.** A small refactor may only need Overview + Component Boundaries. A new feature touching external systems may need all sections. Include what is relevant — but when in doubt, include it. Describe as thoroughly as needed to serve as actionable implementation guidance.

**Writing principles:**

- **Focus on trade-offs.** A design doc without trade-offs is an implementation manual — it misses the point. Given context (facts) and goals (requirements), the doc should show why a particular solution best satisfies those goals.
- **Sketch APIs, don't copy-paste.** Formal interface definitions are verbose, contain unnecessary detail, and become outdated. Focus on the parts relevant to design trade-offs.
- **Code belongs in prototypes, not docs.** Design docs should rarely contain code. "I tried it out and it works" is a strong design argument — link to the prototype instead.
- **Propose, don't defer.** Present a complete recommendation. If there are genuine open questions, list them explicitly — but don't leave the core design undecided for the human to fill in.

### Phase 3: Approve

Present the design doc for human review. Do NOT proceed to implementation until approved.

```
DESIGN DOC READY FOR REVIEW:
- Title: [name]
- Key trade-off: [the central design trade-off in one line]
- Alternatives considered: [count]
- Cross-cutting concerns addressed: [list]
→ Approve, or tell me what to change.
```

### Phase 4: Update

As plans meet reality during implementation, shortcomings and unaddressed requirements will surface. **Update the design doc** when this happens — keep the doc aligned with what was actually built. If major changes happen post-ship, add an "Amendments" section linking to follow-up design docs.

With approved design doc, proceed to:
- `/hs-plan` for task breakdown
- `/hs-build` for implementation

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
| "I'll just start coding and see what works" | That's prototyping, not implementation. If you prototype first, document the findings in the design doc before committing to an approach. |

## Red Flags

- Design doc that reads like an implementation manual — describes *how* without explaining *why* or what alternatives were considered
- Proposing a design without having read the relevant source code
- No Alternatives Considered section
- Risks listed without mitigations
- "Approved" status but no human actually reviewed it
- Design doc written after the code is already merged

## Verification

- [ ] Relevant source code and documentation read before designing
- [ ] Context and Scope provide objective background facts
- [ ] Goals and Non-Goals are explicitly separated
- [ ] Design section includes trade-off analysis, not just implementation details
- [ ] Design subsections included as appropriate (system context, API, data storage, component boundaries)
- [ ] At least 2 alternatives considered with concrete rejection reasons
- [ ] Cross-cutting concerns addressed (security, observability, etc.)
- [ ] Risks identified with mitigations
- [ ] Human has reviewed and approved the design doc
- [ ] Design doc saved to `docs/design-docs/`
