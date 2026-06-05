---
name: validation-contract
description: Authors the validation contract for a plan — the definition of done as a set of testable, user-observable assertions (VAL-<AREA>-NNN) with personas and declared evidence. Phase 2 of feature-driven-development. Built through per-area investigation subagents and adversarial review passes, not solo authoring. Produces .harness-runtime/plans/<slug>/validation-contract.md and seeds validation-state.json via hs-plan init-state. On first use in a project, also bootstraps the project-level conventions at docs/user-test-patterns.md.
---

# validation-contract: Authoring the Validation Contract

## Overview

This is **Phase 2 of feature-driven-development**: after the plan defines what to build, this skill writes the definition of done — the **validation contract**, a structured set of testable, user-observable **assertions** that anyone (human or agent) can probe to prove the build works from a user's perspective.

The output, `.harness-runtime/plans/<slug>/validation-contract.md`, becomes the source of truth for:

- Which user-visible behaviours must hold
- Which personas must be able to do them
- The exact observable assertion (`VAL-<AREA>-NNN`) that proves each behaviour
- The evidence each assertion's probe must capture, and the fixtures and starting state required

The unit of work is the **plan**. The plan is decomposed into **areas** (its user-visible sub-capabilities); each area holds the assertions for that capability. Each assertion gets a stable id `VAL-<AREA>-NNN` — those ids are what `features.json` binds to (`fulfills`) in Phase 3 and what the runtime validator probes in Phase 4. When the contract changes, the assertion ids stay stable.

A contract authored in a single pass has blind spots. This skill instead **investigates each area with a dedicated subagent**, drafts assertions from their findings, then **runs adversarial review passes to hunt for gaps** before handing off. The diligence is the point.

## When to Use

- A plan exists and is accepted at `.harness-runtime/plans/<slug>/plan.md` (Phase 1 of FDD)
- The build has user-observable behaviour (UI, API, CLI output, side effects a user can see)
- Before features are decomposed — the `VAL-` ids are what `features.json` binds to

**When NOT to use:**

- The work has no user-observable surface (pure refactor, internal optimization). Drive unit and integration coverage with test-first development and `docs/references/testing-patterns.md` instead.
- There is no accepted plan yet. Run FDD Phase 1 first; the contract is authored against the plan.

## Philosophy

You own the *definition of done*. Every requirement the plan states must reduce to one or more observable, reproducible assertions.

- **Assertions, not scripts.** An assertion names a user-visible outcome and how to verify it; the runner is decided by the patterns doc, not by you.
- **Personas anchor truth.** "A user" is ambiguous. A persona is concrete and reusable across cases.
- **Areas decompose the feature.** A feature is a set of user-visible sub-capabilities. Naming them up front gives investigation and review a spine to fan out across.
- **Journeys for the multi-step.** When the value only emerges across multiple actions (login → add to cart → checkout), the case captures the whole journey, not just the last assertion.
- **Observable-only assertions.** No implementation references. If the assertion cannot be probed from outside the running system, it does not belong here.
- **Evidence is declared, not improvised.** Each assertion names the proof a validator must capture — a screenshot, a network signature, a DB row — so PASS is backed by an artifact, not a claim.
- **Don't trust the first draft.** A solo-authored contract looks complete and isn't. Investigation surfaces what one mind forgets; adversarial review surfaces what the draft still missed.
- **Cover the plan exhaustively.** Every requirement in the plan maps to ≥ 1 assertion. A requirement with no assertion is a coverage hole. (The reverse direction — every assertion claimed by exactly one feature — is enforced later by `hs-plan contract-coverage` in Phase 3.)

## Prerequisites

1. Accepted plan at `.harness-runtime/plans/<slug>/plan.md` — Phase 1 of FDD
2. Project test conventions at `docs/user-test-patterns.md` — if missing, Step 0 below bootstraps it

If the plan is missing, stop. Item 2 is handled by Step 0 on first run.

## Process

