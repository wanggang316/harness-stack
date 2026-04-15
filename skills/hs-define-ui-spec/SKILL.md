---
name: hs-define-ui-spec
description: Initializes or modifies project UI design style via DESIGN.md. Use when starting a new project that needs a visual design system, when adopting a pre-built design style (e.g., Linear, Vercel, Stripe), or when customizing UI design tokens from scratch.
---

# hs-define-ui-spec: UI Design System

## Overview

Initialize or modify your project's UI design style by creating a `docs/ui-design.md` file. This file follows the [DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/overview/) — a plain-text design system that AI agents read to generate consistent, on-brand UI. Users can adopt a pre-built style from [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) or create a custom design system from a template.

## When to Use

**Use when**:
- Starting a new project that needs a defined UI design style
- Adopting a known brand's design language (Linear, Vercel, Stripe, etc.)
- The project has no `docs/ui-design.md` and AI-generated UI looks generic or inconsistent
- Switching or updating the project's visual design direction
- You want AI agents to generate on-brand components consistently

**Don't use when**:
- The project already has a `docs/ui-design.md` that's working well (edit it directly)
- Making one-off CSS tweaks that don't affect the design system
- Working on backend-only features with no UI

## Process

```
CHECK ──→ CHOOSE ──→ INSTALL/CREATE ──→ VERIFY
  │          │            │                │
  ▼          ▼            ▼                ▼
Existing   Pre-built    Generate          Test with
design?    or custom?   ui-design.md      component
```

### Step 1: Check Current State

Check whether a design system already exists:

```
- docs/ui-design.md exists?
- DESIGN.md at project root exists?
- Any other design system documentation?
```

If a design file exists, ask the user whether they want to **replace** or **modify** it. Do not overwrite without confirmation.

### Step 2: Choose a Design Style

Present two options to the user:

**Option A: Adopt a pre-built style**

List available styles:

```bash
npx getdesign@latest list
```

This shows 60+ curated design systems inspired by real products (Linear, Vercel, Stripe, Airbnb, etc.). Each entry shows the brand name and a one-line description of its visual style.

**Option B: Create a custom design system**

Use the template at [references/design-md-template.md](references/design-md-template.md) to create a custom design system from scratch. This is appropriate when:
- The project has its own unique brand identity
- No pre-built style matches the desired look
- The user wants to define every token manually

### Step 3: Install or Create

**For pre-built styles (Option A):**

Install the chosen style:

```bash
npx getdesign@latest add <brand> --out ./docs/ui-design.md
```

Examples:
```bash
npx getdesign@latest add linear.app --out ./docs/ui-design.md
npx getdesign@latest add vercel --out ./docs/ui-design.md
npx getdesign@latest add stripe --out ./docs/ui-design.md
```

After installation, review the file with the user. Customize any tokens that need adjustment for the specific project (e.g., swap the brand accent color while keeping the typography system).

**For custom design (Option B):**

1. Read the template: [references/design-md-template.md](references/design-md-template.md)
2. Interview the user about their design preferences:
   - Light or dark mode first?
   - Primary brand color?
   - Typography preference (sans-serif, serif, monospace)?
   - Density (spacious, balanced, compact)?
   - Visual personality (minimal, bold, playful, professional)?
3. Generate `docs/ui-design.md` filling in all 9 sections based on the user's answers
4. Present the draft for review

### Step 4: Verify

After creating `docs/ui-design.md`:

1. Confirm the file exists at `docs/ui-design.md`
2. Verify all 9 sections are present (for custom) or the file is non-empty (for pre-built)
3. Ask the user to confirm the design direction matches their intent
4. Optionally: generate a sample component (e.g., a button or card) using the design system to validate it works in practice

```
DESIGN SYSTEM READY:
- Style: [brand name or "custom"]
- Location: docs/ui-design.md
- Sections: [count]/9
→ Want me to generate a test component to verify the design?
```

## Relationship to Other Skills

- **hs-spec** defines *what* to build — the product requirements
- **hs-define-ui-spec** defines *how it should look* — the visual design language
- **hs-build** reads `docs/ui-design.md` when implementing UI components
- **hs-design** defines *how to build it technically* — architecture decisions

Recommended sequence for new UI features: `hs-spec` → `hs-define-ui-spec` → `hs-plan` → `hs-build`

## Available Pre-built Styles

Run `npx getdesign@latest list` for the full list. Categories include:

| Category | Examples |
|---|---|
| AI & LLM Platforms | claude, cursor, ollama, mistral.ai |
| Developer Tools | vercel, expo, raycast, warp |
| Backend & DevOps | supabase, mongodb, sentry, posthog |
| Productivity & SaaS | linear.app, notion, cal, resend |
| Design Tools | figma, framer, webflow, miro |
| Fintech | stripe, coinbase, revolut, wise |
| E-commerce | airbnb, shopify, nike |
| Media & Consumer | apple, spotify, spacex, uber |
| Automotive | tesla, bmw, ferrari, lamborghini |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We don't need a design system yet" | Without one, every AI-generated component looks different. The first component sets the precedent — make it intentional. |
| "I'll just describe the style in each prompt" | Repeating "use dark mode with purple accents" in every prompt is error-prone and inconsistent. A DESIGN.md is the single source of truth. |
| "The pre-built styles won't match our brand" | Start with the closest match and customize. It's faster than building from scratch and you get a well-structured foundation. |
| "CSS variables are enough" | CSS variables define values. DESIGN.md defines intent, philosophy, and anti-patterns — the context AI needs to make good decisions. |

## Red Flags

- AI-generated components with inconsistent colors, fonts, or spacing across pages
- No `docs/ui-design.md` in a project with UI
- Design file exists but uses vague descriptions ("dark blue", "large text") instead of exact tokens
- Missing Do's and Don'ts section — agents will make preventable mistakes
- Missing Agent Prompt Guide — agents can't generate components efficiently

## Verification

- [ ] `docs/ui-design.md` exists and is non-empty
- [ ] File follows the 9-section DESIGN.md format (or subset for pre-built)
- [ ] Color values use exact hex/rgba, not descriptive words
- [ ] Typography hierarchy defined with specific sizes, weights, and spacing
- [ ] Do's and Don'ts section included
- [ ] Agent Prompt Guide section included with example prompts
- [ ] User has reviewed and confirmed the design direction
