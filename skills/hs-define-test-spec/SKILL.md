---
name: hs-define-test-spec
description: Defines the project-level user-test conventions. Use when starting a project that needs user-facing testing, when docs/user-test-patterns.md is missing or outdated, or when test conventions diverge across teams. Produces docs/user-test-patterns.md as the authoritative testing guide for whoever (human or agent) writes individual user-test cases.
---

# hs-define-test-spec: User-Test Conventions

## Overview

Define how user-level tests are written and run in this project. `docs/user-test-patterns.md` declares the target platforms, the tooling for each, the dimensions every case must consider, the selector and state-isolation rules, and where personas and fixtures live. An author of a single user-test case reads this file and knows exactly which tools to use and which formatting conventions to follow.

This skill produces the project-wide guide once (per major platform/tooling change). Individual feature-level user tests are written by `hs-test-spec`, which assumes this guide exists.

## When to Use

- Starting a new project that has user-facing behaviour to verify
- `docs/user-test-patterns.md` is missing or stale
- Tooling has shifted (e.g. adopted Chrome DevTools MCP, switched mobile runner)
- Tests written across teams diverge in style, selectors, or fixture layout
- A new platform has been added (project gains a mobile client, etc.)

**When NOT to use:** Pure CLI tools or libraries with no user-facing surface. Drive unit and integration coverage with `/hs-tdd` and `docs/references/testing-patterns.md`.

## Philosophy

You are defining the testing contract, not writing test cases.

- **Platform-shaped.** Web, macOS, iOS, Android have different runners and observable surfaces. Pick the right tool per platform; do not pretend one stack covers all.
- **Observable-only.** Selectors and assertions reference what a user can see or what an external probe can read. CSS classes, file paths, and function names are forbidden — they rot.
- **State-isolated.** Every case starts from a known seed. No case borrows side effects from another.
- **Persona-anchored.** A case names a persona; the persona supplies credentials, permissions, data. Without personas, "valid user" turns into ten different definitions.
- **Reproducible.** Every artifact (screenshot, video, log) lands at a predictable path so a failure can be replayed.

## Process

```
DISCOVER ──→ PICK PLATFORMS ──→ DEFINE ──→ APPROVE
    │              │                │           │
    ▼              ▼                ▼           ▼
Read project   Resolve target   Write user-   Human
manifests +    platforms and    test-          confirms
existing tests their tooling    patterns.md
```

### Phase 1: Discover

Read project manifests to infer scope:

- `package.json` / `Cargo.toml` / `pyproject.toml` / `Podfile` / `build.gradle` etc.
- Existing test directories (`tests/`, `e2e/`, `cypress/`, `playwright/`, `Tests/`, `androidTest/`, `xcuitest/`)
- Existing user-test conventions if any (`docs/user-test-patterns.md`, README test sections)
- The architecture doc (`docs/architecture.md`) — which surfaces are user-facing?

State assumptions before drafting:

```
ASSUMPTIONS I'M MAKING:
1. Target platforms = Web (Vite + React)
2. Primary user surface = browser at localhost:5173
3. No mobile client in this iteration
4. Backend exposes HTTP under /api
→ Correct me now or I'll proceed with these.
```

### Phase 2: Pick Platforms and Tooling

For each target platform the project has, pick exactly one primary runner and document the fallback. Common choices:

| Platform | Primary tool (LLM-agent friendly) | Fallback |
|---|---|---|
| Web | Chrome DevTools MCP (DOM / network / console / screenshot / a11y tree) | Playwright |
| macOS app | computer-use API + screenshots; XCUITest for in-app introspection | AppleScript |
| iOS app | WebDriverAgent / Appium on simulator + computer-use | XCUITest |
| Android app | UIAutomator / Maestro / Appium | adb + screenshots |
| HTTP API | curl + JSON parse | recorded fixtures |
| Background workers | log grep + DB select | metrics endpoint |

Document **which** tool, **why** it was chosen, **how** the agent invokes it (exact command or MCP call), and **what** counts as a ready signal before probing.

### Phase 3: Define

Write `docs/user-test-patterns.md` using the template at `skills/hs-define-test-spec/assets/user-test-patterns.md`. The template is platform-agnostic at the section level; pick the subsections that apply.

The document must answer:

1. **Platforms in scope** — list with one-line justification each.
2. **Tooling per platform** — primary + fallback, with the invocation pattern.
3. **Case dimensions** — happy path, edge, error, accessibility, performance, i18n, security. Which are mandatory per case, which are optional.
4. **Selector and assertion rules** — observable-only, what is allowed and what is forbidden, examples of both.
5. **State isolation rules** — every case starts from a known seed; fixture / DB reset protocol.
6. **Personas registry format** — yaml/json schema, where the file lives, how to add a new persona.
7. **Fixtures and test data layout** — where fixtures live, naming convention.
8. **Artifacts** — where screenshots / videos / logs from a run are written; retention rules.
9. **Failure-reproduction expectation** — every FAIL must come with a runnable reproducer; format and location.
10. **Anti-patterns** — concrete examples of forbidden selectors / hallucinated assertions / state leak / grader gaming, drawn from real LLM agent failure modes.

### Phase 4: Hand Off

Present for human review:

```
USER-TEST PATTERNS READY FOR REVIEW:
- Platforms in scope: [list]
- Primary tooling: [list]
- Personas registry: [path]
- Fixtures layout: [path]
- Anti-patterns called out: [count]
→ Approve, or tell me what to change.
```

Once approved, `hs-test-spec` becomes usable — each feature can produce a `docs/user-tests/<feature>.md` against the conventions defined here.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Tests are obvious; we don't need a project-wide guide." | Three teams, three selector styles, three fixture conventions. A guide written once saves the cross-team merge fight later. |
| "Just write Playwright examples and call it a day." | Cases reference what to test, not how. A pattern doc tells the author which tool to reach for, which dimensions to cover, where data lives — all the things examples don't teach. |
| "We can decide tooling per feature." | Per-feature tooling fragments the suite. One project = one tooling stack per platform. |
| "Accessibility / i18n / perf are bonus." | They are dimensions a case author must consider, even if they decide to skip. Make the decision explicit by listing the dimensions. |
| "Personas are over-engineering." | "A logged-in user" means five things across five cases without personas. Five lines of yaml prevents weeks of drift. |

## Red Flags

- The document mentions specific feature implementations (those belong in user-tests files, not the patterns doc)
- Selectors include CSS classes, internal data-test-ids that name code modules, or DOM positions (`first-child`)
- No state-reset protocol — cases will pollute each other
- No persona registry — "logged-in user" is undefined
- Anti-patterns section missing — LLM agents will repeat them
- Tooling for a platform is listed but the invocation pattern is missing — the author can't actually run it

## Verification

- [ ] All target platforms identified, each with primary + fallback tool
- [ ] Each tool entry includes the invocation pattern an agent would use
- [ ] Case dimensions listed with mandatory vs optional clearly marked
- [ ] Selector rules show one positive + one negative example each
- [ ] State isolation protocol documented (fixture / seed / storage reset)
- [ ] Personas registry schema and path documented
- [ ] Fixtures layout and naming documented
- [ ] Artifact directory and retention rule documented
- [ ] Anti-patterns section present with concrete examples
- [ ] Human reviewed and approved
- [ ] File saved to `docs/user-test-patterns.md`
