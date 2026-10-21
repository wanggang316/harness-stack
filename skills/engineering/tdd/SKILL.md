---
name: tdd
description: Test-driven development. Use when adding or changing observable behavior, fixing bugs, or explicitly asked to write tests first.
metadata:
  credits:
    - skill: tdd
      author: Matt Pocock
      url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md"
    - skill: tdd
      author: Lauren Tan
      organisation: Cursor
      url: "https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md"
---

# tdd

Drive each Red → Green → Refactor cycle with one observable behavior. First prove that the test detects the missing behavior, then implement it. Use each cycle's feedback to choose the next step, instead of writing all tests before implementing an imagined design.

Use appropriate validation for documentation, static content, and configuration changes with no behavioral effect. For behavior-preserving refactors, pin existing behavior first and keep tests green. A characterization test that passes immediately is a valid baseline; do not manufacture a failure.

## Choose the test seam

Read relevant domain knowledge, active decisions, implementation, and existing tests. Derive commands and the runtime environment from project configuration. Use project terminology and testing conventions.

Test at an interface available to callers. Briefly state what the seam proves and what it misses. A module API, component interaction, HTTP endpoint, or CLI can be a seam; not every test needs the UI or complete system. Prefer the lowest-cost level that catches the target risk. Use integration checks for wiring, persistence, or protocol risks. Do not allocate tests by fixed ratios.

Reuse established interfaces and behavior. Ask only about unresolved public contracts, business semantics, or major design choices. If testing is difficult, first inspect interface and dependency coupling; do not add unnecessary production abstractions for tests.

List the behaviors to cover and start with the critical path, original defect, or a high-risk boundary. This is a behavior list, not a batch of tests. Advance one verifiable slice at a time.

## Red: establish a valid failure

Write one test for the current behavior, exercising real logic through the chosen interface. Derive expected values from the spec, an independent worked example, or a confirmed baseline. Copying the algorithm under test can reproduce the same error in both places.

Run the test and inspect why it fails. An assertion failure caused by missing target behavior is a valid signal. Fix missing dependencies, wrong paths, or runner failures first. If a new interface causes a compilation or import failure, add the minimum declaration needed to reach the target behavior, then confirm the test fails without implementing it in advance.

For a bug fix, capture the original failure first and make it a deterministic regression test where practical. If the test passes immediately, check whether the behavior already exists, reproduction conditions are incomplete, or assertions are ineffective. It is not yet a proven regression test.

## Green: pass the current slice

Implement only what the current behavior needs, using project patterns. Run the same test, then directly affected existing tests. Observe actual passing results before choosing the next behavior.

When an existing assertion conflicts with the implementation, use the contract to determine which is wrong. Change assertions only when expected behavior has changed, and explain why. Do not hide failures by skipping tests, weakening assertions, or accepting uninspected snapshots.

Narrow unexpected failures to implementation, tests, environment, or the established baseline. Without before-change evidence, classify a failure as unknown rather than unrelated to this change.

## Refactor: improve structure while green

While tests pass, remove duplication, unclear names, or mixed responsibilities introduced in this cycle. Rerun relevant checks after each structural change and preserve behavior. Small improvements prevent minimal implementations from accumulating into an unmaintainable structure. Make no change without a concrete benefit.

Return to Red for new behavior. Establish scope and trade-offs before a cross-module refactor or new architectural choice; keep unrelated redesign out of this cycle. Pause implementation to resolve interface design questions when needed.

## Contracts tests must protect

- Assert caller-visible results and prefer real internal collaboration. Private methods, internal call order, and implementation layout are usually not contracts.
- Each test explains one behavior and may use several related assertions. For example, no shipment after a declined payment is part of that failure behavior.
- Use fakes, stubs, or mocks at uncontrollable boundaries such as time, randomness, and external services. Prefer existing isolation facilities or test services. Avoid tests that only confirm a mock returns its configured value.
- When an external side effect is part of the contract, assert its payload or call count. A storage adapter's contract may also be checked directly against a test database. The responsibility under test determines the boundary; do not ban all interaction assertions.
- Fix inputs and isolate test state. Control flaky triggers or preserve reproducible evidence. Repeated execution until an accidental pass does not prove a fix.

Read [Test seams and evidence examples](references/test-design.md) when assessing interface assertions, test doubles, or independent expected values.

## Close with evidence

After completing the slices, run affected test suites and the project's required full checks. Verify wiring or user flows that unit tests cannot cover at the relevant runtime entry point. Report compilation, static checks, and runtime results separately.

If tools, permissions, or external state block automation, look for a narrower executable check, such as a targeted script, component test, or real interaction. State what the substitute proves, which risks it misses, and what is needed to restore automation. Report incomplete work if critical behavior remains unverified. Manual validation is not automated regression protection or TDD.

The handoff includes the Red command and actual failure reason, the Green command and result, regression scope, and unverified items. Evidence must match the final change. Explicitly state when no before-change failure was obtained. Coverage can reveal omissions, but cannot alone prove behavior or completion.
