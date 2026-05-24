---
name: hs-test-spec
description: Writes the user-test set for a feature. Use when a product spec is approved and you need the QA-side artifact — personas, journeys, and observable test cases — that downstream planning and runtime validation will consume. Produces docs/user-tests/&lt;feature&gt;.md. On first use in a project, also bootstraps the project-level conventions at docs/user-test-patterns.md.
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

## Philosophy

You are the QA voice in a three-way split. PM owns intent (spec). Engineering owns realization (design doc). You own *proof* — every claim the spec makes must reduce to one or more observable, reproducible probes.

- **Cases, not scripts.** A case names a user-visible outcome and how to verify it; the runner is decided by the patterns doc, not by you.
- **Personas anchor truth.** "A user" is ambiguous. A persona is concrete and reusable across cases.
- **Journeys for the multi-step.** When the value only emerges across multiple actions (login → add to cart → checkout), the case captures the whole journey, not just the last assertion.
- **Observable-only assertions.** No implementation references. If the assertion cannot be probed from outside the running system, it does not belong here.
- **Cover the spec exhaustively.** Every Acceptance Criterion in the spec maps to at least one case. Missing rows mean missing coverage.

## Prerequisites

1. Product spec at `docs/product-specs/<feature>.md` — approved
2. Project test conventions at `docs/user-test-patterns.md` — if missing, Step 0 below bootstraps it
3. Personas registry at `docs/user-tests/_shared/personas.yaml` — if missing, Step 0 creates it (may be empty; add personas as cases need them)

If the spec is missing, stop. Items 2 and 3 are handled by Step 0 on first run.

## Process

```
[Step 0: BOOTSTRAP — first run only] ──┐
                                       ▼
INGEST ──→ DECOMPOSE ──→ WRITE ──→ COVER ──→ APPROVE
   │           │            │         │          │
   ▼           ▼            ▼         ▼          ▼
Read spec   Identify    Draft        Map every   Human
+ patterns  journeys    cases per    spec AC     confirms
+ personas  + personas  journey      to ≥1 case
```

### Step 0: Bootstrap project conventions (first run only)

Run once per project. Skip when `docs/user-test-patterns.md` already exists and is approved. The bootstrap defines the testing contract that every later `/hs-test-spec` invocation (and the runtime validator) reads.

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
6. **Personas registry format** — yaml/json schema, where the file lives, how to add a new persona.
7. **Fixtures and test data layout** — where fixtures live, naming convention.
8. **Artifacts** — where screenshots / videos / logs from a run are written; retention rules.
9. **Failure-reproduction expectation** — every FAIL ships with a runnable reproducer; format and location.
10. **Anti-patterns** — concrete examples of forbidden selectors / hallucinated assertions / state leak / grader gaming.

#### 0.4 Hand off

```
USER-TEST PATTERNS READY FOR REVIEW:
- Platforms in scope: [list]
- Primary tooling: [list]
- Personas registry: [path]
- Fixtures layout: [path]
- Anti-patterns called out: [count]
→ Approve, or tell me what to change.
```

Once approved, continue with Step 1 below. Subsequent `/hs-test-spec` runs in this project skip Step 0 entirely.

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

- [ ] Spec approved at `docs/product-specs/<feature>.md`
- [ ] If first run in project: `docs/user-test-patterns.md` written and approved per Step 0 (all 10 sections present; selector rules have positive + negative examples; anti-patterns called out)
- [ ] `docs/user-tests/_shared/personas.yaml` exists (may be empty initially)
- [ ] Every case follows the template at `references/user-test-template.md`
- [ ] Every case has persona, preconditions, steps, assertions, Covers AC, artifacts on FAIL
- [ ] Coverage matrix lists every spec AC with ≥ 1 case (or a one-line reason for non-coverage)
- [ ] Selectors and assertions observable-only (no implementation references)
- [ ] New personas / fixtures added to shared registries
- [ ] Human reviewed and approved
- [ ] File saved to `docs/user-tests/<feature>.md`
