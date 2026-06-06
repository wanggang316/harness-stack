---
name: define-frontend-spec
description: 在全局层面定义 frontend 工程约定与质量标准。在启动新 frontend 项目、frontend-spec.md 缺失或过时、或需要确立组件模式、accessibility 标准或 performance budget 时使用。产出 docs/frontend-spec.md，作为 frontend 工程规则的唯一事实来源。
---

# define-frontend-spec：Frontend Specification

## Overview

在全局层面定义 frontend 工程约定与质量标准。`docs/frontend-spec.md` 是关于「frontend 代码如何写」的权威文档——它覆盖组件 architecture 模式、状态管理规则、accessibility 标准、performance budget、样式约定、响应式设计约束、以及 error/loading/empty 状态的处理。读这份文件的 agent 或工程师，应当不必通读每个组件就知道如何写出与项目其余部分一致的 frontend 代码。

这不是一份技术栈文档——技术选型归 `docs/architecture.md`。这也不是 visual design system——那是 `docs/ui-design.md`。本文档为所有 frontend 代码定义工程模式与质量闸门。

## When to Use

- 启动一个带 frontend 的新项目
- 一个有 UI 代码的项目缺少 `docs/frontend-spec.md`
- 跨代码库的组件模式、状态管理或样式约定不一致
- 需要确立 accessibility 或 performance 标准
- agent 生成的 frontend 代码看起来不一致、用了错误的模式、或忽略了项目约定

## Component Architecture

### File Structure

把与一个组件相关的一切就近放在一起：

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

**优先用组合，而非配置：**

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

**让组件保持专注：**

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

**把数据获取与展示分离：**

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

选择行得通的最简方案：

```
Local state (useState)           → Component-specific UI state
Lifted state                     → Shared between 2-3 sibling components
Context                          → Theme, auth, locale (read-heavy, write-rare)
URL state (searchParams)         → Filters, pagination, shareable UI state
Server state (React Query, SWR)  → Remote data with caching
Global store (Zustand, Redux)    → Complex client state shared app-wide
```

避免超过 3 层的 prop drilling。如果你在把 props 穿过那些根本不用它们的组件，就引入 context 或重构组件树。

## Design System Adherence

如果项目有 UI design 文档（如 `docs/ui-design.md` 或 `DESIGN.md`），设计细节（color palette、typography token、spacing scale 等）参照它。本文档聚焦于 frontend 工程约定；UI design 文档定义视觉上的具体取值。

### Avoid the AI Aesthetic

AI 生成的 UI 有一些一眼可辨的套路。全都要避开：

| AI Default | 为什么它是问题 | Production Quality |
|---|---|---|
| Purple/indigo everything | 模型默认偏向视觉上「安全」的配色，结果每个 app 都长得一样 | 使用项目实际的 color palette |
| Excessive gradients | 渐变制造视觉噪声，与多数 design system 冲突 | 用扁平或与 design system 匹配的细微渐变 |
| Rounded everything (rounded-2xl) | 最大圆角传递「友好」感，却忽视了真实设计中圆角半径的层级 | 用 design system 里一致的 border-radius |
| Generic hero sections | 模板驱动的布局，与实际内容或用户需求毫无关联 | content-first 的布局 |
| Lorem ipsum-style copy | 占位文本会掩盖真实内容才会暴露的布局问题（长度、换行、溢出） | 贴近真实的占位内容 |
| Oversized padding everywhere | 处处等量的慷慨内边距摧毁视觉层级、浪费屏幕空间 | 一致的 spacing scale |
| Stock card grids | 千篇一律的网格是一种忽视信息优先级与扫视模式的布局偷懒 | 目的驱动的布局 |
| Shadow-heavy design | 层叠阴影添加的深度会与内容争夺注意力，并拖慢低端设备的渲染 | 除非 design system 明确规定，否则用细微阴影或不用阴影 |

### Spacing and Layout

使用一致的 spacing scale。不要自己编值：

```css
/* Use the scale: 0.25rem increments (or whatever the project uses) */
/* Good */  padding: 1rem;      /* 16px */
/* Good */  gap: 0.75rem;       /* 12px */
/* Bad */   padding: 13px;      /* Not on any scale */
/* Bad */   margin-top: 2.3rem; /* Not on any scale */
```

### Typography

尊重排版层级：

```
h1 → Page title (one per page)
h2 → Section title
h3 → Subsection title
body → Default text
small → Secondary/helper text
```

