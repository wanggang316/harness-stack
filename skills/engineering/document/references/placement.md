# Knowledge placement

Follow the target project's existing names and entry points, including `CONTEXT.md`, `docs/adrs/`, and module READMEs. A filename does not determine a document's role. Identify the question it answers and whether it promises to describe the current state.

Without a convention, choose locations as needed:

| Content | Default location | Boundary |
| --- | --- | --- |
| Documentation navigation | `docs/README.md` | Topics, authoritative locations, and reading conditions |
| Project-specific terms | `docs/glossary.md` | Concept definitions and boundaries, not implementation plans |
| System architecture | `docs/architecture.md` | Responsibilities, dependency direction, and cross-module relationships |
| Domain knowledge | `docs/domains/<domain>.md` | Behavior contracts, invariants, interactions, and failure semantics |
| Decision records | `docs/adrs/NNN-<slug>.md` | Context, rationale, trade-offs, and current status |
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
## Implementation shape
## Related decisions
```

Use the structure to check coverage:

- Identify the topic's responsibility and boundaries; define unfamiliar concepts locally or link the shared glossary.
- State observable behavior and constraints, including permissions, transitions, and failure or recovery semantics where relevant.
- Explain dependencies and change impact. Describe the shape of the implementation: the main parts, the owner of the state, and the direction of data. Do not list files, functions, or tests.
- Link durable decision rationale rather than repeating ADRs. Keep task progress and run-specific verification reports in their delivery records.

A notification page might use trigger, suppression, and unread-clearing sections; an installation page might use identity, ownership, and recovery. Do not add a state diagram to a stateless topic or reject a useful page because its headings differ.

Separate contracts from implementation descriptions. When an existing document and the code disagree, first decide which kind of difference it is:

- **Stale statement**: the code changed on purpose and the document was not updated, or the document contradicts itself. Write what the code does. Do not mark it; report it.
- **Broken rule**: the code does not follow a rule that it is still expected to follow, such as an accepted ADR, an invariant that tests or other code rely on, or a rule whose violation gives a user-visible defect. Write what the code does, mark the difference in place, and report it. Do not change the rule to fit the code.

Most differences in an old document are stale statements. A page with many discrepancy marks usually confuses the two. Accepted future behavior belongs in a decision or spec until implemented; it must not silently replace current behavior. Update current pages with the corresponding code version, without claiming deployment. Keep generated API and configuration references generated, and validate their freshness using the project's existing checks instead of maintaining handwritten copies.

## Level of a topic page

The reader is a person or an agent who is about to change or debug the area and does not know it. The page gives the mental model; the reader then opens the code for details. A page that follows the code function by function is hard to read and goes out of date with each refactor. Make the trade-off on purpose: say less, and make each sentence carry a fact that the reader cannot get quickly from the code.

Write, in roughly this priority:

1. What the topic is and why it exists.
2. Concepts and data model: the entities, their relations, what is saved and where, what is only in memory.
3. Core state and logic: states, transitions, the main flows, the order that matters.
4. Rules and principles: invariants, with the reason when it is short.
5. Boundaries with neighbor topics, as links.
6. Failure and edge behavior, and the traps that are not obvious.
7. The shape of the implementation, in a few lines.

Keep out:

- Lists of files, functions, call sites, or test suites.
- Walk-throughs of one function or one component.
- Constants and thresholds, unless the user sees them or a rule depends on them.
- Full enumerations (each menu item, each field, each case) when a rule or one example says it.
- Type definitions and schemas field by field. Keep the fields that carry a rule.

Code and diagrams:

- Name a type, function, file, or directory only when it is the anchor that lets the reader find the mechanism, or when it is the name of a concept. Prefer the module or directory when that is enough.
- Show a snippet only when its exact form is the contract: a command line shape, a file layout, a key name.
- Use a small text diagram where a structure, a flow, or a state machine is clearer as a picture than as prose. Most pages need zero to two. Do not draw what one sentence says.

A higher level does not lower the bar for accuracy: verify a general sentence against the code as strictly as a detailed one. For a UI entry point, find where the view is placed on screen; a view or handler that exists can still be unmounted.

As a size check, most topic pages fit in 60 to 150 lines, and a large topic in about 200. When a page is longer, cut constants, enumerations, and code walk-throughs before rules.

When you write from an existing proposal-style document, do not translate it section by section. Drop goals, alternatives, risks, test plans, and progress notes. Keep a rejected alternative only as a decision record, and only when the missing reason could cause a harmful change.

## Investigation results

Prefer integrating verified conclusions that guide future work into the relevant domain document or runbook, retaining conditions and evidence. Use an existing lessons repository or a separate topic page only when the knowledge stands alone, is hard to rediscover, and can prevent recurrence. Test-run records remain evidence of one execution.

## Process records

Proposals, tickets, PRs, and handoffs preserve intent, progress, deviations, and execution evidence. They may link durable knowledge but are not the default entry point for current rules. Preserve historical context in closed records and explicitly label factual corrections.
