---
name: hs-test-spec
description: Writes the user-test set for a feature. Use when a product spec is approved and you need the QA-side artifact — personas, journeys, and observable test cases — that downstream planning and runtime validation will consume. Produces docs/user-tests/&lt;feature&gt;.md.
---

# hs-test-spec: Feature-Level User Tests

## Overview

After the product spec defines what to build (PM view) and the design doc defines how to build it (engineering view), this skill writes the QA view: a structured set of user-test cases that anyone — human or agent — can run to prove the feature works end-to-end from a user's perspective.

The output, `docs/user-tests/<feature>.md`, becomes the single source of truth for:

- Which user-visible behaviours must hold for this feature
- Which personas must be able to do them
- The exact observable assertions that prove each behaviour
- The fixtures and starting state required

Downstream, the planner binds tasks to case IDs and the runtime validator probes the cases against a running system.

## When to Use

- A product spec (`docs/product-specs/<feature>.md`) has been approved
- The feature has user-observable behaviour (UI, API, CLI output, side effects a user can see)
- Before planning starts — the planner consumes the case IDs

**When NOT to use:**

- The feature has no user-observable surface (pure refactor, internal optimization). Drive unit and integration coverage with `/hs-tdd` and `docs/references/testing-patterns.md`.
- `docs/user-test-patterns.md` does not yet exist for the project. Run `/hs-define-test-spec` first.

## Philosophy

You are the QA voice in a three-way split. PM owns intent (spec). Engineering owns realization (design doc). You own *proof* — every claim the spec makes must reduce to one or more observable, reproducible probes.

- **Cases, not scripts.** A case names a user-visible outcome and how to verify it; the runner is decided by the patterns doc, not by you.
- **Personas anchor truth.** "A user" is ambiguous. A persona is concrete and reusable across cases.
- **Journeys for the multi-step.** When the value only emerges across multiple actions (login → add to cart → checkout), the case captures the whole journey, not just the last assertion.
- **Observable-only assertions.** No implementation references. If the assertion cannot be probed from outside the running system, it does not belong here.
- **Cover the spec exhaustively.** Every Acceptance Criterion in the spec maps to at least one case. Missing rows mean missing coverage.

## Prerequisites

1. Product spec at `docs/product-specs/<feature>.md` — approved
2. Project test conventions at `docs/user-test-patterns.md` — present
3. Personas registry at `docs/user-tests/_shared/personas.yaml` — present (may be empty on first use; add personas as needed)

If any of these is missing, stop and surface the gap.

## Process

```
INGEST ──→ DECOMPOSE ──→ WRITE ──→ COVER ──→ APPROVE
   │           │            │         │          │
   ▼           ▼            ▼         ▼          ▼
Read spec   Identify    Draft        Map every   Human
+ patterns  journeys    cases per    spec AC     confirms
+ personas  + personas  journey      to ≥1 case
```

### Step 1: Ingest

Read in this order:

1. `docs/product-specs/<feature>.md` — extract user stories, personas referenced, acceptance criteria
2. `docs/user-test-patterns.md` — confirm which tooling and dimensions apply
3. `docs/user-tests/_shared/personas.yaml` — see what personas already exist
4. `docs/design-docs/<feature>.md` (if exists) — for surface entry points (URL paths, API endpoints, CLI commands); do **not** import implementation details into cases

State assumptions:

```
ASSUMPTIONS I'M MAKING:
1. AC1..AC6 each map to a Web UI journey; AC7..AC9 map to API + DB probes
2. Persona "returning_reader" must be added (not yet in registry)
3. No mobile platform applies to this feature
→ Correct me now or I'll proceed with these.
```

### Step 2: Decompose into Journeys

Group acceptance criteria into user journeys. A journey is a coherent sequence of actions a single persona takes to reach an observable outcome. Common shapes:

- **Single-step journey:** "Anonymous visitor loads /; sees the list" — one click, one observation
- **Multi-step journey:** "Returning reader logs in → opens latest report → copies share link → adds to feed reader"
- **Negative journey:** "Anonymous user attempts /admin → redirected to /login with flash message"
- **System journey:** "Cron triggers report generation at 06:00 → row appears in DB with status=completed → public API serves it within 60s"

Each journey gets:

