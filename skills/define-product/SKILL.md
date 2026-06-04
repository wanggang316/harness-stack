---
name: define-product
description: Defines the product at the global level. Use when starting a new product, when the product direction is unclear, or when product-spec.md is missing or outdated. Produces docs/product-spec.md as the single source of truth for what the product is.
---

# define-product: Product Definition

## Overview

Define what the product is at the global level. `docs/product-spec.md` is the single most important document in a project — it is the starting point for all design, planning, and implementation. It answers: who does this serve, what problem does it solve, what are its core capabilities, and what is explicitly out of scope.

This is not a feature spec. Per-feature requirements are captured per-plan by `harness-stack:feature-driven-development` (in `.harness-runtime/plans/<slug>/`), and code is the source of truth for what each feature does. This document defines the product itself — the frame within which all features exist.

## When to Use

- Starting a new product or project
- `docs/product-spec.md` is missing
- Product direction is unclear or has shifted significantly
- Team (or agent) doesn't understand what the product fundamentally is
- Scope has drifted and boundaries need re-establishing

**When NOT to use:** The product is well-defined and stable. To build a feature, use `/harness-stack:feature-driven-development`. If you need a technical design doc, use `/harness-stack:design`.

## Philosophy

You are not a scribe. You are a thinking partner with an architect's perspective.

- **Challenge every assumption.** "How it's usually done" is not a reason. Push the human to articulate why.
- **Start with WHO, not WHAT.** A product that doesn't know its user can't know its boundaries.
- **The "Not Doing" list is the most valuable part.** Focus is about saying no to good ideas. Make the trade-offs explicit.
- **Simplicity is the ultimate sophistication.** Push toward the simplest version that still solves the real problem.
- **Don't be a yes-machine.** If a capability doesn't trace back to a user problem, say so. Honest pushback is more valuable than false agreement.
- **Start with user value, work backwards to capabilities.** Don't start with "what can we build" — start with "what problem do people have."

## Process

```
UNDERSTAND ──→ CHALLENGE ──→ DEFINE ──→ APPROVE
  │               │            │           │
  ▼               ▼            ▼           ▼
Load context    Push back    Write        Human
Ask WHO/WHY     on scope     product-     confirms
                and gaps     spec.md
```

### Phase 1: Understand

Before forming any opinion, deeply understand the problem space.

**Load context:**
- Read whatever project documentation and code already exists
- Understand what has been built (if anything) and what the current state is
- Identify gaps between what exists and what's been communicated

**Ask fundamental questions.** Don't proceed until these are answered:

- **Who is this for?** Not "developers" — which developers, doing what, in what context? What does their day look like without this product?
- **What problem does it solve?** Frame as pain, not solution. "Users can't X" not "We provide Y."
- **Why does this need to exist?** What happens if this product doesn't exist? What are people doing today instead?
- **What does success look like?** Not metrics — outcomes. What changes in the user's world?
- **Why now?** What has changed that makes this the right time?

```
QUESTIONS I NEED ANSWERED:
1. Who specifically is the target user? Describe their role and daily workflow.
2. What is the core pain this product addresses?
3. What are they doing today to solve this problem?
4. What does success look like from the user's perspective?
→ I need these answers before I can define the product.
```

### Phase 2: Challenge

This is the most critical phase. Do not skip it.

**Stress-test the product boundaries:**

- For each proposed capability, ask: **"Does this trace back to a specific user problem?"** If not, it doesn't belong.
- For each thing excluded, ask: **"Would including this fundamentally change the product's value?"** If yes, reconsider.
- Look for **hidden assumptions** — things being taken as given that haven't been validated.
- Look for **scope creep disguised as requirements** — "nice to have" framed as "must have."
- Look for **missing capabilities** — problems the user has that the product should solve but doesn't mention.

**Ask hard questions:**

- "You listed 8 capabilities. If you could only ship 3, which would they be? Those are your core."
- "This capability serves a different user than the others. Are you building one product or two?"
- "What would a user say if this capability was missing? If the answer is 'nothing,' cut it."
- "How is this different from [existing solution]? If the answer is 'it's the same but ours,' that's not enough."

**Surface assumptions explicitly:**

```
ASSUMPTIONS I'M CHALLENGING:
1. You assume [X] is a core user — but the capabilities described serve [Y] better. Which is the real target?
2. Capability [A] and capability [B] serve different use cases. Is there a unifying user need, or are these separate products?
3. You've excluded [Z] from scope, but users doing [workflow] would need it. Is that intentional?
→ Let's resolve these before writing the product definition.
```

### Phase 3: Define

Write the product definition. Save to `docs/product-spec.md`:

