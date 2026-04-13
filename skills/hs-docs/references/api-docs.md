# Sub-skill: API Documentation

Document public APIs so consumers (humans and agents) can use them without reading the implementation.

## When to Write

- Adding a new public API endpoint
- Changing an existing API's parameters, response, or behavior
- Publishing a library with public functions
- API consumers are asking how to use it

**Don't write for**: Internal helper functions, private methods, or self-explanatory CRUD.

## Process

1. **Identify the public surface** — What functions, endpoints, or types are exposed?
2. **Document each entry** — Parameters, return types, errors, and one example
3. **Add gotcha comments** — Known traps, ordering requirements, side effects
4. **Save** — Inline with types (preferred for TypeScript) or in OpenAPI spec for REST APIs

## Inline with Types (TypeScript)

```typescript
/**
 * Creates a new task.
 *
 * @param input - Task creation data (title required, description optional)
 * @returns The created task with server-generated ID and timestamps
 * @throws {ValidationError} If title is empty or exceeds 200 characters
 * @throws {AuthenticationError} If the user is not authenticated
 *
 * @example
 * const task = await createTask({ title: 'Buy groceries' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

## OpenAPI / Swagger (REST APIs)

```yaml
paths:
  /api/tasks:
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Validation error
```

## Documenting Gotchas

```typescript
/**
 * IMPORTANT: Must be called before first render.
 * If called after hydration, causes flash of unstyled content
 * because theme context isn't available during SSR.
 *
 * See ADR-003 for design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

## Verification

- [ ] All public functions have parameter and return type documentation
- [ ] Error cases documented with specific error types
- [ ] At least one usage example per function
- [ ] Known gotchas documented inline where they matter
