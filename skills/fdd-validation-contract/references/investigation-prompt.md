# Investigation Prompt Template

在 Step 3（Investigate）期间把这份 prompt 交给一个全新 subagent，每个 area 一份。填好
`<…>` 占位符。该 subagent 为单个 area 枚举用户交互；它 **不** 写 assertion。它的输出是
作者在 Step 4 里转成 assertion 的原材料。

只读权限即足够——subagent 读 plan 与源码，返回一份清单。每个 area 并行派发一个 subagent。

---

```
Goal: enumerate every user interaction for the "<area name>" area of the
"<plan slug>" plan, so the author can write validation-contract assertions. You
are NOT writing assertions — you return an interaction inventory.

Context to read:
- Plan: .harness-runtime/plans/<slug>/plan.md  (this area covers: <plan requirements>)
- Project test conventions: docs/user-test-patterns.md  (dimensions + personas)
- Relevant source / entry points: <paths, URL routes, API endpoints, CLI cmds>

Task:
1. For the "<area name>" area, list every user-facing interaction. Group them:
   - OBVIOUS — most users will hit this; the primary success flows.
   - SUBTLE — easy to forget; secondary states, optional inputs, ordering,
     reload/back/refresh behaviour, concurrent actions, permission variants.
   - ERROR / EDGE — invalid input, empty/null/boundary/max-size values, network
     failure, unauthorized access, expired state, duplicate submission.
2. For each interaction, write a one-sentence behavioural description from the
   persona's point of view: what they DO, what they SEE, what they EXPECT. Name
   the persona where it matters (use registry IDs).
3. Flag any interaction that pulls in ANOTHER feature — note it as
   "cross-feature: <which feature>" so the author can route it to milestone
   integration verification instead of this document.
4. Consider the mandatory case dimensions from docs/user-test-patterns.md
   (accessibility for UI, security for auth/data) and surface interactions for
   them explicitly.

Rules:
- Observable-only. Describe what a user perceives or an external probe reads.
  Do NOT reference function names, file paths, CSS classes, or internal test ids.
- Do NOT write assertion markdown, VAL- ids, or evidence. Just the
  grouped bullet list.
- Be diligent on SUBTLE and ERROR/EDGE — that is where this pass earns its keep.
  A list that is all OBVIOUS has failed.

Output format:
- Three sections: "Obvious", "Subtle", "Error/Edge".
- One bullet per interaction, each a single behavioural sentence.
- Target 6–15 interactions for a typical area; more is fine.
- A short "Cross-feature notes" section at the end if any surfaced.
```
