# Accessibility Checklist

WCAG 2.1 AA 合规的速查表。配合 `frontend-ui-engineering` 技能使用。

## Table of Contents

- [Essential Checks](#essential-checks)
- [Common HTML Patterns](#common-html-patterns)
- [Testing Tools](#testing-tools)
- [Quick Reference: ARIA Live Regions](#quick-reference-aria-live-regions)
- [Common Anti-Patterns](#common-anti-patterns)

## Essential Checks

### Keyboard Navigation
- [ ] 所有交互元素均可通过 Tab 键获得焦点
- [ ] 焦点顺序遵循视觉/逻辑顺序
- [ ] 焦点可见（聚焦元素带 outline/ring）
- [ ] 自定义 widget 支持键盘操作（Enter 激活、Escape 关闭）
- [ ] 没有键盘陷阱（用户总能用 Tab 离开某个组件）
- [ ] 页面顶部有 skip-to-content 链接——（至少）在键盘聚焦时可见
- [ ] 模态框打开时锁住焦点，关闭时归还焦点

### Screen Readers
- [ ] 所有图片都有 `alt` 文本（装饰性图片用 `alt=""`）
- [ ] 所有表单输入都有关联的 label（`<label>` 或 `aria-label`）
- [ ] 按钮和链接有描述性文字（不是「Click here」）
- [ ] 纯图标按钮带 `aria-label`
- [ ] 页面有且仅有一个 `<h1>`，标题不跳级
- [ ] 动态内容变化会被播报（`aria-live` 区域）
- [ ] 表格有带 scope 的 `<th>` 表头

### Visual
- [ ] 文本对比度 ≥ 4.5:1（正文）或 ≥ 3:1（大号文字，18px+）
- [ ] UI 组件与背景的对比度 ≥ 3:1
- [ ] 颜色不是传达信息的唯一方式
- [ ] 文本可放大到 200% 而不破坏布局
- [ ] 没有每秒闪烁超过 3 次的内容

### Forms
- [ ] 每个输入都有可见的 label
- [ ] 必填字段有标示（不只靠颜色）
- [ ] 错误信息具体，并与对应字段关联
- [ ] 错误状态不只靠颜色可辨（图标、文字、边框）
- [ ] 表单提交错误有汇总，且可获得焦点
- [ ] 已知字段使用 autocomplete（例如 `type="email" autocomplete="email"`）

### Content
- [ ] 已声明语言（`<html lang="en">`）
- [ ] 页面有描述性的 `<title>`
- [ ] 链接与周围文字可区分（不只靠颜色）
- [ ] 移动端触控目标 ≥ 44x44px
- [ ] 有意义的 empty 状态（不是空白屏）

## Common HTML Patterns

### Buttons vs. Links

```html
<!-- Use <button> for actions -->
<button onClick={handleDelete}>Delete Task</button>

<!-- Use <a> for navigation -->
<a href="/tasks/123">View Task</a>

<!-- NEVER use div/span as buttons -->
<div onClick={handleDelete}>Delete</div>  <!-- BAD -->
```

### Form Labels

```html
<!-- Explicit label association -->
<label htmlFor="email">Email address</label>
<input id="email" type="email" required />

<!-- Implicit wrapping -->
<label>
  Email address
  <input type="email" required />
</label>

<!-- Hidden label (visible label preferred) -->
<input type="search" aria-label="Search tasks" />
```

### ARIA Roles

```html
<!-- Navigation -->
<nav aria-label="Main navigation">...</nav>
<nav aria-label="Footer links">...</nav>

<!-- Status messages -->
<div role="status" aria-live="polite">Task saved</div>

<!-- Alert messages -->
<div role="alert">Error: Title is required</div>

<!-- Modal dialogs -->
<dialog aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Delete</h2>
  ...
</dialog>

<!-- Loading states -->
<div aria-busy="true" aria-label="Loading tasks">
  <Spinner />
</div>
```

### Accessible Lists

```html
<ul role="list" aria-label="Tasks">
  <li>
    <input type="checkbox" id="task-1" aria-label="Complete: Buy groceries" />
    <label htmlFor="task-1">Buy groceries</label>
  </li>
</ul>
```

## Testing Tools

```bash
# Automated audit
npx axe-core          # Programmatic accessibility testing
npx pa11y             # CLI accessibility checker

# In browser
# Chrome DevTools → Lighthouse → Accessibility
# Chrome DevTools → Elements → Accessibility tree

# Screen reader testing
# macOS: VoiceOver (Cmd + F5)
# Windows: NVDA (free) or JAWS
# Linux: Orca
```

## Quick Reference: ARIA Live Regions

| Value | 行为 | 用于 |
|-------|----------|---------|
| `aria-live="polite"` | 在下一个停顿时播报 | 状态更新、保存确认 |
| `aria-live="assertive"` | 立即播报 | 错误、时效敏感的提醒 |
| `role="status"` | 同 `polite` | 状态消息 |
| `role="alert"` | 同 `assertive` | 错误消息 |

## Common Anti-Patterns

| Anti-Pattern | 问题 | 修法 |
|---|---|---|
| 用 `div` 当按钮 | 无法获得焦点、不支持键盘 | 用 `<button>` |
| 缺少 `alt` 文本 | 图片对 screen reader 不可见 | 加上描述性的 `alt` |
| 仅靠颜色的状态 | 对色盲用户不可见 | 加图标、文字或图案 |
| 自动播放的媒体 | 令人困惑、无法停止 | 加控件，不要自动播放 |
| 没有 ARIA 的自定义下拉 | 键盘/screen reader 无法使用 | 用原生 `<select>` 或规范的 ARIA listbox |
| 移除焦点 outline | 用户看不到自己在哪里 | 给 outline 加样式，不要移除它 |
| 空的链接/按钮 | 播报出「Link」却没有描述 | 加文字或 `aria-label` |
| `tabindex > 0` | 破坏自然的 tab 顺序 | 只用 `tabindex="0"` 或 `-1` |
