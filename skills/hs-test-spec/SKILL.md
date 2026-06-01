---
name: hs-test-spec
description: Writes the user-test set for a feature — the QA-side artifact of personas, areas, and observable cases that proves the feature works end-to-end. Built through per-area investigation subagents and adversarial review passes, not solo authoring. Produces docs/user-tests/&lt;feature&gt;.md. On first use in a project, also bootstraps the project-level conventions at docs/user-test-patterns.md.
---

# hs-test-spec: Feature-Level User Tests

## Overview

After the product spec defines what to build (PM view) and the design doc defines how to build it (engineering view), this skill writes the QA view: a structured set of user-test cases that anyone — human or agent — can run to prove the feature works end-to-end from a user's perspective.

The output, `docs/user-tests/<feature>.md`, becomes the single source of truth for:

- Which user-visible behaviours must hold for this feature
- Which personas must be able to do them
- The exact observable assertions that prove each behaviour
- The evidence each case must capture, and the fixtures and starting state required

The unit of work is the **feature**: one feature spec maps to one user-test document (same slug). Inside the document, the feature is decomposed into **areas** (its user-visible sub-capabilities); each area holds journeys, and each journey holds cases.

A test set authored by a single pass has blind spots. This skill instead **investigates each area with a dedicated subagent**, drafts cases from their findings, then **runs adversarial review passes to hunt for gaps** before handing off. The diligence is the point.

## When to Use

- A product spec (`docs/product-specs/<feature>.md`) has been approved
- The feature has user-observable behaviour (UI, API, CLI output, side effects a user can see)
- Before planning starts — the case IDs are what planning binds to

**When NOT to use:**

- The feature has no user-observable surface (pure refactor, internal optimization). Drive unit and integration coverage with test-first development and `docs/references/testing-patterns.md` instead.
- Integration flows that span **multiple features**. This document is scoped to one feature; cross-feature behaviour is verified at the milestone integration gate, not here.

## Philosophy

You are the QA voice in a three-way split. PM owns intent (spec). Engineering owns realization (design doc). You own *proof* — every claim the spec makes must reduce to one or more observable, reproducible probes.

- **Cases, not scripts.** A case names a user-visible outcome and how to verify it; the runner is decided by the patterns doc, not by you.
- **Personas anchor truth.** "A user" is ambiguous. A persona is concrete and reusable across cases.
- **Areas decompose the feature.** A feature is a set of user-visible sub-capabilities. Naming them up front gives investigation and review a spine to fan out across.
- **Journeys for the multi-step.** When the value only emerges across multiple actions (login → add to cart → checkout), the case captures the whole journey, not just the last assertion.
- **Observable-only assertions.** No implementation references. If the assertion cannot be probed from outside the running system, it does not belong here.
- **Evidence is declared, not improvised.** Each case names the proof a validator must capture — a screenshot, a network signature, a DB row — so PASS is backed by an artifact, not a claim.
- **Don't trust the first draft.** A solo-authored set looks complete and isn't. Investigation surfaces what one mind forgets; adversarial review surfaces what the draft still missed.
- **Cover the spec exhaustively, in both directions.** Every Acceptance Criterion maps to ≥ 1 case, and every case traces back to ≥ 1 AC (or is explicitly marked non-AC). Gaps in either direction are coverage holes.

## Prerequisites

1. Product spec at `docs/product-specs/<feature>.md` — approved
2. Project test conventions at `docs/user-test-patterns.md` — if missing, Step 0 below bootstraps it
3. Personas registry at `docs/user-tests/_shared/personas.yaml` — if missing, Step 0 creates it (may be empty; add personas as cases need them)

If the spec is missing, stop. Items 2 and 3 are handled by Step 0 on first run.

## Process

```
[Step 0: BOOTSTRAP — first run only] ──┐
                                       ▼
INGEST → AREAS → INVESTIGATE → WRITE → REVIEW (≥2) → COVER → APPROVE
   │       │         │           │        │           │        │
   ▼       ▼         ▼           ▼        ▼           ▼        ▼
 read   feature   one sub-    draft     adversarial  bi-      human
 spec   → sub-    agent per   rich      gap-hunt,    direct.  confirms
 +conv  capab.    area        cases     update doc   matrix
```

### Step 0: Bootstrap project conventions (first run only)

Run once per project. Skip when `docs/user-test-patterns.md` already exists and is approved. The bootstrap defines the testing contract that every later run (and the runtime validator) reads.

