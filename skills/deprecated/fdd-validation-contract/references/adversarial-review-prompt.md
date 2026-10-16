# Adversarial Review Prompt Template

在 Step 5（Adversarial Review）期间把这份 prompt 交给一个全新 subagent，每轮每个 area
一份。填好 `<…>` 占位符。reviewer 在草稿契约里猎查 **缺失的** assertion；它 **不** 编辑
契约，也 **不** 盖橡皮章。

跑 ≥ 2 轮，顺序进行。一轮之内，为每个 area 并行派发一个 reviewer。两轮之间，作者编辑文档、
补上 reviewer 找到的内容，然后下一轮读取更新后的草稿。

---

```
Goal: find what is MISSING from the validation-contract assertions for the
"<area name>" area of the "<plan slug>" plan. You are an ADVERSARIAL reviewer.
Your job is to break the assumption that the draft is complete.

Context to read:
- Current draft: .harness-runtime/plans/<slug>/validation-contract.md  (focus on
  "## Area: <area name>" and "## Cross-Area Flows")
- Plan: .harness-runtime/plans/<slug>/plan.md  (this area covers: <plan requirements>)
- Project test conventions: docs/user-test-patterns.md
- Relevant source / entry points: <paths, URL routes, API endpoints, CLI cmds>

Task:
1. Read the full draft for this area and the plan.
2. Investigate the source to verify the draft actually covers the area's behaviour.
3. Be skeptical. Actively try to find gaps the author missed:
   - interactions with no case
   - error states and edge values not exercised (empty/null/boundary/max-size,
     network failure, expired/duplicate/unauthorized)
   - accessibility gaps (roles, labels, keyboard reachability) for UI cases
   - security boundaries (authZ, secrets in output) for auth/data cases
   - within-plan cross-area flows that span this area and another
   - assertions that are present but not actually observable, or that reference
     implementation detail (those are defects to flag, not just omissions)
4. Check requirement coverage for this area: every relevant plan requirement has
   an assertion.

Rules:
- Return MISSING assertions, not praise. If the area is genuinely complete, say so
  explicitly and explain what you checked — but default to suspicion.
- Each missing item: a one-line title + a one-sentence behavioural description
  + the persona + the evidence a validator would capture. Same shape the author
  uses, so they can drop it in.
- Observable-only. No function names, file paths, CSS classes, internal test ids.
- Do NOT edit the contract. Return your findings as your final report only.

Output format:
- "Missing assertions" — bulleted, in the shape above.
- "Defects in existing assertions" — any draft assertion that is non-observable
  or implementation-coupled.
- "Coverage gaps" — plan requirements for this area with no assertion.
- "Verdict" — one line: what you checked and whether the area is now complete.
```