不要跳级使用标题。不要把标题样式用在非标题内容上。

### Color

- 使用语义化的 color token：`text-primary`、`bg-surface`、`border-default`——而非裸 hex 值
- 确保足够的对比度（正文 4.5:1，大号文字 3:1）
- 不要只靠颜色传达信息（也用图标、文字或图案）

## Accessibility (WCAG 2.1 AA)

每个组件都必须满足这些标准：

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

完整的 accessibility checklist 见 `docs/references/accessibility-checklist.md`。

## Responsive Design

mobile first，然后向上扩展：

```tsx
// Tailwind: mobile-first responsive
<div className="
  grid grid-cols-1      /* Mobile: single column */
  sm:grid-cols-2        /* Small: 2 columns */
  lg:grid-cols-3        /* Large: 3 columns */
  gap-4
">
```

在这些断点测试：320px、768px、1024px、1440px。

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

没有数字，就没有 budget：

| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse / Web Vitals |
| First Input Delay (FID) | < 100ms | Lighthouse / Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse / Web Vitals |

- 不用未优化的图片——使用框架的 image 组件或等价物
- 对首屏以下的内容做 lazy load
- 按路由做 code-split
- 关键路径中不放阻塞性的第三方脚本

## Process

创建 `docs/frontend-spec.md` 时：

1. **加载上下文**——读 `docs/product-spec.md`、`docs/architecture.md`、`docs/ui-design.md`，并扫描现有 frontend 代码，弄清已经确立了什么
2. **找出缺口**——上面这些模式里，当前项目缺了哪些、哪些不一致？accessibility 标准、performance budget 或状态管理规则定义了没有？
3. **写 spec**——产出 `docs/frontend-spec.md`，覆盖上述各小节，并贴合项目具体的技术栈与约束。若 `docs/references/accessibility-checklist.md` 不存在，把 `references/accessibility-checklist.md` 复制过去
4. **批准**——呈交人工评审

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

| 借口 | 现实 |
|---|---|
| 「模式边做边定就行。」 | 没有显式的模式，每个开发者（和 agent）都会发明自己的一套。一个项目里最后会出现 4 种状态管理方案、3 种样式约定。 |
| 「accessibility 是锦上添花。」 | 在许多司法辖区它是法律要求，也是工程质量标准。 |
| 「响应式以后再做。」 | 事后补响应式比一开始就做难 3 倍。 |
| 「performance budget 为时过早。」 | 没有 budget，bundle 体积会悄无声息地膨胀。等有人注意到时，修起来已是跨多个 sprint 的工程。 |
| 「框架会处理这一切。」 | 框架提供工具，不提供约定。两个团队用同一个框架，没有共享标准就会写出完全不同的代码。 |
| 「AI 美学暂时没问题。」 | 它传递的是低质量信号。从一开始就用项目实际的 design system。 |

## Red Flags

- 超过 200 行的组件（拆开它们）
- 内联样式或随手写的像素值
- 缺少 error 状态、loading 状态或 empty 状态
- 没做键盘导航测试
- 颜色作为状态的唯一指示（红/绿却无文字或图标）
- 千篇一律的「AI 观感」（紫色渐变、超大卡片、套版布局）
- 多种状态管理方案，却没有清晰的「何时用哪种」规则
- performance budget 没有数字（「应该挺快」）
- 样式约定混搭多种做法（这里 Tailwind、那里 CSS modules、别处内联样式）

## Verification

创建 `docs/frontend-spec.md` 之后：

- [ ] 组件 architecture 已定义，含 file structure 与模式
- [ ] 状态管理规则已定义为查找表（use case → approach）
- [ ] design system 遵循规则已定义（要避开的 anti-pattern）
- [ ] accessibility 标准已定义（WCAG 2.1 AA）
- [ ] 项目中存在 `docs/references/accessibility-checklist.md`
- [ ] 响应式设计断点已定义
- [ ] loading、error 与 empty 状态的模式已定义
- [ ] performance budget 已定义，并附可度量的目标
- [ ] 所有交互元素均可键盘访问（用 Tab 走一遍页面）
- [ ] screen reader 能传达页面的内容与结构
- [ ] 遵循项目的 design system（spacing、colors、typography）
- [ ] dev tools 或 axe-core 中没有 accessibility 警告
- [ ] 人工已评审并批准
- [ ] 已保存到 `docs/frontend-spec.md`
