# DESIGN.md Template

基于 Google Stitch 的 [Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/)。一份 AI agent 读取后用于生成一致 UI 的纯文本 design system 文档。

## What is DESIGN.md?

DESIGN.md 是放在你项目里的一个 markdown 文件，定义你的 UI 该长什么样、有什么感觉。AI 编码 agent 读取它来生成一致、贴合品牌的界面。无需 Figma 导出，无需 JSON schema——就是 markdown。

| File | 谁读它 | 它定义什么 |
|------|-------------|-----------------|
| `AGENTS.md` | Coding agents | 如何构建项目 |
| `DESIGN.md` | Design agents | 项目该长什么样、有什么感觉 |

## Template

以下是一份完整的 DESIGN.md 模板，含全部 9 个小节。依据你项目的 design system 填好每一节。不适用的小节删掉——但多数项目 9 节都需要。

---

```markdown
# Design System: [Project Name]

## 1. Visual Theme & Atmosphere

<!-- 用 2-3 段描述整体视觉印象。涵盖：
     - 主要基调/氛围（dark-mode-first？轻盈通透？大胆有活力？）
     - 设计理念（minimalism？brutalism？material design？editorial？）
     - 信息密度取向（spacious？dense？balanced？）
     - 整体色温（cool？warm？neutral？）
-->

**Key Characteristics:**
- Theme mode: [dark-mode-first / light-mode-first / dual-mode]
- Primary font: [font family] with [variants/features]
- Design density: [spacious / balanced / compact]
- Brand personality: [2-3 adjectives describing the visual identity]
- Signature elements: [unique visual traits that define the brand]

## 2. Color Palette & Roles

### Background Surfaces
- **Page Background** (`#hex`): [description and usage context]
- **Surface** (`#hex`): [description — cards, panels, elevated areas]
- **Elevated Surface** (`#hex`): [description — dropdowns, popovers]

### Text & Content
- **Primary Text** (`#hex`): [main text color and why this value]
- **Secondary Text** (`#hex`): [body text, descriptions]
- **Muted Text** (`#hex`): [placeholders, metadata, timestamps]

### Brand & Accent
- **Primary Accent** (`#hex`): [main brand color — CTAs, links, active states]
- **Secondary Accent** (`#hex`): [supporting accent if applicable]
- **Hover/Active** (`#hex`): [interaction state colors]

### Status Colors
- **Success** (`#hex`): [positive states, confirmations]
- **Warning** (`#hex`): [caution states]
- **Error** (`#hex`): [error states, destructive actions]
- **Info** (`#hex`): [informational states]

### Border & Divider
- **Border Default** (`#hex` or `rgba()`): [standard borders]
- **Border Subtle** (`rgba()`): [light separations]
- **Divider** (`#hex`): [section dividers]

### Overlay
- **Overlay** (`rgba()`): [modal backdrop, focus isolation]

## 3. Typography Rules

### Font Family
- **Primary**: [font family with fallback stack]
- **Monospace**: [monospace font with fallback stack]
- **Display** (if different): [display font if applicable]

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display XL | [font] | [size] | [weight] | [lh] | [ls] | Hero headlines |
| Display | [font] | [size] | [weight] | [lh] | [ls] | Section headlines |
| Heading 1 | [font] | [size] | [weight] | [lh] | [ls] | Page titles |
| Heading 2 | [font] | [size] | [weight] | [lh] | [ls] | Section titles |
| Heading 3 | [font] | [size] | [weight] | [lh] | [ls] | Sub-section titles |
| Body Large | [font] | [size] | [weight] | [lh] | [ls] | Lead paragraphs |
| Body | [font] | [size] | [weight] | [lh] | [ls] | Standard reading text |
| Small | [font] | [size] | [weight] | [lh] | [ls] | Secondary text |
| Caption | [font] | [size] | [weight] | [lh] | [ls] | Metadata, labels |
| Code | [mono font] | [size] | [weight] | [lh] | [ls] | Code blocks |

### Principles
- [Key typography principle 1 — e.g., weight usage strategy]
- [Key typography principle 2 — e.g., letter-spacing behavior at scale]
- [Key typography principle 3 — e.g., OpenType feature usage]

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: [color]
- Text: [color]
- Padding: [values]
- Radius: [value]
- Hover: [state changes]
- Use: [when to use]

**Secondary Button**
- Background: [color]
- Text: [color]
- Padding: [values]
- Radius: [value]
- Border: [if applicable]
- Use: [when to use]