You are defining the testing contract, not writing test cases. Five rules guide the doc:

- **Platform-shaped.** Web, macOS, iOS, Android have different runners and observable surfaces. Pick the right tool per platform; do not pretend one stack covers all.
- **Observable-only.** Selectors and assertions reference what a user can see or what an external probe can read. CSS classes, file paths, and function names are forbidden — they rot.
- **State-isolated.** Every case starts from a known seed. No case borrows side effects from another.
- **Persona-anchored.** A case names a persona; the persona supplies credentials, permissions, data. Without personas, "valid user" turns into ten different definitions.
- **Reproducible.** Every artifact (screenshot, video, log) lands at a predictable path so a failure can be replayed.

#### 0.1 Discover

Read project manifests to infer scope:

- `package.json` / `Cargo.toml` / `pyproject.toml` / `Podfile` / `build.gradle` etc.
- Existing test directories (`tests/`, `e2e/`, `cypress/`, `playwright/`, `Tests/`, `androidTest/`, `xcuitest/`)
- Architecture doc (`docs/architecture.md`) — which surfaces are user-facing?

Surface assumptions before drafting:

```
ASSUMPTIONS I'M MAKING:
1. Target platforms = Web (Vite + React)
2. Primary user surface = browser at localhost:5173
3. No mobile client in this iteration
4. Backend exposes HTTP under /api
→ Correct me now or I'll proceed with these.
```

#### 0.2 Pick platforms and tooling

For each target platform, pick exactly one primary runner and document the fallback:

| Platform | Primary tool (LLM-agent friendly) | Fallback |
|---|---|---|
| Web | Chrome DevTools MCP (DOM / network / console / screenshot / a11y tree) | Playwright |
| macOS app | computer-use API + screenshots; XCUITest for in-app introspection | AppleScript |
| iOS app | WebDriverAgent / Appium on simulator + computer-use | XCUITest |
| Android app | UIAutomator / Maestro / Appium | adb + screenshots |
| HTTP API | curl + JSON parse | recorded fixtures |
| Background workers | log grep + DB select | metrics endpoint |

Document **which** tool, **why** chosen, **how** the agent invokes it (exact command or MCP call), and **what** counts as a ready signal before probing.

#### 0.3 Write `docs/user-test-patterns.md`

Use the template at `skills/hs-test-spec/assets/user-test-patterns.md`. Pick the subsections that apply to this project. The doc must answer:

1. **Platforms in scope** — list with one-line justification each.
2. **Tooling per platform** — primary + fallback, with invocation pattern.
3. **Case dimensions** — happy path, edge, error, accessibility, performance, i18n, security. Which are mandatory per case, which are optional.
4. **Selector and assertion rules** — observable-only; one positive + one negative example each.
5. **State isolation** — every case starts from a known seed; fixture / DB reset protocol.
6. **Surface cost tiers** — classify each surface cheap / medium / expensive so the runtime validator can plan isolation and batching.
7. **Personas registry format** — yaml/json schema, where the file lives, how to add a new persona.
8. **Fixtures and test data layout** — where fixtures live, naming convention.
9. **Artifacts** — where screenshots / videos / logs from a run are written; retention rules.
10. **Failure-reproduction expectation** — every FAIL ships with a runnable reproducer; format and location.
11. **Anti-patterns** — concrete examples of forbidden selectors / hallucinated assertions / state leak / grader gaming.

#### 0.4 Hand off

```
USER-TEST PATTERNS READY FOR REVIEW:
- Platforms in scope: [list]
- Primary tooling: [list]
- Surface cost tiers: [list]
- Personas registry: [path]
- Anti-patterns called out: [count]
→ Approve, or tell me what to change.
```

Once approved, continue with Step 1 below. Subsequent runs in this project skip Step 0 entirely.

### Step 1: Ingest

Read in this order:

1. `docs/product-specs/<feature>.md` — extract user stories, personas referenced, acceptance criteria
2. `docs/user-test-patterns.md` — confirm which tooling, dimensions, and cost tiers apply
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

### Step 2: Map Areas

Decompose the feature into its user-visible sub-capabilities — the **areas**. An area is a coherent slice of the feature a user perceives as one thing: for a login feature, areas might be *credential sign-in*, *password recovery*, *session persistence*. These become the `## Area:` sections of the document and the spine for investigation and review.