```
[Step 0: BOOTSTRAP — first run only] ──┐
                                       ▼
INGEST → AREAS → INVESTIGATE → WRITE → REVIEW (≥2) → COVER → APPROVE
   │       │         │           │        │           │        │
   ▼       ▼         ▼           ▼        ▼           ▼        ▼
 read   plan →    one sub-    draft     adversarial  req →    human
 plan   sub-      agent per   rich      gap-hunt,    assert.  confirms
 +conv  capab.    area        assert.   update doc   matrix
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

Use the template at `skills/validation-contract/assets/user-test-patterns.md`. Pick the subsections that apply to this project. The doc must answer:

1. **Platforms in scope** — list with one-line justification each.
2. **Tooling per platform** — primary + fallback, with invocation pattern.
3. **Case dimensions** — happy path, edge, error, accessibility, performance, i18n, security. Which are mandatory per case, which are optional.
4. **Selector and assertion rules** — observable-only; one positive + one negative example each.
5. **State isolation** — every probe starts from a known seed; fixture / DB reset protocol.
6. **Surface cost tiers** — classify each surface cheap / medium / expensive so the runtime validator can plan isolation and batching.
7. **Artifacts** — where screenshots / videos / logs from a run are written; retention rules.
8. **Failure-reproduction expectation** — every FAIL ships with a runnable reproducer; format and location.
9. **Anti-patterns** — concrete examples of forbidden selectors / hallucinated assertions / state leak / grader gaming.

#### 0.4 Hand off

```
USER-TEST PATTERNS READY FOR REVIEW:
- Platforms in scope: [list]
- Primary tooling: [list]
- Surface cost tiers: [list]
- Anti-patterns called out: [count]
→ Approve, or tell me what to change.
```

Once approved, continue with Step 1 below. Subsequent runs in this project skip Step 0 entirely.

### Step 1: Ingest

Read in this order:

1. `.harness-runtime/plans/<slug>/plan.md` — extract the requirements, milestones, personas referenced, testing surface
2. `docs/user-test-patterns.md` — confirm which tooling, dimensions, and cost tiers apply
3. `docs/design-docs/<name>.md` (if a relevant design doc exists) — for surface entry points (URL paths, API endpoints, CLI commands); do **not** import implementation details into assertions

State assumptions:

```
ASSUMPTIONS I'M MAKING:
1. Requirements R1..R6 map to Web UI journeys; R7..R9 map to API + DB probes
2. Persona "returning_reader" must be added (not yet in registry)
3. No mobile platform applies to this build
→ Correct me now or I'll proceed with these.
```

### Step 2: Map Areas

Decompose the feature into its user-visible sub-capabilities — the **areas**. An area is a coherent slice of the feature a user perceives as one thing: for a login feature, areas might be *credential sign-in*, *password recovery*, *session persistence*. These become the `## Area:` sections of the document and the spine for investigation and review.

- **Scale to the plan.** A simple plan is one area — do not split artificially. A rich plan has several. Let the plan's requirements and milestones suggest the seams.
- **One cross-area slot.** Flows that span sub-capabilities *within this feature* (e.g. "recover password → then sign in with the new one") go in a single `## Cross-Area Journeys` section.
- **Stop at the feature boundary.** Flows that cross into *other features* are out of scope here — record them as an Open Question pointing to milestone integration verification, and move on.

List the areas and confirm them before investigating:

```
AREAS FOR <feature>:
1. <sub-capability A> — covers R1, R2
2. <sub-capability B> — covers R3, R4, R5
   Cross-area: <within-plan flow spanning A+B> — covers R6
→ Correct the decomposition or I'll investigate these.
```

### Step 3: Investigate (one subagent per area)

For each area, dispatch a fresh subagent to enumerate every user interaction before any assertion is written. The subagent reads the plan and the relevant source, and returns a bulleted interaction list grouped into **obvious / subtle / error-edge** — it does not write assertions. Use the prompt at `skills/validation-contract/references/investigation-prompt.md`.

- Dispatch areas in parallel; each subagent owns one area.
- For a single-area feature, one subagent suffices (or investigate inline if the feature is trivial).
- The value is the **subtle** and **error-edge** bullets — the interactions a first draft silently drops. A friendly enumeration that only lists the happy path has failed its job.

Synthesise the returned lists; they are the raw material for Step 4. Do not paste them into the document verbatim — they are interaction inventories, not cases.

### Step 4: Write Assertions

Turn the investigation inventory into assertions, grouped under their area. Each assertion is an H3 heading exactly `### VAL-<AREA>-NNN: <title>` (AREA uppercase alnum, NNN zero-padded 3 digits — this exact heading is what `hs-plan init-state` parses), followed by just two lines (see `references/user-test-template.md`):

- **One observable behaviour paragraph** — persona-anchored, describing what must hold from the user's point of view. Name the persona inline (by registry id). No implementation references.
- **An `Evidence:` line** — the proof a validator must capture to call this assertion PASS, in the patterns-doc vocabulary: `screenshot` / `console-errors` / `network(POST /sessions → 303)` / `terminal-output`.

That is the whole block. Keep it lean: per-feature preconditions live in `features.json`; the requirement→assertion mapping lives in the coverage matrix; failure artifacts are the validator's standing job — none of those belong inside the assertion.

Multi-step value (login → add to cart → checkout) is one assertion describing the whole journey's observable end-state. Put assertions that span sub-capabilities *within this plan* under a `## Cross-Area Flows` section. Keep each assertion to one observable end-state.