**Ghost Button**
- Background: [color/transparent]
- Text: [color]
- Border: [value]
- Use: [when to use]

### Cards & Containers
- Background: [color]
- Border: [value]
- Radius: [value]
- Shadow: [value]
- Hover: [state changes]

### Inputs & Forms
- Background: [color]
- Text: [color]
- Border: [value]
- Padding: [values]
- Radius: [value]
- Focus: [state changes]
- Placeholder: [color]

### Badges & Pills
- [Badge variant descriptions with colors, radius, padding]

### Navigation
- [Nav bar style, link typography, active states, mobile behavior]

## 5. Layout Principles

### Spacing System
- Base unit: [value, e.g., 8px]
- Scale: [spacing scale values]
- Primary rhythm: [main spacing values used]

### Grid & Container
- Max content width: [value]
- Column system: [grid description]
- Gutter width: [value]

### Whitespace Philosophy
- [How whitespace is used to create hierarchy and breathing room]
- [Section spacing approach]
- [Content density strategy]

### Border Radius Scale
- Small: [value] — [usage: inputs, badges]
- Medium: [value] — [usage: buttons, cards]
- Large: [value] — [usage: panels, modals]
- Full: [value] — [usage: pills, avatars]

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Level 0 | [flat treatment] | Page background |
| Level 1 | [subtle shadow/border] | Cards, containers |
| Level 2 | [medium shadow] | Dropdowns, popovers |
| Level 3 | [strong shadow] | Modals, dialogs |
| Level 4 | [strongest shadow] | Overlays, toasts |

**Shadow Philosophy**: [How depth is communicated — through shadows, borders, background luminance, or combination]

## 7. Do's and Don'ts

### Do
- [Correct usage pattern 1]
- [Correct usage pattern 2]
- [Correct usage pattern 3]
- [Correct usage pattern 4]
- [Correct usage pattern 5]

### Don't
- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]
- [Anti-pattern 4]
- [Anti-pattern 5]

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | [layout changes] |
| Tablet | 640–1024px | [layout changes] |
| Desktop | 1024–1280px | [layout changes] |
| Large Desktop | >1280px | [layout changes] |

### Touch Targets
- [Minimum touch target size]
- [Button/link padding for touch]

### Collapsing Strategy
- [How navigation collapses]
- [How grids reflow]
- [How typography scales down]
- [How spacing reduces]

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: [name] (`#hex`)
- Page Background: [name] (`#hex`)
- Surface: [name] (`#hex`)
- Heading text: [name] (`#hex`)
- Body text: [name] (`#hex`)
- Muted text: [name] (`#hex`)
- Accent: [name] (`#hex`)
- Border: [value]

### Example Component Prompts
- "[Prompt for generating a hero section in this design system]"
- "[Prompt for generating a card component]"
- "[Prompt for generating a form]"
- "[Prompt for generating navigation]"

### Iteration Guide
1. [Key rule AI agents must always follow]
2. [Typography constraint]
3. [Color usage constraint]
4. [Spacing/layout constraint]
5. [Brand-specific constraint]
```

## Section Purposes

| # | Section | 它捕获什么 | 是否必需？ |
|---|---------|-----------------|-----------|
| 1 | Visual Theme & Atmosphere | 基调、密度、设计理念 | 是 |
| 2 | Color Palette & Roles | 语义名 + hex + 功能性角色 | 是 |
| 3 | Typography Rules | 字体族、完整的层级表 | 是 |
| 4 | Component Stylings | 按钮、卡片、输入、导航及其状态 | 是 |
| 5 | Layout Principles | spacing scale、grid、留白理念 | 是 |
| 6 | Depth & Elevation | 阴影体系、surface 层级 | 推荐 |
| 7 | Do's and Don'ts | 设计护栏与 anti-pattern | 是 |
| 8 | Responsive Behavior | 断点、触控目标、折叠策略 | 推荐 |
| 9 | Agent Prompt Guide | 颜色速查、即用 prompt | 是 |

## Writing Principles

1. **要具体**：使用确切的 hex 值、像素尺寸与字重——而非「dark blue」或「large text」
2. **语义化命名**：每种颜色都有角色名与功能性描述，而不只是一个 hex 值
3. **agent 可读**：为 LLM 而写——结构化表格、清晰层级、显式取值
4. **状态很重要**：每个交互组件都需要 hover、active、focus 与 disabled 状态
5. **纳入 anti-pattern**：Don'ts 小节防止 AI 犯常见错误
6. **prompt 即用**：第 9 节给 agent 提供可直接复制粘贴、用于生成组件的 prompt
