---
name: define-ui-spec
description: 通过 DESIGN.md 初始化或修改项目的 UI 设计风格。在启动需要 visual design system 的新项目、采用预制设计风格（如 Linear、Vercel、Stripe）、或从零定制 UI design token 时使用。
---

# define-ui-spec：UI Design System

## Overview

通过创建一个 `docs/ui-design.md` 文件来初始化或修改项目的 UI 设计风格。该文件遵循 [DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/overview/)——一种 AI agent 读取后用于生成一致、贴合品牌 UI 的纯文本 design system。用户可以从 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) 采用一套预制风格，也可以基于模板创建自定义 design system。

## When to Use

**适用于**：
- 启动一个需要定义 UI 设计风格的新项目
- 采用某个已知品牌的设计语言（Linear、Vercel、Stripe 等）
- 项目没有 `docs/ui-design.md`，AI 生成的 UI 看起来千篇一律或不一致
- 切换或更新项目的视觉设计方向
- 你希望 AI agent 始终如一地生成贴合品牌的组件

**不适用于**：
- 项目已有一份运转良好的 `docs/ui-design.md`（直接编辑它）
- 做不影响 design system 的一次性 CSS 微调
- 处理没有 UI 的纯后端 feature

## Process

```
CHECK ──→ CHOOSE ──→ INSTALL/CREATE ──→ VERIFY
  │          │            │                │
  ▼          ▼            ▼                ▼
Existing   Pre-built    Generate          Test with
design?    or custom?   ui-design.md      component
```

### Step 1：Check Current State

检查是否已存在 design system：

```
- docs/ui-design.md exists?
- DESIGN.md at project root exists?
- Any other design system documentation?
```

若已有 design 文件，询问用户是想 **替换** 还是 **修改** 它。未经确认不要覆盖。

### Step 2：Choose a Design Style

向用户给出两个选项：

**选项 A：采用预制风格**

列出可用风格：

```bash
npx getdesign@latest list
```

这会列出 60+ 套精选的 design system，灵感来自真实产品（Linear、Vercel、Stripe、Airbnb 等）。每一条显示品牌名及其视觉风格的一行描述。

**选项 B：创建自定义 design system**

使用 [references/design-md-template.md](references/design-md-template.md) 模板从零创建自定义 design system。它适用于：
- 项目有自己独特的品牌识别
- 没有任何预制风格匹配期望的观感
- 用户想手动定义每一个 token

### Step 3：Install or Create

**对预制风格（选项 A）：**

安装选定的风格：

```bash
npx getdesign@latest add <brand> --out ./docs/ui-design.md
```

示例：
```bash
npx getdesign@latest add linear.app --out ./docs/ui-design.md
npx getdesign@latest add vercel --out ./docs/ui-design.md
npx getdesign@latest add stripe --out ./docs/ui-design.md
```

安装后，与用户一起审阅该文件。针对具体项目，定制任何需要调整的 token（例如换掉品牌 accent color，同时保留 typography system）。

**对自定义 design（选项 B）：**

1. 读模板：[references/design-md-template.md](references/design-md-template.md)
2. 就用户的设计偏好做访谈：
   - light mode 还是 dark mode 优先？
   - 主品牌色是什么？
   - typography 偏好（sans-serif、serif、monospace）？
   - 密度（spacious、balanced、compact）？
   - 视觉个性（minimal、bold、playful、professional）？
3. 依据用户的回答生成 `docs/ui-design.md`，填满全部 9 个小节
4. 呈现草稿供评审

### Step 4：Verify

创建 `docs/ui-design.md` 之后：

1. 确认文件存在于 `docs/ui-design.md`
2. 确认全部 9 个小节都在（自定义情形）或文件非空（预制情形）
3. 请用户确认设计方向与其意图相符
4. 可选：用该 design system 生成一个示例组件（如按钮或卡片），验证它在实践中行得通

```
DESIGN SYSTEM READY:
- Style: [brand name or "custom"]
- Location: docs/ui-design.md
- Sections: [count]/9
→ Want me to generate a test component to verify the design?
```

## Relationship to Other Skills

- **harness-stack:define-ui-spec** 定义 *它该长什么样*——视觉设计语言（`docs/ui-design.md`）
- **harness-stack:design** 定义 *技术上如何构建*——需要时的 architecture 决策
- **harness-stack:feature-driven-development** 是主构建流程；其 implementer 在构建 UI 组件时会读 `docs/ui-design.md`

新 UI feature 的推荐顺序：`harness-stack:define-ui-spec`（一次性）→ 每个 feature 用 `harness-stack:feature-driven-development`

## Available Pre-built Styles

运行 `npx getdesign@latest list` 查看完整列表。类别包括：

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

| 借口 | 现实 |
|---|---|
| 「我们还不需要 design system。」 | 没有它，每个 AI 生成的组件都长得不一样。第一个组件就立下了先例——把它做得有意为之。 |
| 「我在每个 prompt 里描述一下风格就好。」 | 在每个 prompt 里重复「用 dark mode 配紫色 accent」既易错又不一致。DESIGN.md 才是唯一事实来源。 |
| 「预制风格不会匹配我们的品牌。」 | 从最接近的那个开始再定制。这比从零造更快，而且你得到一个结构良好的基底。 |
| 「CSS 变量就够了。」 | CSS 变量定义取值。DESIGN.md 定义意图、理念与 anti-pattern——是 AI 做出好决策所需的上下文。 |

## Red Flags

- AI 生成的组件跨页面颜色、字体或 spacing 不一致
- 有 UI 的项目里没有 `docs/ui-design.md`
- design 文件存在，却用模糊描述（「dark blue」「large text」）而非确切 token
- 缺少 Do's and Don'ts 小节——agent 会犯本可避免的错误
- 缺少 Agent Prompt Guide——agent 无法高效生成组件

## Verification

- [ ] `docs/ui-design.md` 存在且非空
- [ ] 文件遵循 9 小节的 DESIGN.md format（预制情形为其子集）
- [ ] 颜色值使用确切的 hex/rgba，而非描述性词语
- [ ] typography 层级已定义，并附具体的 size、weight 与 spacing
- [ ] 含 Do's and Don'ts 小节
- [ ] 含 Agent Prompt Guide 小节，并附示例 prompt
- [ ] 用户已评审并确认设计方向
