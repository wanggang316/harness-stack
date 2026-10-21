---
name: domain-modeling
description: Build and sharpen the project domain model by clarifying terms, testing concept boundaries, and recording definitions and decisions as they are confirmed during design discussions.
metadata:
  credits:
    skill: domain-modeling
    author: Matt Pocock
    url: "https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md"
---

# domain-modeling

Actively build the domain model during design: challenge terms, construct boundary scenarios, and record terms and decisions as soon as they are settled. Reading a glossary for vocabulary alone does not require this skill. Use it to **change** the domain model.

## File structure

Use the project's existing glossary, ADR directory, and language. Do not create a parallel knowledge base. Without a convention, use this layout and create only files needed now:

```text
/
├── docs/
│   ├── glossary.md
│   └── decisions/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a context index such as `CONTEXT-MAP.md` exists, use it to locate glossaries and decision directories. Identify the context for the current topic; ask if it cannot be determined.

Link new knowledge files from the existing documentation entry point.

## During the discussion

- **Challenge against the glossary.** Immediately identify conflicting usage: "The glossary defines cancellation as X, but you seem to mean Y. Which is it?"
- **Sharpen fuzzy terms.** Propose a precise canonical term for ambiguous or overloaded words: "Does account mean Customer or User? These are different concepts."
- **Test concrete scenarios.** When discussing relationships, construct edge cases that make concept boundaries explicit.
- **Cross-check code.** Verify claims about behavior against code and surface contradictions.

## Update the glossary

Record a term as soon as it is settled, not at the end of the session. Use [references/context-format.md](references/context-format.md).

Keep only concept definitions in the glossary. Exclude implementation details, specs, and drafts.

## Record ADRs

Propose an ADR when missing context could lead future readers to make apparently reasonable but harmful changes, or to repeat an expensive investigation. Record only confirmed choices, constraints, and real trade-offs. Reversal cost is not the sole criterion.

Put facts without independent decision value in the relevant existing documentation. Do not create an ADR for every discussion. See [references/adr-format.md](references/adr-format.md) for format, status, and supersession rules.
