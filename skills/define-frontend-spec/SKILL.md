---
name: define-frontend-spec
description: Defines frontend engineering conventions and quality standards at the global level. Use when starting a new frontend project, when frontend-spec.md is missing or outdated, or when component patterns, accessibility standards, or performance budgets need to be established. Produces docs/frontend-spec.md as the single source of truth for frontend engineering rules.
---

# define-frontend-spec: Frontend Specification

## Overview

Define frontend engineering conventions and quality standards at the global level. `docs/frontend-spec.md` is the authoritative document for how frontend code is written — it covers component architecture patterns, state management rules, accessibility standards, performance budgets, styling conventions, responsive design constraints, and error/loading/empty state handling. An agent or engineer reading this file should know how to write frontend code that is consistent with the rest of the project without reading every component.

This is not a tech stack document — technology choices belong in `docs/architecture.md`. This is not a visual design system — that's `docs/ui-design.md`. This document defines the engineering patterns and quality gates for all frontend code.

## When to Use

- Starting a new project with a frontend
- `docs/frontend-spec.md` is missing in a project with UI code
- Component patterns, state management, or styling conventions are inconsistent across the codebase
- Accessibility or performance standards need to be established
- Agents generate frontend code that looks inconsistent, uses wrong patterns, or ignores project conventions

## Component Architecture

### File Structure

Colocate everything related to a component:

```
src/components/
  TaskList/
    TaskList.tsx          # Component implementation
    TaskList.test.tsx     # Tests
    TaskList.stories.tsx  # Storybook stories (if using)
    use-task-list.ts      # Custom hook (if complex state)
    types.ts              # Component-specific types (if needed)
```

### Component Patterns

**Prefer composition over configuration:**

```tsx
// Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Tasks</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>

// Avoid: Over-configured
<Card
  title="Tasks"
  headerVariant="large"
  bodyPadding="md"
  content={<TaskList tasks={tasks} />}
/>
```

**Keep components focused:**

```tsx
// Good: Does one thing
export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} />
      <span className={task.done ? 'line-through text-muted' : ''}>{task.title}</span>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
        <TrashIcon />
      </Button>
    </li>
  );
}
```

**Separate data fetching from presentation:**

```tsx
// Container: handles data
export function TaskListContainer() {
  const { tasks, isLoading, error } = useTasks();

  if (isLoading) return <TaskListSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" retry={refetch} />;
  if (tasks.length === 0) return <EmptyState message="No tasks yet" />;

  return <TaskList tasks={tasks} />;
}

// Presentation: handles rendering
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </ul>
  );
}
```

## State Management

Choose the simplest approach that works:

```
Local state (useState)           → Component-specific UI state
Lifted state                     → Shared between 2-3 sibling components
Context                          → Theme, auth, locale (read-heavy, write-rare)
URL state (searchParams)         → Filters, pagination, shareable UI state
Server state (React Query, SWR)  → Remote data with caching
Global store (Zustand, Redux)    → Complex client state shared app-wide
```

Avoid prop drilling deeper than 3 levels. If you're passing props through components that don't use them, introduce context or restructure the component tree.

## Design System Adherence

If the project has a UI design document such as `docs/ui-design.md` or `DESIGN.md`, refer to it for design details (color palettes, typography tokens, spacing scales, etc.). This document focuses on frontend engineering conventions; the UI design document defines the visual specifics.

### Avoid the AI Aesthetic

AI-generated UI has recognizable patterns. Avoid all of them:

| AI Default | Why It Is a Problem | Production Quality |
|---|---|---|
| Purple/indigo everything | Models default to visually "safe" palettes, making every app look identical | Use the project's actual color palette |
| Excessive gradients | Gradients add visual noise and clash with most design systems | Flat or subtle gradients matching the design system |
| Rounded everything (rounded-2xl) | Maximum rounding signals "friendly" but ignores the hierarchy of corner radii in real designs | Consistent border-radius from the design system |
| Generic hero sections | Template-driven layout with no connection to the actual content or user need | Content-first layouts |
| Lorem ipsum-style copy | Placeholder text hides layout problems that real content reveals (length, wrapping, overflow) | Realistic placeholder content |
| Oversized padding everywhere | Equal generous padding destroys visual hierarchy and wastes screen space | Consistent spacing scale |
| Stock card grids | Uniform grids are a layout shortcut that ignores information priority and scanning patterns | Purpose-driven layouts |
| Shadow-heavy design | Layered shadows add depth that competes with content and slows rendering on low-end devices | Subtle or no shadows unless the design system specifies |

### Spacing and Layout

Use a consistent spacing scale. Don't invent values:

```css
/* Use the scale: 0.25rem increments (or whatever the project uses) */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* Not on any scale */
/* Bad */   margin-top: 2.3rem; /* Not on any scale */
```

### Typography

Respect the type hierarchy:

```
h1 → Page title (one per page)
h2 → Section title
h3 → Subsection title
body → Default text
small → Secondary/helper text
```

Don't skip heading levels. Don't use heading styles for non-heading content.

### Color

- Use semantic color tokens: `text-primary`, `bg-surface`, `border-default` — not raw hex values
- Ensure sufficient contrast (4.5:1 for normal text, 3:1 for large text)
- Don't rely solely on color to convey information (use icons, text, or patterns too)

## Accessibility (WCAG 2.1 AA)