- **Scale to the feature.** A simple feature is one area (the feature itself) — do not split artificially. A rich feature has several. Let the spec's acceptance criteria and user stories suggest the seams.
- **One cross-area slot.** Flows that span sub-capabilities *within this feature* (e.g. "recover password → then sign in with the new one") go in a single `## Cross-Area Journeys` section.
- **Stop at the feature boundary.** Flows that cross into *other features* are out of scope here — record them as an Open Question pointing to milestone integration verification, and move on.

List the areas and confirm them before investigating:

```
AREAS FOR <feature>:
1. <sub-capability A> — covers AC1, AC2
2. <sub-capability B> — covers AC3, AC4, AC5
   Cross-area: <within-feature flow spanning A+B> — covers AC6
→ Correct the decomposition or I'll investigate these.
```

### Step 3: Investigate (one subagent per area)

For each area, dispatch a fresh subagent to enumerate every user interaction before any case is written. The subagent reads the spec and the relevant source, and returns a bulleted interaction list grouped into **obvious / subtle / error-edge** — it does not write cases. Use the prompt at `skills/hs-test-spec/references/investigation-prompt.md`.

- Dispatch areas in parallel; each subagent owns one area.
- For a single-area feature, one subagent suffices (or investigate inline if the feature is trivial).
- The value is the **subtle** and **error-edge** bullets — the interactions a first draft silently drops. A friendly enumeration that only lists the happy path has failed its job.

Synthesise the returned lists; they are the raw material for Step 4. Do not paste them into the document verbatim — they are interaction inventories, not cases.

### Step 4: Write Cases

Turn the investigation inventory into cases, grouped under their area. Each case has its own ID (`UT-<FEATURE-SLUG>-<NNN>`, zero-padded) and follows the structure in `references/user-test-template.md`. Fields:

- **Persona:** name from the registry
- **Preconditions:** fixtures loaded, DB seed, environment state, auth method
- **Steps:** numbered observable actions (navigate, click by role, POST with payload). No implementation references.
- **Assertions:** numbered, binary, observable-only. Each one names its verification method (DOM query / API call / DB select / log grep / file check).
- **Evidence:** the proof a validator must capture to call this case PASS — e.g. `screenshot of dashboard`, `network: POST /sessions → 303`, `DB row orders(user_id=$persona.id)`. This is the proof obligation regardless of outcome; on-FAIL artifacts are separate (below).
- **Covers AC:** the Acceptance Criterion ID(s) from the spec this case verifies
- **Artifacts on FAIL:** what gets captured when the case fails (screenshot, network HAR, query result, reproducer)

Keep cases small: one journey end-state per case. Multiple closely-related end-states → multiple cases sharing setup.

### Step 5: Adversarial Review (≥ 2 sequential passes)

A draft that looks complete almost always has gaps. Run **at least two sequential review passes**; each pass dispatches one adversarial reviewer per area (in parallel within the pass). Use the prompt at `skills/hs-test-spec/references/adversarial-review-prompt.md`.

Each reviewer is told to be skeptical and find what is **missing** — interactions, edge values, error states, accessibility, security boundaries, within-feature cross-area flows — and returns a list of missing cases, not a rubber stamp.

After each pass:

1. Synthesise the reviewers' findings.
2. **Edit the document** to add the missing cases — don't just record what they said.
3. Start the next pass on the **updated** document.

Passes run sequentially so each builds on the previous pass's additions. Two passes is the floor: the first mostly catches surface gaps, the second is where depth shows up. Stop when a pass surfaces nothing material.

### Step 6: Build the Coverage Matrix

Write a matrix at the end of the document mapping every spec AC to its covering cases:

```
| Spec AC | Covered by              |
|---------|-------------------------|
| AC1     | UT-LOGIN-001, UT-LOGIN-002 |
| AC2     | UT-LOGIN-003            |
| AC3     | UT-DASHBOARD-001        |
```

Coverage is verified in **both directions**:

- **Every AC → ≥ 1 case.** A missing row is missing coverage. If an AC is intentionally not covered at the user-test level (e.g. a pure perf budget verified elsewhere), record the row with a one-line reason: `AC9 — verified by perf-budget gate, not a user-observable case`.
- **Every case → ≥ 1 AC.** A case that traces to no AC is either hallucinated coverage (delete it) or a spec gap (surface it). A case that is deliberately non-AC (a within-feature integration flow, a regression guard) is marked `(non-AC: <reason>)` rather than left dangling.