### Step 5: Adversarial Review (≥ 2 sequential passes)

A draft that looks complete almost always has gaps. Run **at least two sequential review passes**; each pass dispatches one adversarial reviewer per area (in parallel within the pass). Use the prompt at `skills/validation-contract/references/adversarial-review-prompt.md`.

Each reviewer is told to be skeptical and find what is **missing** — interactions, edge values, error states, accessibility, security boundaries, within-feature cross-area flows — and returns a list of missing cases, not a rubber stamp.

After each pass:

1. Synthesise the reviewers' findings.
2. **Edit the document** to add the missing cases — don't just record what they said.
3. Start the next pass on the **updated** document.

Passes run sequentially so each builds on the previous pass's additions. Two passes is the floor: the first mostly catches surface gaps, the second is where depth shows up. Stop when a pass surfaces nothing material.

Every plan requirement must be covered by at least one assertion — verify this by reading, not by a matrix. An assertion that proves no plan requirement is either hallucinated coverage (delete it) or a plan gap (surface it). If you discover the plan is incomplete or ambiguous, stop and surface it; do **not** invent behaviour the plan doesn't declare.

### Step 6: Seed state and hand off

Seed the state file, then present for human review:

```bash
hs-plan init-state          # parses the VAL- headings into validation-state.json (all pending)
```

Re-run `hs-plan init-state` after any adversarial pass that added or removed assertion headings; it preserves the status of ids that already exist.

```
VALIDATION CONTRACT READY FOR REVIEW:
- Plan: <slug>
- Areas: <list>
- Assertions written: <count>  (investigation surfaced <N>, review added <M>)
→ Approve, or tell me what to change.
```

Once approved, the `VAL-` ids are stable inputs for `features.json` (Phase 3) and runtime validation (Phase 4).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The plan's requirements are already testable; I don't need a contract." | Plan requirements are prose intent. Assertions are runnable: persona + observable behaviour + declared evidence + a stable VAL- id that features bind to. Different artifact, different consumer. |
| "I'll just write the assertions myself; investigation subagents are overhead." | Solo authoring is exactly the failure this skill exists to prevent. One mind lists the happy path and forgets the subtle interactions. The investigation pass is where they surface. |
| "One review pass is enough." | The first pass catches surface gaps; the second is where depth happens. Two is the floor, not the ceiling. |
| "The reviewers agreed it's complete." | If a reviewer rubber-stamped, the prompt wasn't adversarial. Reviewers must be told to hunt for what's missing, or they find nothing. |
| "One assertion per requirement is enough." | One requirement often covers happy + error + edge; one assertion per branch is the floor, not the ceiling. |
| "Personas are overhead — 'a logged-in user' is fine." | Across assertions, 'a logged-in user' drifts into ten slightly different meanings. Name a concrete persona inline so every probe means the same thing. |
| "I noticed a behaviour the plan doesn't cover; I'll add an assertion for it." | Stop. That's scope drift. Surface it; the plan gets updated; then the assertion follows. |

## Red Flags

- The document was written in one pass with no investigation and no adversarial review
- A reviewer returned "looks good" with no missing cases — it wasn't adversarial
- An assertion proves no plan requirement and isn't marked `(guard: ...)` (hallucinated coverage)
- A case references implementation (function name, file path, internal data-test id naming a code module)
- An assertion names no concrete persona, or "any user"
- An assertion has no `Evidence:` line, or evidence that can't be captured ("verify manually")
- The requirement coverage matrix omits a plan requirement
- An area was split so finely that each "area" is a single assertion — over-decomposition
- Selectors use CSS classes, DOM positions, or internal test ids — see `docs/user-test-patterns.md` for the allowed list

## Verification

- [ ] Plan accepted at `.harness-runtime/plans/<slug>/plan.md`
- [ ] If first run in project: `docs/user-test-patterns.md` written and approved per Step 0 (all 9 sections present; selector rules have positive + negative examples; surface cost tiers set; anti-patterns called out)
- [ ] Plan decomposed into areas; areas confirmed before investigation
- [ ] Each area investigated by a subagent (or inline for a trivial single-area plan)
- [ ] At least two adversarial review passes run; the contract was edited between passes
- [ ] Every assertion is an `### VAL-<AREA>-NNN: <title>` H3 with one observable behaviour paragraph (persona named inline) + an `Evidence:` line, per `references/user-test-template.md`
- [ ] Every plan requirement is covered by ≥ 1 assertion
- [ ] Selectors and assertions observable-only (no implementation references)
- [ ] Human reviewed and approved
- [ ] Contract saved to `.harness-runtime/plans/<slug>/validation-contract.md` and `hs-plan init-state` run
