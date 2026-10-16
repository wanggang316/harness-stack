# Code Review Brief

对 feature **`{FEATURE_ID}`** 的 diff 做 per-feature 静态评审。评审方法、severity 与 Output Format 全部见 `agents/code-reviewer.md`——本 brief 只提供输入。

## What Was Implemented

{DESCRIPTION}

## Feature / plan.md

{PLAN_PATH}

<!-- .harness-runtime/plans/<slug>/plan.md 的路径，供上下文。feature 的 expected
behavior 与它 fulfills 的 contract 断言是验收线。 -->

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Focus Areas

{FOCUS_AREAS}

## Notes from the Controller

{NOTES}