```markdown
# Product Spec: [Product Name]

**Last Updated:** [date]

## Product Overview

### Problem

<!-- What pain do users face today? 2-3 sentences.
     Frame as pain, not solution. "Users can't X" not "We provide Y." -->

### Solution

<!-- How does this product solve it? 2-3 sentences.
     No technical implementation details — describe the experience. -->

## Target Users

<!-- Be specific — not "developers" but "which developers, doing what." -->

| Role | Scenario | Core Need |
|---|---|---|
| [role] | [when/where they use it] | [what they need from it] |

## Core Capabilities

| # | Capability | Description | Status | Maturity |
|---|---|---|---|---|
| C1 | [name] | [one-line description] | Active / Planned / Deprecated | Alpha / Beta / Stable |

### Capability Dependencies

<!-- Show how capabilities depend on each other.
     Use ASCII diagram or table. Which are foundational?
     Which are independent? Which compose together? -->

\```
C1 (foundation)
├── C2
│   └── C4
└── C3
\```

## Product Boundaries

### In Scope
<!-- What the product does. Be specific. -->

### Out of Scope
<!-- What the product explicitly does NOT do, and WHY.
     Every exclusion needs a reason — "not our user,"
     "future phase," "solved by existing tools," etc. -->

### Future Consideration
<!-- Things that are out of scope NOW but may be revisited.
     Separate from permanent exclusions. -->

## Key Concepts

<!-- Core domain terminology. Prevents miscommunication
     between humans, agents, and across documents. -->

| Term | Definition | Not to Be Confused With |
|---|---|---|
| [term] | [what it means in this product] | [common misinterpretation] |

## Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | [requirement] | [measurable target] |
| Security | [requirement] | [measurable target] |
| Availability | [requirement] | [measurable target] |

## Success Metrics

| Metric | Target | Current | Measurement |
|---|---|---|---|
| [metric] | [target value] | [current value or N/A] | [how to measure] |

## Open Questions

<!-- Unresolved questions that need answers. Each should state
     what decision is blocked by the question. -->
```

**Writing principles:**

- Every capability must trace back to a user problem. If it doesn't, challenge it or cut it.
- Capability Dependencies show how the product forms a coherent whole, not just a feature list.
- Out of Scope entries without reasons are useless. Always state why.
- Future Consideration separates "not now" from "never" — both matter.
- Key Concepts prevent costly miscommunication across all downstream documents.
- If the Problem and Solution don't align, something is wrong. Stop and fix it.

### Phase 4: Approve

Present the product definition for human review. This is a critical gate.

```
PRODUCT DEFINITION READY FOR REVIEW:
- Product: [name]
- Target users: [count] roles defined
- Core capabilities: [count] (Active/Planned)
- Out of scope: [count] exclusions
- Future consideration: [count] items
- Open questions: [count] unresolved
→ This is the foundation for all feature specs and design docs.
   Approve, or tell me what to change.
```

## Relationship to Other Skills

- **harness-stack:define-product** defines the product globally → `docs/product-spec.md`
- **harness-stack:feature-driven-development** builds individual features → per-plan state in `.harness-runtime/plans/<slug>/`
- **harness-stack:define-architecture** defines system architecture → `docs/architecture.md`
- **harness-stack:design** defines technical approach for specific changes → `docs/design-docs/<name>.md`

The product definition is the root. Feature builds, architecture, and design docs all derive from it.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We know what we're building" | Then writing it down takes 15 minutes. If it takes longer, you didn't know. |
| "The product will evolve, so why define it now" | Evolution without a baseline is drift. Define the current truth, update as it changes. |
| "Just list the features" | A feature list is not a product definition. Without user problems and scope boundaries, features are disconnected solutions looking for problems. |
| "We're agile, we don't do big upfront docs" | This isn't a 50-page PRD. It's one page that says who, what, and why. Even agile needs a north star. |
| "The README already covers this" | READMEs explain how to use the product. Product specs explain why the product exists and what it should become. |

## Red Flags

- Product definition with no target user, or target user is "everyone"
- Capabilities that don't trace back to user problems
- No Out of Scope section, or Out of Scope without reasons
- Problem Statement and Value Proposition don't align
- More than 10 core capabilities — you're describing multiple products
- Defining the product by its technology instead of its users

## Verification

- [ ] Fundamental questions answered (who, what problem, why, why now)
- [ ] Assumptions surfaced and challenged
- [ ] Target users are specific with role, scenario, and core need
- [ ] Every capability traces to a user problem
- [ ] Capability dependencies mapped
- [ ] Product boundaries defined (in scope, out of scope with reasons, future consideration)
- [ ] Key concepts defined to prevent miscommunication
- [ ] Non-functional requirements have measurable targets
- [ ] Success metrics defined with measurement approach
- [ ] Problem and Solution align
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/product-spec.md`
