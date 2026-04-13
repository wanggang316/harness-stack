---
name: hs-architecture
description: Designs system architecture. Use when making architectural decisions, designing new systems, or evaluating technical approaches. Use before hs-plan for complex features.
---

# hs-architecture: Architecture Design

## Overview

Design system architecture with clear boundaries, dependency directions, and technical decisions. Produces architecture decision records (ADRs) that document why choices were made, not just what was chosen.

## When to Use

- Designing a new system or major feature
- Making technology choices (database, framework, etc.)
- Evaluating multiple technical approaches
- Before hs-plan for complex, multi-component features
- When existing architecture needs significant changes

**Don't use when**: Simple features that fit existing patterns. Follow existing architecture instead.

## Process

### Step 1: Understand Constraints

Before designing, identify:
- **Technical constraints** — Existing tech stack, infrastructure, performance requirements
- **Business constraints** — Timeline, budget, team skills
- **Integration constraints** — External APIs, existing systems, data formats

### Step 2: Map the System

Draw the component diagram:
```
┌─────────┐     ┌─────────┐     ┌──────────┐
│  Client  │────→│   API   │────→│ Database │
│  (React) │     │ (Express)│     │ (Postgres)│
└─────────┘     └────┬────┘     └──────────┘
                     │
                     ▼
                ┌─────────┐
                │  Queue   │
                │ (Redis)  │
                └─────────┘
```

Identify:
- Components and their responsibilities
- Data flow between components
- Dependency directions (who depends on whom)
- System boundaries (internal vs external)

### Step 3: Evaluate Approaches

For each significant decision, evaluate at least 2 options:

```markdown
## Decision: Authentication Strategy

### Option A: Session-based (cookies)
- Pros: Simple, built-in CSRF protection, server-controlled
- Cons: Requires session storage, harder to scale horizontally

### Option B: JWT tokens
- Pros: Stateless, easy to scale, works across domains
- Cons: Can't revoke easily, larger payload, XSS risk

### Recommendation: Option A
Reason: Simpler for our use case, team has experience, single-domain app.
```

### Step 4: Write Architecture Decision Record (ADR)

```markdown
# ADR-001: [Decision Title]

## Status
Accepted | Proposed | Deprecated

## Context
What is the issue that we're seeing that motivates this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult because of this change?

## Alternatives Considered
What other options were evaluated and why were they rejected?
```

### Step 5: Define Boundaries

Establish clear module boundaries:
- What each module is responsible for
- What each module is NOT responsible for
- How modules communicate (APIs, events, shared types)
- Dependency rules (who can import from whom)

```
DEPENDENCY RULES:
- UI → API Client → API → Database (one direction only)
- Shared types can be imported by any layer
- No circular dependencies
- External services accessed only through adapters
```

### Step 6: Validate with hs-architect Subagent

For complex decisions, consult the hs-architect subagent for a second opinion on:
- Scalability concerns
- Security implications
- Maintainability trade-offs

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll figure out the architecture as we go" | That's how you get a big ball of mud. Spend 30 minutes designing upfront. |
| "Let's just use what we used last time" | Context matters. Evaluate whether the previous choice fits this problem. |
| "Architecture is over-engineering for this size" | Even small projects benefit from clear boundaries and dependency rules. |
| "We can refactor later" | Architectural refactors are 10x more expensive than getting it right initially. |

## Red Flags

- No written architecture decisions
- Circular dependencies between modules
- "God objects" that do everything
- Technology chosen without evaluating alternatives
- No clear module boundaries
- Architecture decisions made implicitly (not documented)

## Verification

- [ ] Component diagram created
- [ ] At least 2 options evaluated for major decisions
- [ ] ADR written for each significant decision
- [ ] Module boundaries defined
- [ ] Dependency directions documented
- [ ] Human has reviewed and approved architecture
