# ADR format

Use the existing decision directory, or `docs/decisions/` if no convention exists. Increment its numbering without reusing numbers.

```markdown
# <Decision title>

Status: Accepted

<Context, choice, and reason.>

<Trade-offs and conditions for reconsideration.>
```

One or two paragraphs are enough. Add viable alternatives and rejection reasons only when worth retaining, not to fill a template.

## Status and updates

- Use `Proposed` for pending choices and `Accepted` for user-confirmed decisions. Approval does not prove implementation or deployment.
- When a new decision overturns an old one, create a new record. Mark the old record `Superseded by <link>` and link back from the new record.
- Preserve original context and rationale. Label corrections explicitly. Maintain later implementation details in relevant current documentation.

## Inclusion criteria

Could missing rationale cause harmful changes or costly repeated investigation? Prioritize data ownership, integration boundaries, external constraints, major trade-offs, deliberate departures from convention, and non-obvious rejection reasons. An easily reversible decision may still merit a record when external compatibility constrains it.

Do not create a separate ADR for an ordinary choice that code, tests, or existing documentation explain at low cost.
