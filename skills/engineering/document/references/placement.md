# Knowledge placement

Follow the target project's existing names and entry points, including `CONTEXT.md`, `docs/adr/`, and module READMEs. A filename does not determine a document's role. Identify the question it answers and whether it promises to describe the current state.

Without a convention, choose locations as needed:

| Content | Default location | Boundary |
| --- | --- | --- |
| Documentation navigation | `docs/index.md` | Topics, authoritative locations, and reading conditions |
| Project-specific terms | `docs/glossary.md` | Concept definitions and boundaries, not implementation plans |
| System architecture | `docs/architecture.md` | Responsibilities, dependency direction, and cross-module relationships |
| Domain knowledge | `docs/domains/<domain>.md` | Behavior contracts, invariants, interactions, and failure semantics |
| Decision records | `docs/decisions/NNN-<slug>.md` | Context, rationale, trade-offs, and current status |
| Operational knowledge | `docs/runbooks/<operation>.md` | Prerequisites, steps, result checks, and failure recovery |

Small projects can start in the existing README. Split content when it becomes an independent reading topic, not once per delivery.

## Domain documents

Describe current agreements directly in the project's language. Include only sections the reader needs:

```markdown
# <Domain>

## Scope and ownership
## Behavior and invariants
## Interactions and failure modes
## Implementation map
## Decisions and evidence
```

Separate contracts from implementation descriptions and mark known discrepancies. Link implementation entry points, tests, schemas, and ADRs. Do not copy function inventories or entire decisions into the body.

## Investigation results

Prefer integrating verified conclusions that guide future work into the relevant domain document or runbook, retaining conditions and evidence. Use an existing lessons repository or a separate topic page only when the knowledge stands alone, is hard to rediscover, and can prevent recurrence. Test-run records remain evidence of one execution.

## Process records

Proposals, tickets, PRs, and handoffs preserve intent, progress, deviations, and execution evidence. They may link durable knowledge but are not the default entry point for current rules. Preserve historical context in closed records and explicitly label factual corrections.
