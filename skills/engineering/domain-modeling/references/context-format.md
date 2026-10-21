# Glossary format

```md
# {Context Name}

{One or two sentences: what this context is and why it exists.}

## Language

**Order**:
{One or two sentences that define the term.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Be opinionated.** Choose the best term for a concept and list alternatives under `_Avoid_`.
- **Keep definitions tight.** Use one or two sentences to say what the concept **is**, not what it does.
- **Include only project-specific concepts.** Exclude generic programming concepts such as timeouts, error types, or tool patterns, even when used frequently.
- Group natural clusters under subheadings. Use a flat list for a single cluster.

## Multiple contexts

Use the existing context index. This root-level `CONTEXT-MAP.md` example must use actual project paths:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments

## Relationships

- **Ordering → Billing**: Ordering emits `OrderPlaced` events; Billing consumes them to generate invoices
```

Find contexts through `CONTEXT-MAP.md` when present. A root `CONTEXT.md` alone indicates a single context. If neither exists, look for the project's glossary. Without a convention, create `docs/glossary.md` when the first term is settled. Reuse the chosen path; template names do not justify a duplicate.
