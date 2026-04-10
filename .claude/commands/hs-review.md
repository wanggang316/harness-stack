Load and execute the hs-review skill for code review and quality.

Read the skill definition at skills/05-review/review/SKILL.md and follow its Process section step by step.

Review code across five axes:
1. **Correctness** — Logic errors, edge cases, error handling
2. **Readability** — Code clarity, naming, structure
3. **Architecture** — Separation of concerns, dependency management
4. **Security** — Input validation, injection risks, auth
5. **Performance** — Algorithmic complexity, queries, caching

Categorize findings as: Critical, Important, Suggestion, Nit, FYI.

For deep security analysis, consult hs-security skill.
For deep performance analysis, consult hs-performance-engineer subagent.
For test coverage concerns, consult hs-test-engineer subagent.