If you discover the spec is incomplete or ambiguous while building the matrix, stop and surface it. Do **not** invent acceptance behaviour the spec doesn't declare.

### Step 7: Update Registries and Hand Off

If a case requires a persona or fixture not yet in `docs/user-tests/_shared/`, add it:

- New persona → append to `personas.yaml`
- New fixture → write to `_shared/fixtures/<name>.<ext>` (or `<feature>/fixtures/` for feature-local)

Document the addition in the case's Preconditions and in the document's "Personas / Fixtures Added" section.

Then present for human review:

```
USER TESTS READY FOR REVIEW:
- Feature: <name>
- Areas: <list>
- Cases written: <count>  (investigation surfaced <N>, review added <M>)
- Personas referenced: <list>
- Spec ACs covered: <covered>/<total>; orphan cases: <count, should be 0>
- Personas/fixtures added: <list, if any>
→ Approve, or tell me what to change.
```

Once approved, the case IDs are stable inputs for planning and runtime validation.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The spec's Acceptance Criteria are already testable; I don't need cases." | ACs are PM-readable prose. Cases are runnable: persona + preconditions + observable steps + binary assertions + declared evidence. Different artifact, different consumer. |
| "I'll just write the cases myself; investigation subagents are overhead." | Solo authoring is exactly the failure this skill exists to prevent. One mind lists the happy path and forgets the subtle interactions. The investigation pass is where they surface. |
| "One review pass is enough." | The first pass catches surface gaps; the second is where depth happens. Two is the floor, not the ceiling. |
| "The reviewers agreed it's complete." | If a reviewer rubber-stamped, the prompt wasn't adversarial. Reviewers must be told to hunt for what's missing, or they find nothing. |
| "One case per AC is enough." | One AC often covers happy + error + edge; one case per branch is the floor, not the ceiling. |
| "Personas are overhead — 'a logged-in user' is fine." | Five cases each redefine 'a logged-in user' slightly differently and drift apart. Five lines of yaml prevents weeks of pain. |
| "On-FAIL artifacts are enough; I don't need an Evidence field." | On-FAIL artifacts explain a failure. Declared evidence is what makes a PASS trustworthy — without it, "it passed" is a claim, not a record. |
| "I noticed a behaviour the spec doesn't cover; I'll add a case for it." | Stop. That's spec drift. Surface it to the PM; the spec gets updated; then the case follows. |
| "This flow spans two features but it's important; I'll add it here." | This document is one feature. Cross-feature flows belong to milestone integration verification. Note it as an Open Question and keep this set scoped. |

## Red Flags

- The document was written in one pass with no investigation and no adversarial review
- A reviewer returned "looks good" with no missing cases — it wasn't adversarial
- A case asserts behaviour not traceable to a spec AC, and isn't marked `(non-AC: ...)` (hallucinated coverage)
- A case references implementation (function name, file path, internal data-test id naming a code module)
- A case has no persona, or "any user"
- A case has no Evidence field, or evidence that can't be captured ("verify manually")
- A case's preconditions are missing — the runtime validator can't reproduce state
- The coverage matrix omits an AC, or a case traces to no AC
- An area was split so finely that each "area" is a single case — over-decomposition
- Two cases depend on shared mutable state (one must run before another)
- A new persona was used without being added to the registry
- Selectors use CSS classes, DOM positions, or internal test ids — see `docs/user-test-patterns.md` for the allowed list

## Verification

- [ ] Spec approved at `docs/product-specs/<feature>.md`
- [ ] If first run in project: `docs/user-test-patterns.md` written and approved per Step 0 (all 11 sections present; selector rules have positive + negative examples; surface cost tiers set; anti-patterns called out)
- [ ] `docs/user-tests/_shared/personas.yaml` exists (may be empty initially)
- [ ] Feature decomposed into areas; areas confirmed before investigation
- [ ] Each area investigated by a subagent (or inline for a trivial single-area feature)
- [ ] At least two adversarial review passes run; the document was edited between passes
- [ ] Every case follows the template at `references/user-test-template.md`
- [ ] Every case has persona, preconditions, steps, assertions, Evidence, Covers AC, artifacts on FAIL
- [ ] Coverage matrix is bidirectional: every AC has ≥ 1 case; every case traces to ≥ 1 AC or is marked non-AC
- [ ] Selectors and assertions observable-only (no implementation references)
- [ ] New personas / fixtures added to shared registries
- [ ] Human reviewed and approved
- [ ] File saved to `docs/user-tests/<feature>.md`
