# Documentation

This directory is the **system of record** for all project knowledge. If it's not here, it doesn't exist to the agent.

## Structure

| Directory / File | Purpose |
|---|---|
| [architecture.md](architecture.md) | System architecture, domains, layers |
| [golden-rules.md](golden-rules.md) | Enforced principles and conventions |
| [design-docs/](design-docs/) | Technical design documents (human-authored) |
| user-test-patterns.md | Project-wide testing conventions (tooling, cost tiers, personas) |
| [references/](references/) | External references, API docs, integration notes |
| [generated/](generated/) | Auto-generated artifacts — do not edit manually |

Per-plan feature-driven-development state (plan, validation contract, features) lives in
the gitignored `.harness-runtime/plans/<slug>/` tree — not in `docs/`. The Library holds
durable conventions and memory; code is the source of truth for specific implementation.

## Conventions

- Every document should be self-contained enough for an agent to act on it
- Use relative links between documents
- Keep documents focused: one concept per file
- Mark documents as deprecated rather than deleting them