Every component must meet these standards:

### Keyboard Navigation

```tsx
// Every interactive element must be keyboard accessible
<button onClick={handleClick}>Click me</button>        // ✓ Focusable by default
<div onClick={handleClick}>Click me</div>               // ✗ Not focusable
<div role="button" tabIndex={0} onClick={handleClick}    // ✓ But prefer <button>
     onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick()}>
  Click me
</div>
```

### ARIA Labels

```tsx
// Label interactive elements that lack visible text
<button aria-label="Close dialog"><XIcon /></button>

// Label form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or use aria-label when no visible label exists
<input aria-label="Search tasks" type="search" />
```

### Focus Management

```tsx
// Move focus when content changes
function Dialog({ isOpen, onClose }: DialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Trap focus inside dialog when open
  return (
    <dialog open={isOpen}>
      <button ref={closeRef} onClick={onClose}>Close</button>
      {/* dialog content */}
    </dialog>
  );
}
```

### Meaningful Empty and Error States

```tsx
// Don't show blank screens
function TaskList({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div role="status" className="text-center py-12">
        <TasksEmptyIcon className="mx-auto h-12 w-12 text-muted" />
        <h3 className="mt-2 text-sm font-medium">No tasks</h3>
        <p className="mt-1 text-sm text-muted">Get started by creating a new task.</p>
        <Button className="mt-4" onClick={onCreateTask}>Create Task</Button>
      </div>
    );
  }

  return <ul role="list">...</ul>;
}
```

For the full accessibility checklist, see `docs/references/accessibility-checklist.md`.

## Responsive Design

Design for mobile first, then expand:

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

Test at these breakpoints: 320px, 768px, 1024px, 1440px.

## Loading and Transitions

```tsx
// Skeleton loading (not spinners for content)
function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

// Optimistic updates for perceived speed
function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old: Task[]) =>
        old.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
      );

      return { previous };
    },
    onError: (_err, _taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previous);
    },
  });
}
```

## Performance Budgets

If there's no number, there's no budget:

| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse / Web Vitals |
| First Input Delay (FID) | < 100ms | Lighthouse / Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse / Web Vitals |

- No unoptimized images — use framework image component or equivalent
- Lazy load below-the-fold content
- Code-split routes
- No blocking third-party scripts in the critical path

## Process

When creating `docs/frontend-spec.md`:

1. **Load context** — read `docs/product-spec.md`, `docs/architecture.md`, `docs/ui-design.md`, and scan existing frontend code to understand what's already established
2. **Identify gaps** — which of the patterns above are missing or inconsistent in the current project? Are accessibility standards, performance budgets, or state management rules defined?
3. **Write the spec** — produce `docs/frontend-spec.md` covering each section above, tailored to the project's specific stack and constraints. Copy `references/accessibility-checklist.md` to `docs/references/accessibility-checklist.md` if it doesn't exist
4. **Approve** — present for human review

```
FRONTEND SPEC READY FOR REVIEW:
- Component patterns: [summary]
- State management: [count] rules
- Accessibility: WCAG 2.1 AA with checklist at docs/references/
- Performance budgets: [count] metrics defined
- Responsive breakpoints: [count]
→ Approve, or tell me what to change.
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll figure out patterns as we go" | Without explicit patterns, every developer (and agent) invents their own. You end up with 4 state management approaches and 3 styling conventions in one project. |
| "Accessibility is a nice-to-have" | It's a legal requirement in many jurisdictions and an engineering quality standard. |
| "We'll make it responsive later" | Retrofitting responsive design is 3x harder than building it from the start. |
| "Performance budgets are premature" | Without budgets, bundle size creeps up invisibly. By the time someone notices, it's a multi-sprint project to fix. |
| "The framework handles all this" | Frameworks provide tools, not conventions. Two teams using the same framework will write completely different code without shared standards. |
| "The AI aesthetic is fine for now" | It signals low quality. Use the project's actual design system from the start. |

## Red Flags

- Components with more than 200 lines (split them)
- Inline styles or arbitrary pixel values
- Missing error states, loading states, or empty states
- No keyboard navigation testing
- Color as the sole indicator of state (red/green without text or icons)
- Generic "AI look" (purple gradients, oversized cards, stock layouts)
- Multiple state management approaches without clear rules for when to use each
- Performance budgets without numbers ("should be fast")
- Styling conventions that mix approaches (Tailwind here, CSS modules there, inline styles elsewhere)

## Verification

After creating `docs/frontend-spec.md`:

- [ ] Component architecture defined with file structure and patterns
- [ ] State management rules defined as a lookup table (use case → approach)
- [ ] Design system adherence rules defined (anti-patterns to avoid)
- [ ] Accessibility standards defined (WCAG 2.1 AA)
- [ ] `docs/references/accessibility-checklist.md` exists in the project
- [ ] Responsive design breakpoints defined
- [ ] Loading, error, and empty state patterns defined
- [ ] Performance budgets defined with measurable targets
- [ ] All interactive elements are keyboard accessible (Tab through the page)
- [ ] Screen reader can convey the page's content and structure
- [ ] Follows the project's design system (spacing, colors, typography)
- [ ] No accessibility warnings in dev tools or axe-core
- [ ] Human has reviewed and approved
- [ ] Saved to `docs/frontend-spec.md`
