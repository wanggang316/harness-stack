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

## Topic boundaries and structure

A domain can be a business area, a technical subsystem, or a stable capability; it need not be a domain-driven design boundary. Existing `components/`, `subsystems/`, or package READMEs may already own this knowledge. Do not create a parallel `docs/domains/` copy.

Be strict about scope, current claims, ownership, and discoverability; adapt headings and order to the subject. Each fact has one primary maintenance location. A parent page explains relationships and links to the owner of detailed contracts. Separate substantial tutorials from reference content so readers can look up behavior without following a lesson.

For a new topic page, start with the following structure, then rename, combine, or omit sections as needed. It is a writing aid, not a required schema:

```markdown
# <Domain>

## Scope and ownership
## Behavior and invariants
## Interactions and failure modes
## Implementation map
## Related decisions
```

Use the structure to check coverage:

- Identify the topic's responsibility and boundaries; define unfamiliar concepts locally or link the shared glossary.
- State observable behavior and constraints, including permissions, transitions, and failure or recovery semantics where relevant.
- Explain dependencies and change impact; link a few verified code, test, or schema entry points when they help future edits.
- Link durable decision rationale rather than repeating ADRs. Keep task progress and run-specific verification reports in their delivery records.

A notification page might use trigger, suppression, and unread-clearing sections; an installation page might use identity, ownership, and recovery. Do not add a state diagram to a stateless topic or reject a useful page because its headings differ.

Separate contracts from implementation descriptions and mark known discrepancies. Accepted future behavior belongs in a decision or spec until implemented; it must not silently replace current behavior. Update current pages with the corresponding code version, without claiming deployment. Keep generated API and configuration references generated, and validate their freshness using the project's existing checks instead of maintaining handwritten copies.

## Investigation results

Prefer integrating verified conclusions that guide future work into the relevant domain document or runbook, retaining conditions and evidence. Use an existing lessons repository or a separate topic page only when the knowledge stands alone, is hard to rediscover, and can prevent recurrence. Test-run records remain evidence of one execution.

## Process records

Proposals, tickets, PRs, and handoffs preserve intent, progress, deviations, and execution evidence. They may link durable knowledge but are not the default entry point for current rules. Preserve historical context in closed records and explicitly label factual corrections.
