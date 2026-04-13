# Architecture Decision Record (ADR)

ADRs capture the reasoning behind significant technical decisions. They're the highest-value documentation you can write — code shows *what* was built, ADRs explain *why it was built this way* and *what alternatives were rejected*.

## When to Write

- Choosing a framework, library, or major dependency
- Designing a data model or database schema
- Selecting an authentication strategy
- Deciding on an API architecture (REST vs. GraphQL vs. tRPC)
- Choosing between build tools, hosting platforms, or infrastructure
- Any decision that would be expensive to reverse

**Don't write for**: Obvious choices with no real alternatives, or trivial decisions.

## Process

1. **Describe the context** — What problem are we facing? What constraints exist?
2. **Evaluate at least 2 options** — Pros, cons, and rejection reason for each
3. **State the decision** — What we chose and why
4. **Document consequences** — What becomes easier or harder because of this choice
5. **Save** — Write to `docs/adrs/ADR-NNN-short-title.md` with sequential numbering

## Structure

```markdown
# ADR-001: [Decision Title]

## Status

<!-- One of: Proposed | Accepted | Superseded by ADR-XXX | Deprecated -->

## Date

<!-- YYYY-MM-DD -->

## Context

<!-- What problem are we facing? What constraints and requirements exist? -->

## Decision

<!-- What did we decide and why? One paragraph -->

## Alternatives Considered

### [Option A]
<!-- Pros, cons, and specific reason for rejection -->

### [Option B]
<!-- Pros, cons, and specific reason for rejection -->

## Consequences

<!-- What becomes easier, what becomes harder, what the team needs to learn -->
```

## Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.
- Mark the old ADR's status as `Superseded by ADR-XXX`.

## Verification

- [ ] Context clearly describes the problem and constraints
- [ ] At least 2 alternatives evaluated with specific rejection reasons
- [ ] Decision stated clearly with rationale
- [ ] Consequences documented (both positive and negative)
- [ ] Saved to `docs/adrs/` with sequential numbering