- A title (verb phrase from the persona's perspective)
- The persona it belongs to
- 1 or more **cases** (the atomic unit of run-and-judge)

### Step 3: Write Cases

Each case has its own ID (`UT-<FEATURE-SLUG>-<NNN>`, zero-padded) and follows the structure in `references/user-test-template.md`. Fields:

- **Persona:** name from the registry
- **Preconditions:** fixtures loaded, DB seed, environment state, auth method
- **Steps:** numbered observable actions (navigate, click by role, POST with payload). No implementation references.
- **Assertions:** numbered, binary, observable-only. Each one names its verification method (DOM query / API call / DB select / log grep / file check).
- **Covers AC:** the Acceptance Criterion ID(s) from the spec this case verifies
- **Artifacts on FAIL:** what gets captured (screenshot, network HAR, query result)

Keep cases small: one journey end-state per case. Multiple closely-related end-states → multiple cases sharing setup.

### Step 4: Build the Coverage Matrix

Write a matrix at the end of the document showing every spec AC mapped to its covering case IDs:

```
| Spec AC | Covered by              |
|---------|-------------------------|
| AC1     | UT-LOGIN-001, UT-LOGIN-002 |
| AC2     | UT-LOGIN-003            |
| AC3     | UT-DASHBOARD-001        |
| ...     | ...                     |
```

Every AC in the spec must appear with ≥ 1 case. If an AC is intentionally not covered at the user-test level (e.g., it's a pure perf budget verified elsewhere), record the row with a one-line reason: `AC9 — verified by perf-budget gate, not a user-observable case`.

If you discover the spec is incomplete or ambiguous while writing cases, stop and surface it. Do **not** invent acceptance behaviour the spec doesn't declare — that's hallucinated coverage.

### Step 5: Update Shared Registries

If a case requires a persona or fixture not yet in `docs/user-tests/_shared/`, add it:

- New persona → append to `personas.yaml`
- New fixture → write to `_shared/fixtures/<name>.<ext>` (or `<feature>/fixtures/` for feature-local)

Document the addition in the case's Preconditions.

### Step 6: Hand Off

Present for human review:

```
USER TESTS READY FOR REVIEW:
- Feature: <name>
- Cases written: <count>
- Personas referenced: <list>
- Spec ACs covered: <covered>/<total>
- Personas/fixtures added: <list, if any>
→ Approve, or tell me what to change.
```

Once approved, the planner can bind tasks to case IDs and the runtime validator can probe them.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The spec's Acceptance Criteria are already testable; I don't need cases." | ACs are PM-readable prose. Cases are runnable: persona + preconditions + observable steps + binary assertions. Different artifact, different consumer. |
| "I'll just put assertions in the spec." | That's what we used to do; it conflated PM intent with QA proof and overloaded the spec. Separate them; the spec stays clean, the cases stay executable. |
| "One case per AC is enough." | One AC often covers happy + error + edge; one case per branch is the floor, not the ceiling. |
| "Personas are overhead — 'a logged-in user' is fine." | Five cases each redefine 'a logged-in user' slightly differently and drift apart. Five lines of yaml prevents weeks of pain. |
| "I'll add the coverage matrix later." | Without the matrix, missing coverage is invisible. Build it as you write cases, not after. |
| "I noticed a behaviour the spec doesn't cover; I'll add a case for it." | Stop. That's spec drift. Surface it to the PM; the spec gets updated; then the case follows. |

## Red Flags

- A case asserts behaviour not traceable to a spec AC (hallucinated coverage)
- A case references implementation (function name, file path, internal data-test id naming a code module)
- A case has no persona, or "any user"
- A case's preconditions are missing — runtime validator can't reproduce state
- The coverage matrix omits an AC, or an AC has zero cases
- Two cases depend on shared mutable state (one must run before another)
- A new persona was used without being added to the registry
- Selectors use CSS classes, DOM positions, or internal test ids — see `docs/user-test-patterns.md` for the allowed list

## Verification

- [ ] All prerequisites present (spec approved, patterns doc exists, personas registry exists)
- [ ] Every case follows the template at `references/user-test-template.md`
- [ ] Every case has persona, preconditions, steps, assertions, Covers AC, artifacts on FAIL
- [ ] Coverage matrix lists every spec AC with ≥ 1 case (or a one-line reason for non-coverage)
- [ ] Selectors and assertions observable-only (no implementation references)
- [ ] New personas / fixtures added to shared registries
- [ ] Human reviewed and approved
- [ ] File saved to `docs/user-tests/<feature>.md`
