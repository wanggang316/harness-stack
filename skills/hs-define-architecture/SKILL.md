---
name: hs-define-architecture
description: Defines system architecture at the global level. Use when starting a new project, when architecture.md is missing or outdated, or when the system structure has changed significantly. Produces docs/architecture.md as the structural map of the system.
---

# hs-define-architecture: Architecture Definition

## Overview

Define the system architecture at the global level. `docs/architecture.md` is the structural map of the entire system — it describes domains, layers, dependency directions, cross-cutting concerns, and key technology choices. An agent or engineer reading this file should understand how the codebase is organized without reading every file.

This is not a design doc for a specific feature. Feature-level technical designs live in `docs/design-docs/` (via `/hs-design`). This document defines the system's overall structure — the skeleton within which all components exist.

Inspired by [matklad's ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).

## When to Use

- Starting a new project with multiple domains or layers
- `docs/architecture.md` is missing in a non-trivial project
- System structure has changed significantly (new domain, new layer, major refactor)
- Agents or engineers can't navigate the codebase
- Technology choices need to be made or revisited

**When NOT to use:** Single-file scripts, throwaway prototypes, or projects where README already covers the structure. If you need a feature-level technical design, use `/hs-design`.

## Philosophy

You are an architect, not a documenter. Your job is to make structural decisions that will outlive any individual feature.

- **Dependency directions are the most important thing.** Who imports whom defines the architecture. Get this wrong and everything rots.
- **Challenge structural decisions.** "We've always done it this way" is not architecture — it's inertia. Every boundary needs a reason.
- **Map, not manual.** Describe structure, not implementation details. ARCHITECTURE.md says *what the structure is*; design docs say *why specific decisions were made*.
- **Think in constraints, not features.** Good architecture enables features that haven't been imagined yet. It does this by defining rules that prevent the wrong kinds of coupling.
- **Simplest structure that works.** Premature architectural complexity is worse than none. Two clear layers beat five fuzzy ones.
- **Push back on complexity.** If a domain has unclear boundaries, say so. If layers don't follow consistent rules, challenge it.

## Process

```
UNDERSTAND ──→ ANALYZE ──→ DEFINE ──→ APPROVE
  │               │           │          │
  ▼               ▼           ▼          ▼
Read product    Design or   Write       Human
Determine       evaluate    architecture confirms
mode            structure   .md
```

### Phase 1: Understand

**Read the product spec:**
- `docs/product-spec.md` is the primary input — architecture serves the product, not the reverse

**Determine mode** by checking whether `docs/architecture.md` exists:

**No architecture.md → new project.** Design the architecture from scratch.
- If code already exists, scan directory structure, key files, import patterns, configuration
- If no code exists, work entirely from the product spec and constraints
- Proceed to Phase 2

**Has architecture.md → infer intent.** Read the existing doc, then infer what the user wants from their request and surrounding context:
- **Full redesign** — system structure changed fundamentally. Load: full codebase scan, design docs in `docs/design-docs/`
- **Section update** — new domain added, tech choice changed, post-refactor sync. Load: relevant portions of codebase that changed

Confirm your interpretation with the user before proceeding.

**Understand constraints:**
- What are the product's core capabilities? (from `docs/product-spec.md`)
- What are the performance, scalability, and reliability requirements?
- What is the team's expertise and capacity?
- What existing systems must this integrate with?
- What is the deployment model?

**Surface assumptions:**

```
ASSUMPTIONS I'M MAKING:
1. The system is deployed as a single service (not microservices)
2. PostgreSQL is the primary data store based on existing schema
3. The team has strong TypeScript experience
→ Correct me now or I'll proceed with these.
```

### Phase 2: Analyze

**New project — design the structure:**

From the product spec and constraints, propose the architecture:
- Domain decomposition — what are the natural boundaries based on product capabilities?
- Layers and dependency direction — what layers does each domain need? What's the dependency rule?
- Technology choices — what fits the requirements, team expertise, and constraints?
- For monorepo: what's an app (deployable) vs a package (shared library)? What are the dependency directions between packages?

Present recommendations with trade-offs:

```
PROPOSED ARCHITECTURE:
1. Three domains: auth, tasks, billing — boundaries follow product capabilities
2. Four layers: Types → Repo → Service → Runtime — strict left-to-right dependency
3. PostgreSQL — ACID compliance, relational model fits domain
→ Feedback before I write the doc?
```

**Existing project — evaluate the structure:**

Map what actually exists against what should be:
- What are the actual domains, layers, and dependency directions? Are there violations?
- Where are boundaries clean? Where are they muddy?
- For monorepo: are there dependency cycles between packages? Do all packages earn their existence?

Question structural decisions:
- "These two domains share 15 types. Are they really separate domains, or one domain split artificially?"
- "This layer depends on 3 other layers in both directions. That's not a layer — it's a tangle."
- "You have a utils/ directory with 40 files. That's not a domain — it's a junk drawer."
- "This technology choice was made 2 years ago. Has the context changed?"
- "apps/web and apps/admin share 80% of their code. Are they really separate apps?"
- "This package has only 2 exports and 1 consumer. Does it earn its existence?"

Present structural concerns:

```
STRUCTURAL CONCERNS:
1. Domain [X] and [Y] have high coupling — 12 shared types, 8 cross-domain calls. Should they merge?
2. The "service" layer has both HTTP handlers and business logic. That's two responsibilities.
3. There's no clear boundary between config and runtime — config is loaded lazily throughout.
→ How do you want to address these?
```

### Phase 3: Define

Write the architecture document. Save to `docs/architecture.md`.

Choose the template that matches the project structure, read it, and follow it:

| Project Type | Template |
|---|---|
| Single-package | [references/single-package-template.md](references/single-package-template.md) |
| Monorepo | [references/monorepo-template.md](references/monorepo-template.md) |

The monorepo template covers **workspace-level** concerns only (codemap, dependency direction, invariants). Per-package internals belong in `docs/design-docs/`.

**Writing principles:**

- **Start with domains, then layers, then details.** The reader should understand the big picture before diving in.
- **Dependency directions must be visualized.** ASCII diagrams, arrows, tables — whatever makes it instantly clear.
- **Every domain needs a reason to exist separately.** "It felt like a separate thing" is not a reason.
- **Technology Choices must include rationale.** "We chose X" without "because Y" is useless.
- **Describe what IS, not what should be.** If the architecture has warts, document them. Aspirational architecture belongs in design docs.
- **Document architectural invariants.** Rules that don't appear in code are the most important to write down — if violated, bugs won't show up immediately but the system will rot.
- **Monorepo root doc stays at workspace level.** Codemap, dependency direction, invariants, cross-cutting concerns. Per-package architecture (domains, layers, entry points) lives in `docs/design-docs/`.

### Phase 4: Approve

Present the architecture definition for human review.

```
ARCHITECTURE DEFINITION READY FOR REVIEW:
- Domains: [count] with boundaries defined
- Layers: [count] with dependency direction rules
- Key technology choices: [count] with rationale
- Cross-cutting concerns: [list]
→ This is the structural foundation for all implementation.
   Approve, or tell me what to change.
```

## Keeping Architecture Current

Architecture docs drift from reality. When the drift becomes significant:

- **After major refactors** — Update domains, layers, or boundaries that changed
- **After new domains are added** — Add them to the map
- **After technology changes** — Update Technology Choices with new rationale
- The architecture doc should always describe the system **as it is today**, not as it was or should be

## Relationship to Other Skills

- **hs-define-product** defines the product globally → `docs/product-spec.md` — architecture serves the product
- **hs-define-architecture** defines system structure → `docs/architecture.md` — the structural map
- **hs-design** defines technical approach for specific changes → `docs/design-docs/<name>.md` — says *why* specific decisions were made
- **hs-docs** generates other documentation (README, AGENTS.md, CHANGELOG, etc.)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is the architecture" | Code shows what exists. It doesn't show the rules — which dependencies are allowed, which are violations, what the boundaries are. |
| "Architecture will emerge naturally" | Emergent architecture is another name for accidental complexity. Explicit structure prevents the ball of mud. |
| "We'll architect when we scale" | Architectural refactors are 10x more expensive than getting boundaries right initially. Even small projects benefit from clear dependency directions. |
| "Let's just use what we used last time" | Context matters. Every technology choice should be evaluated against the current problem, not the previous one. |
| "We can refactor later" | You can. You won't. And when you do, it will be 10x harder. |

## Red Flags

- No dependency direction rules defined
- Domains without clear boundaries or single responsibilities
- "Utils" or "helpers" directories with 20+ files (it's a missing domain)
- Circular dependencies between domains
- Architecture doc that describes aspirational state, not actual state
- Technology choices without rationale
- Architecture defined without reading the product spec
- Monorepo root doc containing per-package internals (domains, layers) instead of deferring to `docs/design-docs/`
- No architectural invariants documented

## Verification

- [ ] Product spec read before defining architecture
- [ ] Mode determined: new project (no architecture.md) or update (exists, intent confirmed)
- [ ] (Existing project) Actual codebase scanned — structure reflects reality, not aspiration
- [ ] Domains listed with purpose, boundary, and key files
- [ ] Layers defined with explicit dependency direction rules
- [ ] Dependency rules documented and visualized
- [ ] Cross-cutting concerns documented with mechanisms
- [ ] Entry points identified
- [ ] Technology choices include rationale
- [ ] Structural concerns raised and discussed with human
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/architecture.md`
- [ ] Architectural invariants documented (rules not visible in code)
- [ ] (Monorepo) Codemap lists all packages with purpose
- [ ] (Monorepo) Dependency direction visualized with enforcement mechanism
- [ ] (Monorepo) Root doc stays at workspace level — per-package internals in `docs/design-docs/`
