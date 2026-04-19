Load and execute the hs-review skill for code review and quality.

Read the skill definition at `skills/hs-review/SKILL.md` and pick the mode that matches the current situation:

- **Mode 1 — Request Review**: you are the author and want a fresh-context reviewer. Pin the diff range, dispatch the `code-reviewer` subagent with the brief template, and wait for the structured report.
- **Mode 2 — Conduct Review**: you are reviewing a change. Apply the five-axis walkthrough (Correctness / Readability / Architecture / Security / Performance) and emit the report using the skill's Output Template.
- **Mode 3 — Receive Review**: you are the author and just got feedback. Follow the Response Pattern — read, restate, verify, decide, apply — with no performative agreement.

Severity labels (single source of truth): **Critical / Important / Suggestion / Nit / FYI**. Every finding must cite `file:line` + what + why.

For deep security analysis, consult the `hs-security` skill and `docs/references/security-checklist.md`.
For deep performance analysis, consult `docs/references/performance-checklist.md`.
For test coverage concerns, consult the `test-engineer` subagent (`agents/test-engineer.md`).
