Load and execute the hs-review skill to conduct a multi-axis code review.

Read the skill definition at `skills/hs-review/SKILL.md` and follow its Process:

1. **Context first** — read the spec / ExecPlan / PR description before opening the diff.
2. **Tests first** — tests reveal intent and coverage.
3. **Walk the diff** — for each file, apply the five axes: Correctness / Readability / Architecture / Security / Performance.
4. **Categorize and cite** — every finding gets a severity label and a `file:line` pointer.
5. **Verify verification** — tests pass, build succeeds, manual / benchmark evidence if applicable.

Severity labels (single source of truth): **Critical / Important / Suggestion / Nit / FYI**. Every finding must cite `file:line` + what + why + fix.

Emit the review using the skill's Output Template: Scope / Strengths / Findings (grouped by severity) / Verification / Verdict + reasoning.

For deep security analysis, consult the `hs-security` skill and `docs/references/security-checklist.md`.
For deep performance analysis, consult `docs/references/performance-checklist.md`.
For test coverage concerns, consult the `test-engineer` subagent (`agents/test-engineer.md`).

**Related skills:**
- `hs-review-request` — if you are the author dispatching a reviewer.
- `hs-review-receive` — if you are the author handling the reviewer's findings.
