# DESIGN.md Template

Based on the [Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/) by Google Stitch. A plain-text design system document that AI agents read to generate consistent UI.

## What is DESIGN.md?

DESIGN.md is a markdown file placed in your project that defines how your UI should look and feel. AI coding agents read this file to generate consistent, on-brand interfaces. No Figma exports, no JSON schemas — just markdown.

| File | Who reads it | What it defines |
|------|-------------|-----------------|
| `AGENTS.md` | Coding agents | How to build the project |
| `DESIGN.md` | Design agents | How the project should look and feel |

## Template

The following is a complete DESIGN.md template with all 9 sections. Fill in each section based on your project's design system. Delete sections that don't apply — but most projects need all 9.

---

```markdown
# Design System: [Project Name]

## 1. Visual Theme & Atmosphere

<!-- Describe the overall visual impression in 2-3 paragraphs. Cover:
     - Primary mood/atmosphere (dark-mode-first? light and airy? bold and energetic?)
     - Design philosophy (minimalism? brutalism? material design? editorial?)
     - Information density approach (spacious? dense? balanced?)
     - Overall color temperature (cool? warm? neutral?)
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

| # | Section | What it captures | Required? |
|---|---------|-----------------|-----------|
| 1 | Visual Theme & Atmosphere | Mood, density, design philosophy | Yes |
| 2 | Color Palette & Roles | Semantic name + hex + functional role | Yes |
| 3 | Typography Rules | Font families, full hierarchy table | Yes |
| 4 | Component Stylings | Buttons, cards, inputs, navigation with states | Yes |
| 5 | Layout Principles | Spacing scale, grid, whitespace philosophy | Yes |
| 6 | Depth & Elevation | Shadow system, surface hierarchy | Recommended |
| 7 | Do's and Don'ts | Design guardrails and anti-patterns | Yes |
| 8 | Responsive Behavior | Breakpoints, touch targets, collapsing strategy | Recommended |
| 9 | Agent Prompt Guide | Quick color reference, ready-to-use prompts | Yes |

## Writing Principles

1. **Be specific**: Use exact hex values, pixel sizes, and font weights — not "dark blue" or "large text"
2. **Semantic naming**: Every color has a role name and a functional description, not just a hex value
3. **Agent-readable**: Write for LLMs — structured tables, clear hierarchies, explicit values
4. **States matter**: Every interactive component needs hover, active, focus, and disabled states
5. **Include anti-patterns**: The Don'ts section prevents AI from making common mistakes
6. **Prompt-ready**: Section 9 gives agents copy-paste-ready prompts for generating components
